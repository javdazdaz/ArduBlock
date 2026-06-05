import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg
/**
 * ArduBlock — Bloques: serial
 */

export const blocks = [
{
    "type": "serial_begin",
    "message0": Blockly.Msg.MSG_SERIAL_BEGIN,
    "args0": [
      { "type": "field_dropdown", "name": "BAUD",
        "options": [
          ["9600", "9600"],
          ["19200", "19200"],
          ["38400", "38400"],
          ["57600", "57600"],
          ["115200", "115200"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 20,
    "tooltip": Blockly.Msg.TOOLTIP_SERIAL_BEGIN,
    "helpUrl": ""
  },
{
    "type": "serial_begin_advanced",
    "message0": Blockly.Msg.MSG_SERIAL_BEGIN,
    "args0": [
      { "type": "input_value", "name": "BAUD", "check": "Number" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 20,
    "tooltip": "Nivel Avanzado. El baud rate puede ser una variable o expresión. Permite cambiar la velocidad de comunicación dinámicamente.",
    "helpUrl": ""
  },
{
    "type": "serial_print",
    "message0": Blockly.Msg.MSG_SERIAL_PRINT,
    "args0": [
      { "type": "input_value", "name": "TEXT", "check": ["String", "Number"] }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 20,
    "tooltip": Blockly.Msg.TOOLTIP_SERIAL_PRINT,
    "helpUrl": ""
  },
{
    "type": "serial_println",
    "message0": Blockly.Msg.MSG_SERIAL_PRINTLN,
    "args0": [
      { "type": "input_value", "name": "TEXT", "check": ["String", "Number"] }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 20,
    "tooltip": Blockly.Msg.TOOLTIP_SERIAL_PRINTLN,
    "helpUrl": ""
  },
{
    "type": "serial_available",
    "message0": Blockly.Msg.MSG_SERIAL_AVAILABLE,
    "args0": [],
    "output": "Number",
    "colour": 20,
    "tooltip": Blockly.Msg.TOOLTIP_SERIAL_AVAILABLE,
    "helpUrl": ""
  },
{
    "type": "serial_read",
    "message0": Blockly.Msg.MSG_SERIAL_READ,
    "args0": [],
    "output": "Number",
    "colour": 20,
    "tooltip": Blockly.Msg.TOOLTIP_SERIAL_READ,
    "helpUrl": ""
  },
{
    "type": "serial_parse_int",
    "message0": Blockly.Msg.MSG_SERIAL_PARSE_INT,
    "args0": [],
    "output": "Number",
    "colour": 20,
    "tooltip": Blockly.Msg.TOOLTIP_SERIAL_PARSE_INT,
    "helpUrl": ""
  },
{
    "type": "serial_parse_float",
    "message0": Blockly.Msg.MSG_SERIAL_PARSE_FLOAT,
    "args0": [],
    "output": "Number",
    "colour": 20,
    "tooltip": Blockly.Msg.TOOLTIP_SERIAL_PARSE_FLOAT,
    "helpUrl": ""
  },
{
    "type": "serial_read_string",
    "message0": Blockly.Msg.MSG_SERIAL_READ_STRING,
    "args0": [],
    "output": "String",
    "colour": 20,
    "tooltip": Blockly.Msg.TOOLTIP_SERIAL_READ_STRING,
    "helpUrl": ""
  },
{
    "type": "serial_write",
    "message0": Blockly.Msg.MSG_SERIAL_WRITE,
    "args0": [
      { "type": "input_value", "name": "VALUE", "check": "Number" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 20,
    "tooltip": Blockly.Msg.TOOLTIP_SERIAL_WRITE,
    "helpUrl": ""
  }
];

export function registerGenerators(cppGenerator) {
// ── serial_begin ─────────────────────────────
cppGenerator.forBlock['serial_begin'] = function(block) {
  const baud = block.getFieldValue('BAUD');
  return 'Serial.begin(' + baud + ');\n';
};
// ── serial_begin_advanced (N3) ──────────────
cppGenerator.forBlock['serial_begin_advanced'] = function(block) {
  const baud = cppGenerator.valueToCode(block, 'BAUD', cppGenerator.ORDER_ATOMIC) || '9600';
  return 'Serial.begin(' + baud + ');\n';
};
// ── serial_print ─────────────────────────────
cppGenerator.forBlock['serial_print'] = function(block) {
  const text = cppGenerator.valueToCode(block, 'TEXT', cppGenerator.ORDER_NONE) || '""';
  return 'Serial.print(' + text + ');\n';
};
// ── serial_println ───────────────────────────
cppGenerator.forBlock['serial_println'] = function(block) {
  const text = cppGenerator.valueToCode(block, 'TEXT', cppGenerator.ORDER_NONE) || '""';
  return 'Serial.println(' + text + ');\n';
};
// ── serial_available ─────────────────────────
cppGenerator.forBlock['serial_available'] = function(_block) {
  return ['Serial.available()', cppGenerator.ORDER_ATOMIC];
};
// ── serial_read ──────────────────────────────
cppGenerator.forBlock['serial_read'] = function(_block) {
  return ['Serial.read()', cppGenerator.ORDER_ATOMIC];
};
// ── serial_parse_int ─────────────────────────
cppGenerator.forBlock['serial_parse_int'] = function(_block) {
  return ['Serial.parseInt()', cppGenerator.ORDER_ATOMIC];
};
// ── serial_parse_float ───────────────────────
cppGenerator.forBlock['serial_parse_float'] = function(_block) {
  return ['Serial.parseFloat()', cppGenerator.ORDER_ATOMIC];
};
// ── serial_read_string ───────────────────────
cppGenerator.forBlock['serial_read_string'] = function(_block) {
  return ['Serial.readString()', cppGenerator.ORDER_ATOMIC];
};
// ── serial_write ─────────────────────────────
cppGenerator.forBlock['serial_write'] = function(block) {
  const val = cppGenerator.valueToCode(block, 'VALUE', cppGenerator.ORDER_NONE) || '0';
  return 'Serial.write(' + val + ');\n';
};
}
