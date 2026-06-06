import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg
/**
 * ArduBlock — Bloques: estructura
 */

export const blocks = [
{
    "type": "arduino_setup",
    "message0": Blockly.Msg.MSG_ARDUINO_SETUP,
    "args0": [
      { "type": "input_dummy" },
      { "type": "input_statement", "name": "BODY" }
    ],
    "colour": 200,   // azul grisáceo
    "tooltip": Blockly.Msg.TOOLTIP_ARDUINO_SETUP,
    "helpUrl": ""
  },
{
    "type": "arduino_loop",
    "message0": Blockly.Msg.MSG_ARDUINO_LOOP,
    "args0": [
      { "type": "input_dummy" },
      { "type": "input_statement", "name": "BODY" }
    ],
    "colour": 200,
    "tooltip": Blockly.Msg.TOOLTIP_ARDUINO_LOOP,
    "helpUrl": ""
  },
{
    "type": "include_header",
    "message0": Blockly.Msg.MSG_INCLUDE_HEADER,
    "args0": [
      { "type": "field_input", "name": "FILE", "text": "config.h" }
    ],
    "colour": 200,
    "tooltip": Blockly.Msg.TOOLTIP_INCLUDE_HEADER,
    "helpUrl": ""
  },
{
    "type": "library_include",
    "message0": Blockly.Msg.MSG_LIBRARY_INCLUDE,
    "args0": [
      { "type": "field_dropdown", "name": "LIB", "options": [
        ["AFMotor_R4.h", "AFMotor_R4.h"]
      ]}
    ],
    "colour": 200,
    "previousStatement": null,
    "nextStatement": null,
    "tooltip": Blockly.Msg.TOOLTIP_LIBRARY_INCLUDE,
    "helpUrl": ""
  }
];

export function registerGenerators(cppGenerator) {
// ── arduino_setup ────────────────────────────
cppGenerator.forBlock['arduino_setup'] = function(block) {
  const body = cppGenerator.statementToCode(block, 'BODY');
  return body || '  // sin instrucciones\n';
};
// ── arduino_loop ─────────────────────────────
cppGenerator.forBlock['arduino_loop'] = function(block) {
  const body = cppGenerator.statementToCode(block, 'BODY');
  return body || '  // sin instrucciones\n';
};
// ── include_header ───────────────────────────
// Se recolecta en generateArduinoCode vía getAllBlocks()
cppGenerator.forBlock['include_header'] = function(_block) {
  return '';
};
// ── library_include ──────────────────────────
// Se recolecta en generateArduinoCode vía getAllBlocks()
cppGenerator.forBlock['library_include'] = function(_block) {
  return '';
};
}
