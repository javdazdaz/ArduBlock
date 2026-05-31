/**
 * ArduBlock — Validador de Workspace
 *
 * Checks semánticos para evitar sketches de Arduino inválidos:
 * - Solo un bloque setup() y un loop()
 * - Serial.begin() solo dentro de setup()
 * - Advertencias sobre bloques huérfanos
 */

import * as Blockly from 'blockly';
import { t } from './i18n.js';

// ── Estado de validación ────────────────────────
let lastWarnings = [];

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
  const serialBeginBlocks = findAllBlocksOfType(workspace, 'serial_begin');
  for (const block of serialBeginBlocks) {
    const context = getArduinoContext(workspace, block);
    if (context !== 'setup') {
      const where = context === 'loop'
        ? 'dentro de loop()'
        : 'fuera de setup() y loop()';
      warnings.push({
        type: 'serial_begin_position',
        severity: 'warning',
        message: `Serial.begin() está ${where}. Debería ir dentro de setup().`,
        blocks: [block]
      });
    }
  }

  // ═══ R4: Bloques huérfanos (no están dentro de setup ni loop) ═══
  const topBlocks = workspace.getTopBlocks(true);
  for (const block of topBlocks) {
    if (block.type === 'arduino_setup' || block.type === 'arduino_loop') continue;
    const statementTypes = [
      'pin_mode', 'digital_write', 'analog_write',
      'delay_ms', 'serial_print', 'serial_println',
      'tone_output', 'tone_duration', 'no_tone_output',
      'servo_write', 'servo_write_us', 'attach_interrupt',
      'lcd_print', 'lcd_set_cursor', 'lcd_clear',
      'stepper_speed', 'stepper_step',
      'text_print'
    ];
    if (statementTypes.includes(block.type)) {
      warnings.push({
        type: 'orphan_statement',
        severity: 'info',
        message: `Bloque "${getBlockLabel(block)}" ` + t('val_orphan_suffix'),
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
          message: `Variable "${varName}" asignada en loop(). Asegúrate de declararla fuera de setup/loop.`,
          blocks: [block],
          variable: varName
        });
      }
    }
  }

  // ═══ R6: Servo no declarado + attach fuera de setup ═══
  const servoNames = new Set();
  const servoCreateBlocks = findAllBlocksOfType(workspace, 'servo_create');
  for (const block of servoCreateBlocks) {
    const name = block.getFieldValue('NAME');
    if (name) servoNames.add(name.trim());

    // R6b: servo_create debe ir dentro de setup()
    if (!isInsideBlockType(workspace, block, 'arduino_setup')) {
      const context = getArduinoContext(workspace, block);
      const where = context === 'loop' ? 'de loop()' : 'fuera de setup() y loop()';
      warnings.push({
        type: 'servo_attach_position',
        severity: 'error',
        disable: false,
        message: `Servo "${name || '?'}" está ${where}. ` + t('val_servo_attach_suffix'),
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
    { type: 'lcd_create', field: 'NAME', label: 'LCD' },
    { type: 'lcd_i2c_create', field: 'NAME', label: 'LCD I2C' },
    { type: 'dht_create', field: 'NAME', label: 'sensor DHT' },
    { type: 'ultrasonic_create', field: 'NAME', label: 'ultrasónico' },
    { type: 'stepper_speed', field: 'NAME', label: 'velocidad motor' }
  ];

  for (const cfg of inSetupTypes) {
    const blocks = findAllBlocksOfType(workspace, cfg.type);
    for (const block of blocks) {
      if (!isInsideBlockType(workspace, block, 'arduino_setup')) {
        const name = block.getFieldValue(cfg.field) || '?';
        const context = getArduinoContext(workspace, block);
        const where = context === 'loop' ? 'de loop()' : 'fuera de setup() y loop()';
        warnings.push({
          type: 'lib_not_in_setup',
          severity: 'error',
          message: `${cfg.label} "${name}" está ${where}. ` + t('val_create_in_setup'),
          blocks: [block]
        });
      }
    }
  }

  // ═══ R7: Validación de pines ═══════════════════
  const pinModes = {};
  const pinModeBlocks = findAllBlocksOfType(workspace, 'pin_mode');
  for (const block of pinModeBlocks) {
    if (isInsideBlockType(workspace, block, 'arduino_setup')) {
      const pin  = parseInt(block.getFieldValue('PIN'), 10);
      const mode = block.getFieldValue('MODE');
      if (!isNaN(pin)) pinModes[pin] = { mode, block };
    }
  }

  const pinConsumers = {
    'digital_write':  { pinField: 'PIN', mode: 'OUTPUT', label: 'digitalWrite' },
    'analog_write':   { pinField: 'PIN', mode: 'OUTPUT', label: 'analogWrite' },
    'tone_output':    { pinField: 'PIN', mode: 'OUTPUT', label: 'tone' },
    'tone_duration':  { pinField: 'PIN', mode: 'OUTPUT', label: 'tone' },
    'no_tone_output': { pinField: 'PIN', mode: 'OUTPUT', label: 'noTone' },
    'digital_read':   { pinField: 'PIN', mode: 'INPUT',  label: 'digitalRead' },
    'analog_read':    { pinField: 'PIN', mode: 'INPUT',  label: 'analogRead' },
    'pulse_in':       { pinField: 'PIN', mode: 'INPUT',  label: 'pulseIn' },
    'attach_interrupt': { pinField: 'PIN', mode: 'INPUT', label: 'attachInterrupt' }
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
        const dir = cfg.mode === 'OUTPUT' ? t('val_pin_dir_out') : t('val_pin_dir_in');
        warnings.push({
          type: 'pin_not_configured',
          severity: 'warning',
          message: `Pin ${pin}: ${cfg.label}() ` + t('val_pin_not_conf_suffix') + ` ${dir}.`,
          blocks: [block]
        });
      } else if (!compatibleModes[cfg.mode].includes(declared.mode)) {
        const modeLabels = { 'OUTPUT': 'SALIDA', 'INPUT': 'ENTRADA', 'INPUT_PULLUP': 'ENTRADA_PULLUP' };
        const expected = cfg.mode === 'OUTPUT' ? 'SALIDA' : 'ENTRADA';
        warnings.push({
          type: 'pin_mode_mismatch',
          severity: 'warning',
          message: `Pin ${pin}: configurado como ${modeLabels[declared.mode] || declared.mode} en setup(), pero ${cfg.label}() espera ${expected}.`,
          blocks: [block]
        });
      }
    }
  }

  return warnings;
}

// ── Función helper: nombre legible del bloque ───

function getBlockLabel(block) {
  const labels = {
    'arduino_setup': 'al iniciar (setup)',
    'arduino_loop': 'repetir siempre (loop)',
    'pin_mode': 'configurar pin',
    'digital_write': 'escribir digital',
    'digital_read': 'leer pin digital',
    'analog_write': 'escribir analógico',
    'analog_read': 'leer pin analógico',
    'delay_ms': 'esperar',
    'serial_begin': 'iniciar Serial',
    'serial_print': 'enviar por Serial',
    'serial_println': 'enviar por Serial (salto)',
    'servo_create': 'crear servo',
    'servo_write': 'mover servo',
    'servo_write_us': 'mover servo (μs)',
    'tone_output': 'generar tono',
    'tone_duration': 'generar tono (con duración)',
    'no_tone_output': 'detener tono',
    'map_value': 'mapear valor',
    'pulse_in': 'medir pulso',
    'attach_interrupt': 'configurar interrupción',
    'lcd_create': 'crear LCD',
    'lcd_i2c_create': 'crear LCD I2C',
    'lcd_print': 'imprimir en LCD',
    'lcd_set_cursor': 'cursor LCD',
    'lcd_clear': 'limpiar LCD',
    'dht_create': 'crear sensor DHT',
    'dht_temp': 'temperatura DHT',
    'dht_humidity': 'humedad DHT',
    'ultrasonic_create': 'crear ultrasónico',
    'ultrasonic_read': 'distancia ultrasónico',
    'stepper_create': 'crear motor paso a paso',
    'stepper_speed': 'velocidad motor',
    'stepper_step': 'girar motor',
    'text_print': 'imprimir texto',
    'variable_declare': 'iniciar variable',
    'variable_set': 'asignar variable',
    'variable_get': 'leer variable'
  };
  return labels[block.type] || block.type;
}

// ── Aplicar warnings al workspace (UI) ──────────

const DISABLE_REASON = 'ardublock_duplicate';

function applyWarnings(workspace, warnings) {
  const allBlocks = workspace.getAllBlocks(false);
  for (const block of allBlocks) {
    block.setWarningText(null);
    try { block.setDisabledReason(false, DISABLE_REASON); } catch(e) {}
  }

  const errors = warnings.filter(w => w.severity === 'error');
  const warns = warnings.filter(w => w.severity === 'warning');

  for (const w of errors) {
    for (const block of w.blocks) {
      if (w.disable) {
        try { block.setDisabledReason(true, DISABLE_REASON); } catch(e) {}
      }
      block.setWarningText(w.message);
    }
  }

  for (const w of warns) {
    for (const block of w.blocks) {
      block.setWarningText(w.message);
    }
  }

  updateStatusPanel(warnings);
  lastWarnings = warnings;
}

// ── Panel de estado en el header ────────────────

function updateStatusPanel(warnings) {
  let statusEl = document.getElementById('status-panel');
  if (!statusEl) {
    const header = document.querySelector('header');
    statusEl = document.createElement('div');
    statusEl.id = 'status-panel';
    statusEl.style.cssText = `
      display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
      padding: 0.3rem 1.5rem; background: var(--bg-panel);
      border-bottom: 1px solid #2a2a4a; flex-shrink: 0;
      font-size: 0.75rem;
    `;
    header.insertAdjacentElement('afterend', statusEl);
  }

  const errors = warnings.filter(w => w.severity === 'error');
  const warns = warnings.filter(w => w.severity === 'warning');

  let html = '';

  if (errors.length > 0) {
    html += `<span style="color:var(--status-error)">✕ ${errors.length} error(es)</span> `;
    for (const e of errors) {
      html += `<span style="color:var(--status-error-msg); margin-right: 1rem">${e.message}</span>`;
    }
  }

  if (warns.length > 0 && errors.length === 0) {
    html += `<span style="color:var(--status-warn)">⚠ ${warns.length} aviso(s)</span> `;
    for (const w of warns) {
      html += `<span style="color:var(--status-warn-msg); margin-right: 1rem">${w.message}</span>`;
    }
  }

  if (errors.length === 0 && warns.length === 0) {
    html = '<span style="color:var(--status-ok)">✓ Sketch válido</span>';
  }

  statusEl.innerHTML = html;
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
