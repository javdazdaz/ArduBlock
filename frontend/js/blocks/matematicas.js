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
    "colour": 230,
    "tooltip": Blockly.Msg.TOOLTIP_MAP_VALUE,
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
}
