/**
 * ArduBlock — Definición de Bloques Arduino
 *
 * Define los bloques visuales específicos de Arduino:
 * setup/loop, pines digitales/analógicos, Serial, delays.
 */

import * as Blockly from 'blockly';
import { registerFieldAngle } from '@blockly/field-angle';
import { initLanguage } from './i18n.js';
import { blocks as procBlocks, unregisterProcedureBlocks, registerProcedureSerializer,
         ObservableParameterModel, ObservableProcedureModel }
  from '@blockly/block-shareable-procedures';

// Inicializar idioma antes de definir bloques — Blockly.Msg debe estar poblado
// o message0/tooltip con Blockly.Msg.KEY quedan undefined y Blockly lanza
// "args0 must have a corresponding message (message0)"
initLanguage();

// Registrar field_angle antes de definir bloques que lo usan
registerFieldAngle();

// Reemplazar bloques de procedimientos built-in por los shareables
unregisterProcedureBlocks();
Blockly.common.defineBlocks(procBlocks);
registerProcedureSerializer();

// ═══ Tipado de parámetros en procedimientos ═══
// ObservableParameterModel no soporta tipos: getTypes() → [],
// setTypes() lanza error. Implementamos TypedParameterModel
// con dropdown de tipo igual que variable_declare.

const ARDUINO_TYPES = [
  ['int', 'int'], ['float', 'float'], ['char', 'char'],
  ['String', 'String'], ['bool', 'bool'], ['byte', 'byte'],
  ['long', 'long'], ['unsigned int', 'unsigned int'],
  ['unsigned long', 'unsigned long'], ['double', 'double']
];

class TypedParameterModel extends ObservableParameterModel {
  constructor(workspace, name, id, varId, paramType) {
    super(workspace, name, id, varId);
    this.paramType_ = paramType || 'int';
  }
  getTypes() { return [this.paramType_]; }
  setTypes(types) {
    this.paramType_ = (types && types[0]) || 'int';
    return this;
  }
  saveState() {
    const state = super.saveState();
    state.types = [this.paramType_];
    return state;
  }
  static loadState(state, workspace) {
    return new TypedParameterModel(
      workspace, state.name, state.id, undefined,
      (state.types && state.types[0]) || 'int'
    );
  }
}

// Redefinir procedures_mutatorarg con dropdown de tipo
delete Blockly.Blocks['procedures_mutatorarg'];

// ═══ Importar bloques por categoría ══════════════

import { blocks as estructuraBlocks } from './blocks/estructura.js';
import { blocks as digitalBlocks }    from './blocks/digital.js';
import { blocks as analogaBlocks }    from './blocks/analoga.js';
import { blocks as avanzadaBlocks }   from './blocks/avanzada.js';
import { blocks as tiempoBlocks }     from './blocks/tiempo.js';
import { blocks as serialBlocks }     from './blocks/serial.js';
import { blocks as servoBlocks }      from './blocks/servo.js';
import { blocks as lcdBlocks }        from './blocks/lcd.js';
import { blocks as sensoresBlocks }   from './blocks/sensores.js';
import { blocks as motorBlocks }      from './blocks/motor.js';
import { blocks as matematicasBlocks } from './blocks/matematicas.js';
import { blocks as variablesBlocks }  from './blocks/variables.js';
import { blocks as arraysBlocks }     from './blocks/arrays.js';
import { blocks as buclesBlocks }     from './blocks/bucles.js';

// ═══ Registrar todos los bloques ═══════════════

const allBlocks = [
  ...estructuraBlocks,
  ...digitalBlocks,
  ...analogaBlocks,
  ...avanzadaBlocks,
  ...tiempoBlocks,
  ...serialBlocks,
  ...servoBlocks,
  ...lcdBlocks,
  ...sensoresBlocks,
  ...motorBlocks,
  ...matematicasBlocks,
  ...variablesBlocks,
  ...arraysBlocks,
  ...buclesBlocks,
];

Blockly.common.defineBlocksWithJsonArray(allBlocks);

// ═══ Mapa de niveles por bloque ═══════════════
// Usado por la protección de nivel: detecta si un bloque
// cargado requiere un nivel superior al actual.
// key = block type, value = nivel mínimo (1,2,3)
function _buildBlockLevelMap(toolboxContents) {
  const map = {};
  function walk(items) {
    for (const item of items) {
      if (item.level && item.type) {
        // Bloque con nivel explícito: guardar el mínimo
        if (!map[item.type] || item.level < map[item.type]) {
          map[item.type] = item.level;
        }
      }
      if (item.contents) walk(item.contents);
    }
  }
  walk(toolboxContents);
  return map;
}

// Precomputamos el mapa con toolbox completo (nivel 3)
const _FULL_TOOLBOX_TEMPLATE = [
  { kind: 'block', type: 'arduino_setup', level: 1 },
  { kind: 'block', type: 'arduino_loop', level: 1 },
  { kind: 'block', type: 'include_header', level: 3 },
  { kind: 'block', type: 'pin_mode_basic', level: 1 },
  { kind: 'block', type: 'pin_mode', level: 2 },
  { kind: 'block', type: 'pin_mode_advanced', level: 3 },
  { kind: 'block', type: 'digital_write_basic', level: 1 },
  { kind: 'block', type: 'digital_write', level: 2 },
  { kind: 'block', type: 'digital_write_advanced', level: 3 },
  { kind: 'block', type: 'digital_read_basic', level: 1 },
  { kind: 'block', type: 'digital_read', level: 2 },
  { kind: 'block', type: 'digital_read_advanced', level: 3 },
  { kind: 'block', type: 'analog_write', level: 2 },
  { kind: 'block', type: 'analog_read_basic', level: 2 },
  { kind: 'block', type: 'analog_read', level: 2 },
  { kind: 'block', type: 'analog_read_advanced', level: 3 },
  { kind: 'block', type: 'pulse_in', level: 2 },
  { kind: 'block', type: 'attach_interrupt', level: 3 },
  { kind: 'block', type: 'delay_ms_basic', level: 1 },
  { kind: 'block', type: 'delay_ms', level: 2 },
  { kind: 'block', type: 'delay_ms_advanced', level: 3 },
  { kind: 'block', type: 'millis', level: 2 },
  { kind: 'block', type: 'tone_output_basic', level: 2 },
  { kind: 'block', type: 'tone_output', level: 2 },
  { kind: 'block', type: 'tone_output_advanced', level: 3 },
  { kind: 'block', type: 'tone_duration', level: 2 },
  { kind: 'block', type: 'no_tone_output', level: 2 },
  { kind: 'block', type: 'lcd_create', level: 3 },
  { kind: 'block', type: 'lcd_i2c_create', level: 3 },
  { kind: 'block', type: 'lcd_print', level: 3 },
  { kind: 'block', type: 'lcd_set_cursor', level: 3 },
  { kind: 'block', type: 'lcd_clear', level: 3 },
  { kind: 'block', type: 'dht_create', level: 3 },
  { kind: 'block', type: 'dht_temp', level: 3 },
  { kind: 'block', type: 'dht_humidity', level: 3 },
  { kind: 'block', type: 'ultrasonic_create', level: 2 },
  { kind: 'block', type: 'ultrasonic_read', level: 2 },
  { kind: 'block', type: 'stepper_create', level: 3 },
  { kind: 'block', type: 'stepper_speed', level: 3 },
  { kind: 'block', type: 'stepper_step', level: 3 },
  { kind: 'block', type: 'servo_create', level: 2 },
  { kind: 'block', type: 'servo_write', level: 2 },
  { kind: 'block', type: 'servo_write_us', level: 3 },
  { kind: 'block', type: 'serial_begin', level: 2 },
  { kind: 'block', type: 'serial_print', level: 2 },
  { kind: 'block', type: 'serial_println', level: 1 },
  { kind: 'block', type: 'serial_available', level: 3 },
  { kind: 'block', type: 'serial_read', level: 3 },
  { kind: 'block', type: 'serial_parse_int', level: 3 },
  { kind: 'block', type: 'serial_parse_float', level: 3 },
  { kind: 'block', type: 'serial_read_string', level: 3 },
  { kind: 'block', type: 'serial_write', level: 3 },
  { kind: 'block', type: 'controls_if', level: 2 },
  { kind: 'block', type: 'logic_compare', level: 2 },
  { kind: 'block', type: 'logic_operation', level: 3 },
  { kind: 'block', type: 'logic_negate', level: 3 },
  { kind: 'block', type: 'logic_boolean', level: 2 },
  { kind: 'block', type: 'controls_repeat_ext', level: 2 },
  { kind: 'block', type: 'controls_whileUntil', level: 2 },
  { kind: 'block', type: 'arduino_for_index', level: 3 },
  { kind: 'block', type: 'controls_for', level: 3 },
  { kind: 'block', type: 'math_number', level: 1 },
  { kind: 'block', type: 'math_arithmetic', level: 2 },
  { kind: 'block', type: 'math_single', level: 2 },
  { kind: 'block', type: 'math_modulo', level: 3 },
  { kind: 'block', type: 'math_random_int', level: 2 },
  { kind: 'block', type: 'math_constrain', level: 3 },
  { kind: 'block', type: 'map_value', level: 3 },
  { kind: 'block', type: 'math_number_property', level: 3 },
  { kind: 'block', type: 'variable_declare', level: 3 },
  { kind: 'block', type: 'variable_set', level: 3 },
  { kind: 'block', type: 'variable_get', level: 3 },
  { kind: 'block', type: 'array_declare', level: 3 },
  { kind: 'block', type: 'array_get', level: 3 },
  { kind: 'block', type: 'array_set', level: 3 },
  { kind: 'block', type: 'array_length', level: 3 },
  { kind: 'block', type: 'text', level: 3 },
  { kind: 'block', type: 'text_join', level: 3 },
  { kind: 'block', type: 'text_print', level: 3 },
  { kind: 'block', type: 'text_length', level: 3 },
  { kind: 'block', type: 'procedures_defnoreturn', level: 3 },
  { kind: 'block', type: 'procedures_defreturn', level: 3 },
  { kind: 'block', type: 'procedures_callnoreturn', level: 3 },
  { kind: 'block', type: 'procedures_callreturn', level: 3 },
  { kind: 'block', type: 'procedures_ifreturn', level: 3 },
  { kind: 'block', type: 'logic_ternary', level: 3 },
  { kind: 'block', type: 'controls_flow_statements', level: 3 },
];

export const BLOCK_LEVELS = _buildBlockLevelMap(_FULL_TOOLBOX_TEMPLATE);

export function getBlockLevel(blockType) {
  return BLOCK_LEVELS[blockType] || 3; // desconocidos → nivel 3
}

// ═══ Toolbox dinámico por placa ═════════════════
import { getBoardConfig, getDefaultFqbn } from './board.js';

export function buildToolboxForBoard(fqbn, level) {
  const board = getBoardConfig(fqbn || getDefaultFqbn());
  // Por ahora el toolbox es idéntico para todas las placas.
  // En el futuro se filtrarán bloques según capacidades (WiFi, BLE, etc.).

  // Nivel por defecto: Básico (1)
  const currentLevel = level || 1;

    const toolbox = {
    'kind': 'categoryToolbox',
    'contents': [
      // ═══════════ ESTRUCTURA ═══════════════════
      { 'kind': 'category', 'name': '%{BKY_CAT_ARDUINO}', 'colour': '230', 'level': 1,
        'contents': [
          { 'kind': 'block', 'type': 'arduino_setup', 'level': 1 },
          { 'kind': 'block', 'type': 'arduino_loop', 'level': 1 },
          { 'kind': 'block', 'type': 'include_header', 'level': 3 }
        ]},
      { 'kind': 'sep' },
      // ═══════════ ENTRADA / SALIDA ══════════════
      { 'kind': 'category', 'name': '%{BKY_CAT_DIGITAL}', 'colour': '190', 'level': 1,
        'contents': [
          { 'kind': 'block', 'type': 'pin_mode_basic', 'level': 1 },
          { 'kind': 'block', 'type': 'pin_mode', 'level': 2 },
          { 'kind': 'block', 'type': 'pin_mode_advanced', 'level': 3 },
          { 'kind': 'block', 'type': 'digital_write_basic', 'level': 1 },
          { 'kind': 'block', 'type': 'digital_write', 'level': 2 },
          { 'kind': 'block', 'type': 'digital_write_advanced', 'level': 3 },
          { 'kind': 'block', 'type': 'digital_read_basic', 'level': 1 },
          { 'kind': 'block', 'type': 'digital_read', 'level': 2 },
          { 'kind': 'block', 'type': 'digital_read_advanced', 'level': 3 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_ANALOGA}', 'colour': '160', 'level': 2,
        'contents': [
          { 'kind': 'block', 'type': 'analog_write', 'level': 2 },
          { 'kind': 'block', 'type': 'analog_read_basic', 'level': 2 },
          { 'kind': 'block', 'type': 'analog_read', 'level': 2 },
          { 'kind': 'block', 'type': 'analog_read_advanced', 'level': 3 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_AVANZADA}', 'colour': '260', 'level': 2,
        'contents': [
          { 'kind': 'block', 'type': 'tone_output_basic', 'level': 2 },
          { 'kind': 'block', 'type': 'tone_output', 'level': 2 },
          { 'kind': 'block', 'type': 'tone_output_advanced', 'level': 3 },
          { 'kind': 'block', 'type': 'tone_duration', 'level': 2 },
          { 'kind': 'block', 'type': 'no_tone_output', 'level': 2 },
          { 'kind': 'block', 'type': 'pulse_in', 'level': 2 },
          { 'kind': 'block', 'type': 'attach_interrupt', 'level': 3 }
        ]},
      { 'kind': 'sep' },
      // ═══════════ CONTROL ═══════════════════════
      { 'kind': 'category', 'name': '%{BKY_CAT_TIEMPO}', 'colour': '290', 'level': 1,
        'contents': [
          { 'kind': 'block', 'type': 'delay_ms_basic', 'level': 1 },
          { 'kind': 'block', 'type': 'delay_ms', 'level': 2 },
          { 'kind': 'block', 'type': 'delay_ms_advanced', 'level': 3 },
          { 'kind': 'block', 'type': 'millis', 'level': 2 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_CONDICIONES}', 'colour': '210', 'level': 2,
        'contents': [
          { 'kind': 'block', 'type': 'controls_if', 'level': 2 },
          { 'kind': 'block', 'type': 'logic_compare', 'level': 2 },
          { 'kind': 'block', 'type': 'logic_boolean', 'level': 2 },
          { 'kind': 'block', 'type': 'logic_operation', 'level': 3 },
          { 'kind': 'block', 'type': 'logic_negate', 'level': 3 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_BUCLES}', 'colour': '120', 'level': 2,
        'contents': [
          { 'kind': 'block', 'type': 'controls_repeat_ext', 'level': 2 },
          { 'kind': 'block', 'type': 'controls_whileUntil', 'level': 2 },
          { 'kind': 'block', 'type': 'arduino_for_index', 'level': 3 }
        ]},
      { 'kind': 'sep' },
      // ═══════════ DATOS ═════════════════════════
      { 'kind': 'category', 'name': '%{BKY_CAT_MATEMATICAS}', 'colour': '230', 'level': 1,
        'contents': [
          { 'kind': 'block', 'type': 'math_number', 'level': 1 },
          { 'kind': 'block', 'type': 'math_arithmetic', 'level': 2 },
          { 'kind': 'block', 'type': 'math_single', 'level': 2 },
          { 'kind': 'block', 'type': 'math_random_int', 'level': 2 },
          { 'kind': 'block', 'type': 'math_modulo', 'level': 3 },
          { 'kind': 'block', 'type': 'math_constrain', 'level': 3 },
          { 'kind': 'block', 'type': 'map_value', 'level': 3 },
          { 'kind': 'block', 'type': 'math_number_property', 'level': 3 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_VARIABLES}', 'colour': '330', 'level': 3,
        'contents': [
          { 'kind': 'block', 'type': 'variable_declare', 'level': 3 },
          { 'kind': 'block', 'type': 'variable_set', 'level': 3 },
          { 'kind': 'block', 'type': 'variable_get', 'level': 3 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_ARREGLOS}', 'colour': '330', 'level': 3,
        'contents': [
          { 'kind': 'block', 'type': 'array_declare', 'level': 3 },
          { 'kind': 'block', 'type': 'array_get', 'level': 3 },
          { 'kind': 'block', 'type': 'array_set', 'level': 3 },
          { 'kind': 'block', 'type': 'array_length', 'level': 3 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_TEXTO}', 'colour': '160', 'level': 3,
        'contents': [
          { 'kind': 'block', 'type': 'text', 'level': 3 },
          { 'kind': 'block', 'type': 'text_join', 'level': 3 },
          { 'kind': 'block', 'type': 'text_print', 'level': 3 },
          { 'kind': 'block', 'type': 'text_length', 'level': 3 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_FUNCIONES}', 'colour': '290', 'custom': 'PROCEDURE', 'level': 3 },
      { 'kind': 'sep' },
      // ═══════════ COMUNICACIÓN ══════════════════
      { 'kind': 'category', 'name': '%{BKY_CAT_SERIAL}', 'colour': '120', 'level': 1,
        'contents': [
          { 'kind': 'block', 'type': 'serial_begin', 'level': 2 },
          { 'kind': 'block', 'type': 'serial_print', 'level': 2 },
          { 'kind': 'block', 'type': 'serial_println', 'level': 1 },
          { 'kind': 'block', 'type': 'serial_available', 'level': 3 },
          { 'kind': 'block', 'type': 'serial_read', 'level': 3 },
          { 'kind': 'block', 'type': 'serial_parse_int', 'level': 3 },
          { 'kind': 'block', 'type': 'serial_parse_float', 'level': 3 },
          { 'kind': 'block', 'type': 'serial_read_string', 'level': 3 },
          { 'kind': 'block', 'type': 'serial_write', 'level': 3 }
        ]},
      { 'kind': 'sep' },
      // ═══════════ COMPONENTES ═══════════════════
      { 'kind': 'category', 'name': '%{BKY_CAT_LCD}', 'colour': '180', 'level': 3,
        'contents': [
          { 'kind': 'block', 'type': 'lcd_create', 'level': 3 },
          { 'kind': 'block', 'type': 'lcd_i2c_create', 'level': 3 },
          { 'kind': 'block', 'type': 'lcd_print', 'level': 3 },
          { 'kind': 'block', 'type': 'lcd_set_cursor', 'level': 3 },
          { 'kind': 'block', 'type': 'lcd_clear', 'level': 3 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_SENSORES}', 'colour': '100', 'level': 2,
        'contents': [
          { 'kind': 'block', 'type': 'dht_create', 'level': 3 },
          { 'kind': 'block', 'type': 'dht_temp', 'level': 3 },
          { 'kind': 'block', 'type': 'dht_humidity', 'level': 3 },
          { 'kind': 'block', 'type': 'ultrasonic_create', 'level': 2 },
          { 'kind': 'block', 'type': 'ultrasonic_read', 'level': 2 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_SERVO}', 'colour': '40', 'level': 2,
        'contents': [
          { 'kind': 'block', 'type': 'servo_create', 'level': 2 },
          { 'kind': 'block', 'type': 'servo_write', 'level': 2 },
          { 'kind': 'block', 'type': 'servo_write_us', 'level': 3 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_MOTOR}', 'colour': '310', 'level': 3,
        'contents': [
          { 'kind': 'block', 'type': 'stepper_create', 'level': 3 },
          { 'kind': 'block', 'type': 'stepper_speed', 'level': 3 },
          { 'kind': 'block', 'type': 'stepper_step', 'level': 3 }
        ]},
      { 'kind': 'search', 'name': '%{BKY_CAT_BUSCAR}', 'contents': [] }
    ]
  };

  // ═══ Filtrar por nivel ═════════════════════
  // Elimina categorías completas cuyo nivel > currentLevel,
  // y dentro de categorías visibles, oculta bloques de nivel superior.
  if (currentLevel < 3) {
    toolbox.contents = toolbox.contents
      .filter(cat => {
        // Sep preservar, search preservar
        if (cat.kind === 'sep' || cat.kind === 'search') return true;
        // Categoría: mantener si tiene nivel <= currentLevel o no tiene nivel
        return !cat.level || cat.level <= currentLevel;
      })
      .map(cat => {
        if (cat.contents && Array.isArray(cat.contents)) {
          cat.contents = cat.contents.filter(block => {
            return !block.level || block.level <= currentLevel;
          });
        }
        return cat;
      });

    // Limpiar categorías vacías
    toolbox.contents = toolbox.contents.filter(cat => {
      if (cat.kind === 'sep' || cat.kind === 'search') return true;
      if (cat.contents && cat.contents.length === 0) return false;
      return true;
    });
  }

  return toolbox;
}

// Dummy export para evitar que Vite haga tree-shaking del side-effect
export const _arduinoBlocksDefined = true;
