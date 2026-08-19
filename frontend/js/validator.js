/**
 * ArduBlock — Validador de Workspace
 *
 * Checks semánticos para evitar sketches de Arduino inválidos:
 * - Solo un bloque setup() y un loop()
 * - Serial.begin() solo dentro de setup()
 * - Advertencias sobre bloques huérfanos
 */

import { t } from './i18n.js';
import { getBoardConfig, isValidDigitalPin, isValidAnalogPin } from './board.js';
import { getSetting } from './settings.js';

// ── Estado de validación ────────────────────────

// ── Reglas de validación ────────────────────────

/**
 * Encuentra bloques setup/loop en el nivel raíz del workspace.
 */
function getTopLevelBlocks(workspace, type) {
  return workspace.getTopBlocks(true).filter(b => b.type === type);
}

/**
 * Encuentra recursivamente si un bloque está dentro de un ancestro
 * de tipo `parentType`.
 */
function isInsideBlockType(workspace, block, parentType) {
  let current = block;
  while (current) {
    const parent = current.getParent();
    if (!parent) return false;
    if (parent.type === parentType) return true;
    current = parent;
  }
  return false;
}

/**
 * Encuentra todos los bloques de tipo `type` en todo el workspace (no solo raíz).
 */
function findAllBlocksOfType(workspace, type) {
  return workspace.getAllBlocks(false).filter(b => b.type === type);
}

/**
 * Determina si un bloque está dentro de setup() o loop().
 * Retorna 'setup', 'loop', o null.
 */
function getArduinoContext(workspace, block) {
  if (isInsideBlockType(workspace, block, 'arduino_setup')) return 'setup';
  if (isInsideBlockType(workspace, block, 'arduino_loop')) return 'loop';
  return null;
}

// ── Función principal de validación ─────────────

function validateWorkspace(workspace) {
  const warnings = [];

  // ═══ R1: setup() único ═══════════════════════
  const setupBlocks = getTopLevelBlocks(workspace, 'arduino_setup');
  if (setupBlocks.length === 0) {
    warnings.push({
      type: 'missing_setup',
      severity: 'warning',
      message: t('val_missing_setup'),
      blocks: []
    });
  } else if (setupBlocks.length > 1) {
    warnings.push({
      type: 'duplicate_setup',
      severity: 'error',
      message: t('val_duplicate_setup'),
      blocks: setupBlocks,
      disable: true
    });
  }

  // ═══ R2: loop() único ════════════════════════
  const loopBlocks = getTopLevelBlocks(workspace, 'arduino_loop');
  if (loopBlocks.length === 0) {
    warnings.push({
      type: 'missing_loop',
      severity: 'warning',
      message: t('val_missing_loop'),
      blocks: []
    });
  } else if (loopBlocks.length > 1) {
    warnings.push({
      type: 'duplicate_loop',
      severity: 'error',
      message: t('val_duplicate_loop'),
      blocks: loopBlocks,
      disable: true
    });
  }

  // ═══ R3: Serial.begin() debe estar en setup() ═══
  const serialBeginBlocks = [
    ...findAllBlocksOfType(workspace, 'serial_begin'),
    ...findAllBlocksOfType(workspace, 'serial_begin_advanced')
  ];
  for (const block of serialBeginBlocks) {
    const context = getArduinoContext(workspace, block);
    if (context !== 'setup') {
      const where = context === 'loop' ? t('val_where_loop') : t('val_where_outside');
      warnings.push({
        type: 'serial_begin_position',
        severity: 'warning',
        message: t('val_serial_begin_position', { where }),
        blocks: [block]
      });
    }
  }

  // ═══ R3b: bloques WiFi/servidor deben ir en setup() ═══
  const wifiSetupBlocks = [
    ...findAllBlocksOfType(workspace, 'wifi_connect'),
    ...findAllBlocksOfType(workspace, 'wifi_access_point'),
    ...findAllBlocksOfType(workspace, 'webserver_begin')
  ];
  for (const block of wifiSetupBlocks) {
    const context = getArduinoContext(workspace, block);
    if (context !== 'setup') {
      const where = context === 'loop' ? t('val_where_loop') : t('val_where_outside');
      warnings.push({
        type: 'wifi_setup_position',
        severity: 'warning',
        message: t('val_wifi_setup_position', { label: getBlockLabel(block), where }),
        blocks: [block]
      });
    }
  }

  // ═══ R4: Bloques huérfanos (no están dentro de setup ni loop) ═══
  const topBlocks = workspace.getTopBlocks(true);
  for (const block of topBlocks) {
    if (block.type === 'arduino_setup' || block.type === 'arduino_loop') continue;
    if (block.type === 'include_header') continue;
    if (block.type === 'library_include') continue;
    if (block.type === 'variable_global') continue; // va suelto, los recolecta el generador
    const statementTypes = [
      'delay_ms', 'serial_print', 'serial_println', 'serial_write',
      'tone_output', 'tone_duration', 'no_tone_output',
      'tone_duration_basic', 'attach_interrupt_basic',
      'servo_write', 'servo_write_us', 'attach_interrupt',
      'lcd_print', 'lcd_set_cursor', 'lcd_clear',
      'stepper_speed', 'stepper_step',
      'text_print',
      'webserver_serve',
      'webserver_serve_file'
    ];
    if (statementTypes.includes(block.type)) {
      warnings.push({
        type: 'orphan_statement',
        severity: 'info',
        message: t('val_orphan', { label: getBlockLabel(block) }),
        blocks: [block]
      });
    }
  }

  // ═══ R5: Advertir sobre variables (info) ═════
  const varSetBlocks = findAllBlocksOfType(workspace, 'variables_set');
  for (const block of varSetBlocks) {
    const context = getArduinoContext(workspace, block);
    if (context === 'loop') {
      const varName = block.getField('VAR')?.getText() || '';
      const alreadyWarned = warnings.some(w =>
        w.type === 'var_in_loop' && w.variable === varName);
      if (!alreadyWarned) {
        warnings.push({
          type: 'var_in_loop',
          severity: 'info',
          message: t('val_var_in_loop', { name: varName }),
          blocks: [block],
          variable: varName
        });
      }
    }
  }

  // ═══ R6: Servo no declarado + attach fuera de setup ═══
  const servoNames = new Set();
  const servoCreateBlocks = [
    ...findAllBlocksOfType(workspace, 'servo_create'),
    ...findAllBlocksOfType(workspace, 'servo_create_advanced')
  ];
  for (const block of servoCreateBlocks) {
    const name = block.getFieldValue('NAME');
    if (name) servoNames.add(name.trim());

    // R6b: servo_create debe ir dentro de setup()
    if (!isInsideBlockType(workspace, block, 'arduino_setup')) {
      const context = getArduinoContext(workspace, block);
      const where = context === 'loop' ? t('val_where_loop') : t('val_where_outside');
      warnings.push({
        type: 'servo_attach_position',
        severity: 'error',
        disable: false,
        message: t('val_servo_attach_position', { name: name || '?', where }),
        blocks: [block]
      });
    }
  }

  const servoUsageBlocks = [
    ...findAllBlocksOfType(workspace, 'servo_write'),
    ...findAllBlocksOfType(workspace, 'servo_write_us')
  ];
  for (const block of servoUsageBlocks) {
    const name = (block.getFieldValue('NAME') || '').trim();
    if (name && !servoNames.has(name)) {
      warnings.push({
        type: 'servo_not_declared',
        severity: 'error',
        message: t('val_servo_undeclared_prefix') + ` "${name}". ` + t('val_servo_undeclared_suffix'),
        blocks: [block]
      });
    }
  }

  // ═══ R6c: Librerías create deben ir en setup ═══
  const inSetupTypes = [
    { type: 'lcd_create', field: 'NAME', labelKey: 'lbl_lcd' },
    { type: 'lcd_create_advanced', field: 'NAME', labelKey: 'lbl_lcd' },
    { type: 'lcd_i2c_create', field: 'NAME', labelKey: 'lbl_lcd_i2c' },
    { type: 'lcd_i2c_create_advanced', field: 'NAME', labelKey: 'lbl_lcd_i2c' },
    { type: 'dht_create', field: 'NAME', labelKey: 'lbl_dht' },
    { type: 'dht_create_advanced', field: 'NAME', labelKey: 'lbl_dht' },
    { type: 'ultrasonic_create', field: 'NAME', labelKey: 'lbl_ultrasonic' },
    { type: 'ultrasonic_create_advanced', field: 'NAME', labelKey: 'lbl_ultrasonic' },
    { type: 'stepper_create', field: 'NAME', labelKey: 'lbl_stepper' },
    { type: 'stepper_create_advanced', field: 'NAME', labelKey: 'lbl_stepper' },
    { type: 'afmotor_dc_create', field: 'NAME', labelKey: 'lbl_motor_dc' },
    { type: 'afmotor_stepper_create', field: 'NAME', labelKey: 'lbl_stepper_afmotor' }
  ];

  for (const cfg of inSetupTypes) {
    const blocks = findAllBlocksOfType(workspace, cfg.type);
    for (const block of blocks) {
      if (!isInsideBlockType(workspace, block, 'arduino_setup')) {
        const name = block.getFieldValue(cfg.field) || '?';
        const context = getArduinoContext(workspace, block);
        const where = context === 'loop' ? t('val_where_loop') : t('val_where_outside');
        warnings.push({
          type: 'lib_not_in_setup',
          severity: 'error',
          message: t('val_create_in_setup', { label: t(cfg.labelKey), name, where }),
          blocks: [block]
        });
      }
    }
  }

  // ═══ R6d: pinMode() y attachInterrupt() deben ir en setup ═══
  const setupStatements = [
    { types: ['pin_mode_basic', 'pin_mode_advanced'], msgKey: 'val_pinmode_position', type: 'pin_mode_position' },
    { types: ['attach_interrupt', 'attach_interrupt_basic', 'attach_interrupt_advanced'], msgKey: 'val_interrupt_position', type: 'interrupt_position' }
  ];
  for (const cfg of setupStatements) {
    const blocks = [];
    for (const t of cfg.types) blocks.push(...findAllBlocksOfType(workspace, t));
    for (const block of blocks) {
      if (isInsideBlockType(workspace, block, 'arduino_setup')) continue;
      const context = getArduinoContext(workspace, block);
      const where = context === 'loop' ? t('val_where_loop') : t('val_where_outside');
      warnings.push({
        type: cfg.type,
        severity: 'warning',
        message: t(cfg.msgKey, { where }),
        blocks: [block]
      });
    }
  }

  // ═══ R6e: bloques de uso de motor deben referenciar uno creado ═══
  const motorUsage = [
    {
      createTypes: ['stepper_create', 'stepper_create_advanced'],
      useTypes: ['stepper_speed', 'stepper_speed_advanced', 'stepper_step', 'stepper_step_advanced'],
      labelKey: 'lbl_stepper'
    },
    {
      createTypes: ['afmotor_dc_create'],
      useTypes: ['afmotor_dc_speed', 'afmotor_dc_run'],
      labelKey: 'lbl_motor_dc'
    },
    {
      createTypes: ['afmotor_stepper_create'],
      useTypes: ['afmotor_stepper_speed', 'afmotor_stepper_step'],
      labelKey: 'lbl_stepper_afmotor'
    }
  ];
  for (const cfg of motorUsage) {
    const names = new Set();
    for (const ct of cfg.createTypes) {
      for (const block of findAllBlocksOfType(workspace, ct)) {
        const n = (block.getFieldValue('NAME') || '').trim();
        if (n) names.add(n);
      }
    }
    const useBlocks = [];
    for (const ut of cfg.useTypes) useBlocks.push(...findAllBlocksOfType(workspace, ut));
    for (const block of useBlocks) {
      const name = (block.getFieldValue('NAME') || '').trim();
      if (name && !names.has(name)) {
        warnings.push({
          type: 'motor_not_declared',
          severity: 'error',
          message: t('val_motor_not_declared', { label: t(cfg.labelKey), name }),
          blocks: [block]
        });
      }
    }
  }

  // ═══ R7: Validación de pines ═══════════════════
  const pinModes = {};
  const pinModeBlocks = findAllBlocksOfType(workspace, 'pin_mode_basic');
  for (const block of pinModeBlocks) {
    if (isInsideBlockType(workspace, block, 'arduino_setup')) {
      const pin  = parseInt(block.getFieldValue('PIN'), 10);
      const mode = block.getFieldValue('MODE');
      if (!isNaN(pin)) pinModes[pin] = { mode, block };
    }
  }

  const pinConsumers = {
    'digital_write_basic': { pinField: 'PIN', mode: 'OUTPUT', label: 'digitalWrite' },
    'digital_write_advanced': { pinField: 'PIN', mode: 'OUTPUT', label: 'digitalWrite' },
    'tone_duration_basic': { pinField: 'PIN', mode: 'OUTPUT', label: 'tone' },
    'analog_read_basic': { pinField: 'PIN', mode: 'INPUT', label: 'analogRead', optional: true },
    'analog_read_advanced': { pinField: 'PIN', mode: 'INPUT', label: 'analogRead', optional: true },
    'attach_interrupt_basic': { pinField: 'PIN', mode: 'INPUT', label: 'attachInterrupt' }
  };

  const compatibleModes = {
    'OUTPUT': ['OUTPUT'],
    'INPUT':  ['INPUT', 'INPUT_PULLUP']
  };

  for (const [type, cfg] of Object.entries(pinConsumers)) {
    const blocks = findAllBlocksOfType(workspace, type);
    for (const block of blocks) {
      const pin = parseInt(block.getFieldValue(cfg.pinField), 10);
      if (isNaN(pin)) continue;

      const declared = pinModes[pin];

      if (!declared) {
        const sev = cfg.optional ? 'info' : 'warning';
        const dir = cfg.mode === 'OUTPUT' ? t('val_pin_dir_out') : t('val_pin_dir_in');
        warnings.push({
          type: 'pin_not_configured',
          severity: sev,
          message: t('val_pin_not_configured', { pin, fn: cfg.label, dir }) + (cfg.optional ? ' ' + t('val_pin_optional') : ''),
          blocks: [block]
        });
      } else if (!compatibleModes[cfg.mode].includes(declared.mode)) {
        const modeLabelKeys = { 'OUTPUT': 'val_mode_output', 'INPUT': 'val_mode_input', 'INPUT_PULLUP': 'val_mode_input_pullup' };
        const expectedKey = cfg.mode === 'OUTPUT' ? 'val_mode_output' : 'val_mode_input';
        warnings.push({
          type: 'pin_mode_mismatch',
          severity: 'warning',
          message: t('val_pin_mode_mismatch', {
            pin,
            fn: cfg.label,
            mode: t(modeLabelKeys[declared.mode] || declared.mode),
            expected: t(expectedKey)
          }),
          blocks: [block]
        });
      }
    }
  }

  // ═══ R8: Pines fuera del rango de la placa ══════
  const fqbn = getSetting('board');
  const board = getBoardConfig(fqbn);

  const pinBlocks = [
    { type: 'analog_read_basic', field: 'PIN', label: 'analogRead', kind: 'analog' },
    { type: 'analog_read_advanced', field: 'PIN', label: 'analogRead', kind: 'analog' },
    { type: 'tone_duration_basic', field: 'PIN', label: 'tone', kind: 'digital' },
    // Bloques de librerías con pines
    { type: 'servo_create', field: 'PIN', label: 'servo.attach', kind: 'digital' },
    { type: 'lcd_create', multiField: ['RS', 'EN', 'D4', 'D5', 'D6', 'D7'], label: 'LCD', kind: 'digital' },
    { type: 'dht_create', field: 'PIN', label: 'sensor DHT', kind: 'digital' },
    { type: 'ultrasonic_create', multiField: ['TRIG', 'ECHO'], label: 'ultrasónico', kind: 'digital' },
    { type: 'stepper_create', multiField: ['P1', 'P2', 'P3', 'P4'], label: 'motor paso a paso', kind: 'digital' },
    { type: 'attach_interrupt_basic', field: 'PIN', label: 'attachInterrupt', kind: 'digital' }
  ];

  for (const cfg of pinBlocks) {
    const blocks = findAllBlocksOfType(workspace, cfg.type);
    for (const block of blocks) {
      // Soporta multiField (array de campos) o field único
      const fields = cfg.multiField || [cfg.field];
      for (const fieldName of fields) {
        const pin = parseInt(block.getFieldValue(fieldName), 10);
        if (isNaN(pin)) continue;

        let invalid = false;
        let maxPin = 0;

        if (cfg.kind === 'digital' || cfg.kind === 'pwm') {
          if (!isValidDigitalPin(fqbn, pin)) {
            invalid = true;
            maxPin = board.maxDigital;
          }
        } else if (cfg.kind === 'analog') {
          if (!isValidAnalogPin(fqbn, pin)) {
            invalid = true;
            maxPin = board.maxAnalog;
          }
        }

        if (invalid) {
          warnings.push({
            type: 'pin_out_of_range',
            severity: 'error',
            message: cfg.kind === 'analog'
              ? t('val_pin_out_of_range_analog', { pin, board: board.name, max: maxPin })
              : t('val_pin_out_of_range_digital', { pin, board: board.name, max: maxPin }),
            blocks: [block]
          });
        }
      }
    }
  }

  // ═══ R9: Serial.print sin Serial.begin() ═══════
  const serialBeginCount = findAllBlocksOfType(workspace, 'serial_begin').length;
  if (serialBeginCount === 0) {
    const serialOutputTypes = [
      'serial_print', 'serial_println', 'serial_write',
      'serial_read', 'serial_available',
      'serial_parseInt', 'serial_parseFloat', 'serial_readString'
    ];
    const serialOutputBlocks = [];
    for (const type of serialOutputTypes) {
      serialOutputBlocks.push(...findAllBlocksOfType(workspace, type));
    }
    if (serialOutputBlocks.length > 0) {
      const labels = [...new Set(serialOutputBlocks.map(b => getBlockLabel(b)))].join(', ');
      warnings.push({
        type: 'serial_without_begin',
        severity: 'warning',
        message: t('val_serial_without_begin', { labels }),
        blocks: serialOutputBlocks
      });
    }
  }

  // ═══ R9b: servir página web sin iniciar servidor web ═══
  const webserverBeginCount = findAllBlocksOfType(workspace, 'webserver_begin').length;
  if (webserverBeginCount === 0) {
    const serveBlocks = [
      ...findAllBlocksOfType(workspace, 'webserver_serve'),
      ...findAllBlocksOfType(workspace, 'webserver_serve_file'),
    ];
    if (serveBlocks.length > 0) {
      warnings.push({
        type: 'webserver_without_begin',
        severity: 'warning',
        message: t('val_webserver_without_begin'),
        blocks: serveBlocks,
      });
    }
  }

  // ═══ R10: text_join excesivo → fragmentación heap en AVR ═══
  const textJoinBlocks = findAllBlocksOfType(workspace, 'text_join');
  if (textJoinBlocks.length >= 3) {
    warnings.push({
      type: 'text_join_heap',
      severity: 'warning',
      message: t('val_text_join_heap', { n: textJoinBlocks.length }),
      blocks: textJoinBlocks
    });
  }

  // ═══ R11: Conflicto Serial → pines 0/1 ════════
  const hasSerialActive = workspace.getAllBlocks(false).some(
    b => b.type === 'serial_begin' || b.type === 'serial_begin_advanced'
  );
  if (hasSerialActive) {
    const serialPinBlocks = [
      'pin_mode_basic', 'pin_mode_advanced',
      'digital_write_basic', 'digital_write_advanced',
      'digital_read_basic', 'digital_read_advanced',
      'tone_output_basic', 'tone_output_advanced',
      'tone_duration_basic', 'tone_duration_advanced',
      'pulse_in_basic', 'pulse_in_advanced'
    ];
    for (const bt of serialPinBlocks) {
      for (const block of findAllBlocksOfType(workspace, bt)) {
        const pinField = block.getField('PIN');
        if (!pinField) continue;
        const pin = parseInt(pinField.getValue(), 10);
        if (pin === 0 || pin === 1) {
          warnings.push({
            type: 'serial_pin_conflict',
            severity: 'warning',
            message: t('val_serial_pin_conflict', { pin }),
            blocks: [block]
          });
        }
      }
    }
  }

  // ═══ R12: Conflicto LCD I2C → pines A4/A5 ═════
  const hasLcdI2c = workspace.getAllBlocks(false).some(
    b => b.type === 'lcd_i2c_create' || b.type === 'lcd_i2c_create_advanced'
  );
  if (hasLcdI2c) {
    const i2cPinBlocks = [
      'pin_mode_basic', 'pin_mode_advanced',
      'digital_write_basic', 'digital_write_advanced',
      'digital_read_basic', 'digital_read_advanced',
      'analog_read_basic', 'analog_read_advanced',
      'tone_output_basic', 'tone_output_advanced',
      'tone_duration_basic', 'tone_duration_advanced',
      'pulse_in_basic', 'pulse_in_advanced'
    ];
    for (const bt of i2cPinBlocks) {
      for (const block of findAllBlocksOfType(workspace, bt)) {
        const pinField = block.getField('PIN');
        if (!pinField) continue;
        const pinStr = String(pinField.getValue());
        // Check for A4/A5 (analog or digital pin 4/5 when used as digital)
        if (pinStr === 'A4' || pinStr === 'A5' || pinStr === '4' || pinStr === '5') {
          warnings.push({
            type: 'i2c_pin_conflict',
            severity: 'warning',
            message: t('val_i2c_pin_conflict', { pin: pinStr }),
            blocks: [block]
          });
        }
      }
    }
  }


  // ═══ Deduplicar warnings idénticos (mismo type + mensaje) ═══
  // N bloques con el mismo problema se fusionan en una sola entrada
  // (evita llenar la lista con copias, p. ej. 2× digitalWrite en el mismo pin).
  const deduped = [];
  const seen = new Map();
  for (const w of warnings) {
    const key = w.type + '|' + w.message;
    const existing = seen.get(key);
    if (existing) {
      existing.blocks.push(...w.blocks);
    } else {
      seen.set(key, w);
      deduped.push(w);
    }
  }

  return deduped;
}

// ── Función helper: nombre legible del bloque ───

const BLOCK_LABEL_KEYS = {
  'arduino_setup': 'blk_arduino_setup',
  'arduino_loop': 'blk_arduino_loop',
  'digital_write': 'blk_digital_write',
  'analog_write': 'blk_analog_write',
  'delay_ms': 'blk_delay_ms',
  'serial_begin': 'blk_serial_begin',
  'serial_print': 'blk_serial_print',
  'serial_println': 'blk_serial_println',
  'serial_write': 'blk_serial_write',
  'serial_read': 'blk_serial_read',
  'serial_available': 'blk_serial_available',
  'serial_parseInt': 'blk_serial_parseInt',
  'serial_parseFloat': 'blk_serial_parseFloat',
  'serial_readString': 'blk_serial_readString',
  'servo_create': 'blk_servo_create',
  'servo_write': 'blk_servo_write',
  'servo_write_us': 'blk_servo_write_us',
  'tone_output': 'blk_tone_output',
  'tone_duration': 'blk_tone_duration',
  'no_tone_output': 'blk_no_tone_output',
  'map_value': 'blk_map_value',
  'pulse_in': 'blk_pulse_in',
  'attach_interrupt': 'blk_attach_interrupt',
  'lcd_create': 'blk_lcd_create',
  'lcd_i2c_create': 'blk_lcd_i2c_create',
  'lcd_print': 'blk_lcd_print',
  'lcd_set_cursor': 'blk_lcd_set_cursor',
  'lcd_clear': 'blk_lcd_clear',
  'dht_create': 'blk_dht_create',
  'dht_temp': 'blk_dht_temp',
  'dht_humidity': 'blk_dht_humidity',
  'ultrasonic_create': 'blk_ultrasonic_create',
  'ultrasonic_read': 'blk_ultrasonic_read',
  'stepper_create': 'blk_stepper_create',
  'stepper_speed': 'blk_stepper_speed',
  'stepper_step': 'blk_stepper_step',
  'text_print': 'blk_text_print',
  'wifi_connect': 'blk_wifi_connect',
  'wifi_access_point': 'blk_wifi_access_point',
  'webserver_begin': 'blk_webserver_begin',
  'webserver_serve': 'blk_webserver_serve',
  'webserver_serve_file': 'blk_webserver_serve_file',
  'wifi_ip': 'blk_wifi_ip',
  'variable_global': 'blk_variable_global',
  'variable_declare': 'blk_variable_declare',
  'variable_set': 'blk_variable_set',
  'variable_get': 'blk_variable_get',
  'afmotor_dc_create': 'blk_afmotor_dc_create',
  'afmotor_dc_speed': 'blk_afmotor_dc_speed',
  'afmotor_dc_run': 'blk_afmotor_dc_run',
  'afmotor_stepper_create': 'blk_afmotor_stepper_create',
  'afmotor_stepper_speed': 'blk_afmotor_stepper_speed',
  'afmotor_stepper_step': 'blk_afmotor_stepper_step'
};

function getBlockLabel(block) {
  const base = String(block.type).replace(/_(advanced|basic)$/, '');
  const key = BLOCK_LABEL_KEYS[base];
  return key ? t(key) : block.type;
}

// ── Aplicar warnings al workspace (UI) ──────────

const DISABLE_REASON = 'ardublock_duplicate';

function applyWarnings(workspace, warnings) {
  const allBlocks = workspace.getAllBlocks(false);
  for (const block of allBlocks) {
    block.setWarningText(null);
    try { block.setDisabledReason(false, DISABLE_REASON); } catch(e) { console.warn('[Validator] setDisabledReason(false) failed:', e); }
  }

  const errors = warnings.filter(w => w.severity === 'error');
  const warns = warnings.filter(w => w.severity === 'warning');

  for (const w of errors) {
    for (const block of w.blocks) {
      if (w.disable) {
        try { block.setDisabledReason(true, DISABLE_REASON); } catch(e) { console.warn('[Validator] setDisabledReason(true) failed:', e); }
      }
      block.setWarningText(w.message);
    }
  }

  for (const w of warns) {
    for (const block of w.blocks) {
      block.setWarningText(w.message);
    }
  }

  updateStatusPanel(warnings, workspace);
}

// ── Panel de estado (barra inferior compacta, estilo IDE) ────────────────

function updateStatusPanel(warnings, workspace) {
  let statusEl = document.getElementById('status-panel');
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = 'status-panel';
    statusEl.innerHTML =
      '<span id="status-dot" class="status-dot" aria-hidden="true"></span>' +
      '<button id="status-summary" class="status-summary" type="button"></button>' +
      '<div id="status-problems" class="status-problems hidden"></div>';
    document.body.appendChild(statusEl);

    const summaryBtn = statusEl.querySelector('#status-summary');
    summaryBtn.addEventListener('click', () => {
      statusEl.querySelector('#status-problems').classList.toggle('hidden');
      renderStatusSummary(statusEl);
    });

    // Cerrar la lista al clickear fuera o con Escape
    document.addEventListener('click', (e) => {
      if (!statusEl.contains(e.target)) closeStatusProblems(statusEl);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeStatusProblems(statusEl);
    });
  }

  const errors = warnings.filter(w => w.severity === 'error');
  const warns = warnings.filter(w => w.severity === 'warning');
  statusEl._counts = { errors: errors.length, warns: warns.length };

  const dotEl = statusEl.querySelector('#status-dot');
  dotEl.style.background = errors.length ? 'var(--status-error)'
    : (warns.length ? 'var(--status-warn)' : 'var(--status-ok)');

  const problemsEl = statusEl.querySelector('#status-problems');
  if (warnings.length > 0) {
    renderStatusProblems(problemsEl, warnings, workspace);
  } else {
    problemsEl.textContent = '';
    closeStatusProblems(statusEl);
  }

  renderStatusSummary(statusEl);

  // Hook: re-aplicar protección de nivel después de cada validación,
  // ya que applyWarnings hace setWarningText(null) global.
  if (typeof window._applyLevelProtection === 'function') {
    window._applyLevelProtection();
  }
}

function renderStatusSummary(statusEl) {
  const c = statusEl._counts || { errors: 0, warns: 0 };
  const summaryBtn = statusEl.querySelector('#status-summary');
  const problemsEl = statusEl.querySelector('#status-problems');
  const open = !problemsEl.classList.contains('hidden');
  const n = c.errors + c.warns;

  let text;
  if (n === 0) {
    text = t('status_valid');
  } else {
    const parts = [];
    if (c.errors) parts.push(`✕ ${c.errors} ${t('status_errors')}`);
    if (c.warns) parts.push(`⚠ ${c.warns} ${t('status_warnings')}`);
    text = parts.join(' · ') + (open ? ' ▾' : ' ▴');
  }
  summaryBtn.textContent = text;
  summaryBtn.style.color = c.errors ? 'var(--status-error)'
    : (c.warns ? 'var(--status-warn)' : 'var(--status-ok)');
  summaryBtn.classList.toggle('has-problems', n > 0);
}

function closeStatusProblems(statusEl) {
  const problemsEl = statusEl.querySelector('#status-problems');
  if (!problemsEl.classList.contains('hidden')) {
    problemsEl.classList.add('hidden');
    renderStatusSummary(statusEl);
  }
}

function renderStatusProblems(problemsEl, warnings, workspace) {
  problemsEl.textContent = '';
  for (const w of warnings) {
    const isError = w.severity === 'error';
    const block = w.blocks && w.blocks[0];
    const blockId = block ? block.id : null;

    const row = document.createElement('div');
    row.className = 'problem-row ' + (isError ? 'problem-error' : 'problem-warn');
    if (blockId) row.dataset.blockId = blockId;

    const sev = document.createElement('span');
    sev.className = 'problem-sev';
    sev.textContent = isError ? '✕' : '⚠';
    row.appendChild(sev);

    if (block) {
      const loc = document.createElement('span');
      loc.className = 'problem-loc';
      loc.textContent = getBlockLabel(block);
      row.appendChild(loc);
    }

    const msg = document.createElement('span');
    msg.className = 'problem-msg';
    msg.textContent = w.message;
    row.appendChild(msg);

    row.addEventListener('click', () => {
      if (blockId && workspace && typeof workspace.getBlockById === 'function') {
        const b = workspace.getBlockById(blockId);
        if (b) {
          b.select();
          try { workspace.centerOnBlock(blockId); } catch (e) {}
        }
      }
    });

    problemsEl.appendChild(row);
  }
}

// ═══════════════════════════════════════════════
//  INTEGRACIÓN CON EL WORKSPACE
// ═══════════════════════════════════════════════

export function initValidator(workspace) {
  let timeout = null;

  workspace.addChangeListener(() => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      const warnings = validateWorkspace(workspace);
      applyWarnings(workspace, warnings);
    }, 300);
  });

  setTimeout(() => {
    const warnings = validateWorkspace(workspace);
    applyWarnings(workspace, warnings);
  }, 500);
}

// ── Funciones exportadas para testing ───────────
export { validateWorkspace, getTopLevelBlocks, findAllBlocksOfType, isInsideBlockType, getArduinoContext, getBlockLabel, applyWarnings };
