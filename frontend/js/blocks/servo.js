import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg
/**
 * ArduBlock — Bloques: servo
 */

export const blocks = [
{
    "type": "servo_create",
    "message0": Blockly.Msg.MSG_SERVO_CREATE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "servo" },
      { "type": "field_number", "name": "PIN", "value": 9, "min": 0, "max": 54 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 300,
    "tooltip": Blockly.Msg.TOOLTIP_SERVO_CREATE,
    "helpUrl": ""
  },
{
    "type": "servo_write",
    "message0": Blockly.Msg.MSG_SERVO_WRITE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "servo" },
      { "type": "field_angle", "name": "ANGLE", "value": 90 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 300,
    "tooltip": Blockly.Msg.TOOLTIP_SERVO_WRITE,
    "helpUrl": ""
  },
{
    "type": "servo_write_us",
    "message0": Blockly.Msg.MSG_SERVO_WRITE_US,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "servo" },
      { "type": "field_number", "name": "US", "value": 1500, "min": 500, "max": 2500 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 300,
    "tooltip": Blockly.Msg.TOOLTIP_SERVO_WRITE_US,
    "helpUrl": ""
  }
];

export function registerGenerators(cppGenerator) {
// ── servo_create (declara + attach) ──────────
cppGenerator.forBlock['servo_create'] = function(block) {
  const name = block.getFieldValue('NAME').trim() || 'servo';
  const pin  = block.getFieldValue('PIN');
  // La declaración `Servo nombre;` se maneja en generateArduinoCode
  return name + '.attach(' + pin + ');\n';
};
// ── servo_write ──────────────────────────────
cppGenerator.forBlock['servo_write'] = function(block) {
  const name  = block.getFieldValue('NAME').trim() || 'servo';
  const angle = block.getFieldValue('ANGLE');
  return name + '.write(' + angle + ');\n';
};
// ── servo_write_us ───────────────────────────
cppGenerator.forBlock['servo_write_us'] = function(block) {
  const name = block.getFieldValue('NAME').trim() || 'servo';
  const us   = block.getFieldValue('US');
  return name + '.writeMicroseconds(' + us + ');\n';
};
}
