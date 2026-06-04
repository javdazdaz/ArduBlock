import * as Blockly from 'blockly';
import '../i18n.js';

/**
 * ArduBlock — Bloques: bucles
 */

export const blocks = [
{
    "type": "arduino_for_index",
    "message0": Blockly.Msg.MSG_FOR_INDEX,
    "args0": [
      { "type": "field_input", "name": "VAR", "text": "i" },
      { "type": "input_value", "name": "FROM", "check": "Number",
        "shadow": { "type": "math_number", "fields": { "NUM": 0 } } },
      { "type": "input_value", "name": "TO", "check": "Number",
        "shadow": { "type": "math_number", "fields": { "NUM": 10 } } },
      { "type": "input_value", "name": "BY", "check": "Number",
        "shadow": { "type": "math_number", "fields": { "NUM": 1 } } }
    ],
    "message1": "hacer %1",
    "args1": [
      { "type": "input_statement", "name": "DO" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "style": "loop_blocks",
    "tooltip": Blockly.Msg.TOOLTIP_FOR_INDEX,
    "helpUrl": ""
  }
];

export function registerGenerators(cppGenerator) {
// ── arduino_for_index (custom, field_input) ──
cppGenerator.forBlock['arduino_for_index'] = function(block) {
  const varName = block.getFieldValue('VAR') || 'i';
  const from = cppGenerator.valueToCode(block, 'FROM',
    cppGenerator.ORDER_NONE) || '0';
  const to = cppGenerator.valueToCode(block, 'TO',
    cppGenerator.ORDER_NONE) || '10';
  const by = cppGenerator.valueToCode(block, 'BY',
    cppGenerator.ORDER_NONE) || '1';
  const branch = cppGenerator.statementToCode(block, 'DO');

  let code = 'for (int ' + varName + ' = ' + from + '; '
           + varName + ' <= ' + to + '; '
           + varName + ' += ' + by + ') {\n';
  code += branch || '  //\n';
  code += '}\n';
  return code;
};


}
