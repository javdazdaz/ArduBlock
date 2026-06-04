import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg
/**
 * ArduBlock — Bloques: analoga
 */

export const blocks = [
{
    "type": "analog_write",
    "message0": Blockly.Msg.MSG_ANALOG_WRITE,
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 9, "min": 0, "max": 54 },
      { "type": "input_value", "name": "VALUE", "check": "Number" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 40,
    "tooltip": Blockly.Msg.TOOLTIP_ANALOG_WRITE,
    "helpUrl": ""
  },
{
    "type": "analog_read",
    "message0": Blockly.Msg.MSG_ANALOG_READ,
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 0, "min": 0, "max": 15 }
    ],
    "output": "Number",
    "colour": 40,
    "tooltip": Blockly.Msg.TOOLTIP_ANALOG_READ,
    "helpUrl": ""
  },
{
    "type": "analog_read_basic",
    "message0": Blockly.Msg.MSG_ANALOG_READ,
    "args0": [
      { "type": "field_dropdown", "name": "PIN",
        "options": [
          ["A0", "0"], ["A1", "1"], ["A2", "2"], ["A3", "3"],
          ["A4", "4"], ["A5", "5"], ["A6", "6"], ["A7", "7"],
          ["A8", "8"], ["A9", "9"], ["A10", "10"], ["A11", "11"],
          ["A12", "12"], ["A13", "13"], ["A14", "14"], ["A15", "15"]
        ]
      }
    ],
    "output": "Number",
    "colour": 40,
    "tooltip": "Nivel Básico. Elige el pin analógico de una lista. En Intermedio puedes escribir el número.",
    "helpUrl": ""
  },
{
    "type": "analog_read_advanced",
    "message0": Blockly.Msg.MSG_ANALOG_READ,
    "args0": [
      { "type": "input_value", "name": "PIN", "check": "Number" }
    ],
    "output": "Number",
    "colour": 40,
    "tooltip": "Nivel Avanzado. El pin analógico puede ser una variable. Permite leer sensores en pines dinámicos.",
    "helpUrl": ""
  }
];

export function registerGenerators(cppGenerator) {
// ── analog_write ─────────────────────────────
cppGenerator.forBlock['analog_write'] = function(block) {
  const pin   = block.getFieldValue('PIN');
  const value = cppGenerator.valueToCode(block, 'VALUE', cppGenerator.ORDER_ATOMIC) || '0';
  return 'analogWrite(' + pin + ', ' + value + ');\n';
};
// ── analog_read ──────────────────────────────
cppGenerator.forBlock['analog_read'] = function(block) {
  const pin = block.getFieldValue('PIN');
  return ['analogRead(A' + pin + ')', cppGenerator.ORDER_ATOMIC];
};
// ── analog_read_basic (N1) ────────────────────
cppGenerator.forBlock['analog_read_basic'] = function(block) {
  const pin = block.getFieldValue('PIN');
  return ['analogRead(A' + pin + ')', cppGenerator.ORDER_ATOMIC];
};
// ── analog_read_advanced (N3) ─────────────────
cppGenerator.forBlock['analog_read_advanced'] = function(block) {
  const pin = cppGenerator.valueToCode(block, 'PIN', cppGenerator.ORDER_ATOMIC) || '0';
  return ['analogRead(A' + pin + ')', cppGenerator.ORDER_ATOMIC];
};
}
