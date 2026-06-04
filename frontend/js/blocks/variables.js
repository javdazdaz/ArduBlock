import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg
/**
 * ArduBlock — Bloques: variables
 */

export const blocks = [
{
    "type": "variable_declare",
    "message0": Blockly.Msg.MSG_VARIABLE_DECLARE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "a" },
      { "type": "field_dropdown", "name": "TYPE",
        "options": [
          ["int", "int"],
          ["float", "float"],
          ["char", "char"],
          ["String", "String"],
          ["bool", "bool"],
          ["byte", "byte"],
          ["long", "long"],
          ["unsigned int", "unsigned int"],
          ["unsigned long", "unsigned long"],
          ["double", "double"]
        ]
      },
      { "type": "input_value", "name": "VALUE", "check": ["Number", "String", "Boolean"] }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 330,
    "tooltip": Blockly.Msg.TOOLTIP_VARIABLE_DECLARE,
    "helpUrl": ""
  },
{
    "type": "variable_set",
    "message0": Blockly.Msg.MSG_VARIABLE_SET,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "a" },
      { "type": "input_value", "name": "VALUE", "check": ["Number", "String", "Boolean"] }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 330,
    "tooltip": Blockly.Msg.TOOLTIP_VARIABLE_SET,
    "helpUrl": ""
  },
{
    "type": "variable_get",
    "message0": Blockly.Msg.MSG_VARIABLE_GET,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "a" }
    ],
    "output": ["Number", "String", "Boolean"],
    "colour": 330,
    "tooltip": Blockly.Msg.TOOLTIP_VARIABLE_GET,
    "helpUrl": ""
  }
];

export function registerGenerators(cppGenerator) {
// ── variable_declare ───────────────────────────
cppGenerator.forBlock['variable_declare'] = function(block) {
  const name  = block.getFieldValue('NAME') || 'a';
  const type  = block.getFieldValue('TYPE') || 'int';
  const value = cppGenerator.valueToCode(block, 'VALUE', cppGenerator.ORDER_NONE);
  if (value) {
    return type + ' ' + name + ' = ' + value + ';\n';
  }
  return type + ' ' + name + ' {};\n';
};
// ── variable_set ───────────────────────────────
cppGenerator.forBlock['variable_set'] = function(block) {
  const name  = block.getFieldValue('NAME') || 'a';
  const value = cppGenerator.valueToCode(block, 'VALUE', cppGenerator.ORDER_NONE);
  return name + ' = ' + (value || '0') + ';\n';
};
// ── variable_get ───────────────────────────────
cppGenerator.forBlock['variable_get'] = function(block) {
  const name = block.getFieldValue('NAME') || 'a';
  return [name, cppGenerator.ORDER_ATOMIC];
};
}
