import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg
/**
 * ArduBlock — Bloques: arrays
 */

export const blocks = [
{
    "type": "array_declare",
    "message0": Blockly.Msg.MSG_ARRAY_DECLARE,
    "args0": [
      { "type": "field_dropdown", "name": "TYPE",
        "options": [
          ["int", "int"],
          ["float", "float"],
          ["char", "char"],
          ["long", "long"],
          ["byte", "byte"]
        ]
      },
      { "type": "field_input", "name": "NAME", "text": "arr" },
      { "type": "field_input", "name": "VALUES", "text": "1, 2, 3" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "style": "list_blocks",
    "tooltip": Blockly.Msg.TOOLTIP_ARRAY_DECLARE,
    "helpUrl": ""
  },
{
    "type": "array_get",
    "message0": Blockly.Msg.MSG_ARRAY_GET,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "arr" },
      { "type": "input_value", "name": "INDEX", "check": "Number" }
    ],
    "output": ["Number", "String", "Boolean"],
    "style": "list_blocks",
    "tooltip": Blockly.Msg.TOOLTIP_ARRAY_GET,
    "helpUrl": ""
  },
{
    "type": "array_set",
    "message0": Blockly.Msg.MSG_ARRAY_SET,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "arr" },
      { "type": "input_value", "name": "INDEX", "check": "Number" },
      { "type": "input_value", "name": "VALUE", "check": ["Number", "String", "Boolean"] }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "style": "list_blocks",
    "tooltip": Blockly.Msg.TOOLTIP_ARRAY_SET,
    "helpUrl": ""
  },
{
    "type": "array_length",
    "message0": Blockly.Msg.MSG_ARRAY_LENGTH,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "arr" }
    ],
    "output": "Number",
    "style": "list_blocks",
    "tooltip": Blockly.Msg.TOOLTIP_ARRAY_LENGTH,
    "helpUrl": ""
  }
];

export function registerGenerators(cppGenerator) {
// ── array_declare ────────────────────────────
cppGenerator.forBlock['array_declare'] = function(block) {
  const type = block.getFieldValue('TYPE') || 'int';
  const name = block.getFieldValue('NAME') || 'arr';
  const raw = block.getFieldValue('VALUES') || '';
  const vals = raw.split(',').map(v => v.trim()).filter(v => v);
  const joined = vals.join(', ');
  return type + ' ' + name + '[] = {' + joined + '};\n';
};
// ── array_get ────────────────────────────────
cppGenerator.forBlock['array_get'] = function(block) {
  const name = block.getFieldValue('NAME') || 'arr';
  const idx = cppGenerator.valueToCode(block, 'INDEX',
    cppGenerator.ORDER_ATOMIC) || '0';
  return [name + '[' + idx + ']', cppGenerator.ORDER_ATOMIC];
};
// ── array_set ────────────────────────────────
cppGenerator.forBlock['array_set'] = function(block) {
  const name = block.getFieldValue('NAME') || 'arr';
  const idx  = cppGenerator.valueToCode(block, 'INDEX',
    cppGenerator.ORDER_ATOMIC) || '0';
  const val  = cppGenerator.valueToCode(block, 'VALUE',
    cppGenerator.ORDER_ASSIGNMENT) || '0';
  return name + '[' + idx + '] = ' + val + ';\n';
};
// ── array_length ─────────────────────────────
cppGenerator.forBlock['array_length'] = function(block) {
  const name = block.getFieldValue('NAME') || 'arr';
  return ['(sizeof(' + name + ') / sizeof(' + name + '[0]))',
    cppGenerator.ORDER_ATOMIC];
};
}
