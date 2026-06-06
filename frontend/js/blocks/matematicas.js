import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg
/**
 * ArduBlock — Bloques: matematicas
 */

export const blocks = [
{
    "type": "map_value",
    "message0": Blockly.Msg.MSG_MAP_VALUE,
    "args0": [
      { "type": "input_value", "name": "VALUE", "check": "Number" },
      { "type": "field_number", "name": "FROM_LOW", "value": 0 },
      { "type": "field_number", "name": "FROM_HIGH", "value": 1023 },
      { "type": "field_number", "name": "TO_LOW", "value": 0 },
      { "type": "field_number", "name": "TO_HIGH", "value": 255 }
    ],
    "output": "Number",
    "style": "math_blocks",
    "tooltip": Blockly.Msg.TOOLTIP_MAP_VALUE,
    "helpUrl": ""
  },
{
    "type": "map_value_advanced",
    "message0": Blockly.Msg.MSG_MAP_VALUE,
    "args0": [
      { "type": "input_value", "name": "VALUE", "check": "Number" },
      { "type": "input_value", "name": "FROM_LOW", "check": "Number" },
      { "type": "input_value", "name": "FROM_HIGH", "check": "Number" },
      { "type": "input_value", "name": "TO_LOW", "check": "Number" },
      { "type": "input_value", "name": "TO_HIGH", "check": "Number" }
    ],
    "output": "Number",
    "style": "math_blocks",
    "tooltip": "Nivel Avanzado. Todos los rangos pueden ser variables o expresiones. Permite mapeos completamente dinámicos.",
    "helpUrl": ""
  },
{
    "type": "random_seed",
    "message0": Blockly.Msg.MSG_RANDOM_SEED,
    "args0": [
      { "type": "input_value", "name": "SEED", "check": "Number" }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "style": "math_blocks",
    "tooltip": Blockly.Msg.TOOLTIP_RANDOM_SEED,
    "helpUrl": ""
  }
];

export function registerGenerators(cppGenerator) {
// ── map_value (expression) ────────────────────
cppGenerator.forBlock['map_value'] = function(block) {
  const val     = cppGenerator.valueToCode(block, 'VALUE', cppGenerator.ORDER_NONE);
  const fromLow  = block.getFieldValue('FROM_LOW');
  const fromHigh = block.getFieldValue('FROM_HIGH');
  const toLow    = block.getFieldValue('TO_LOW');
  const toHigh   = block.getFieldValue('TO_HIGH');
  return ['map(' + val + ', ' + fromLow + ', ' + fromHigh + ', ' + toLow + ', ' + toHigh + ')',
          cppGenerator.ORDER_ATOMIC];
};
// ── map_value_advanced (N3) ──────────────────
cppGenerator.forBlock['map_value_advanced'] = function(block) {
  const val      = cppGenerator.valueToCode(block, 'VALUE', cppGenerator.ORDER_NONE);
  const fromLow  = cppGenerator.valueToCode(block, 'FROM_LOW', cppGenerator.ORDER_ATOMIC) || '0';
  const fromHigh = cppGenerator.valueToCode(block, 'FROM_HIGH', cppGenerator.ORDER_ATOMIC) || '1023';
  const toLow    = cppGenerator.valueToCode(block, 'TO_LOW', cppGenerator.ORDER_ATOMIC) || '0';
  const toHigh   = cppGenerator.valueToCode(block, 'TO_HIGH', cppGenerator.ORDER_ATOMIC) || '255';
  return ['map(' + val + ', ' + fromLow + ', ' + fromHigh + ', ' + toLow + ', ' + toHigh + ')',
          cppGenerator.ORDER_ATOMIC];
};
// ── random_seed ──────────────────────────────
cppGenerator.forBlock['random_seed'] = function(block) {
  const seed = cppGenerator.valueToCode(block, 'SEED', cppGenerator.ORDER_ATOMIC) || '0';
  return 'randomSeed(' + seed + ');\n';
};
}
