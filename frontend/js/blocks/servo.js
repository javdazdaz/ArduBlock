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
    "type": "servo_create_advanced",
    "message0": Blockly.Msg.MSG_SERVO_CREATE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "servo" },
      { "type": "input_value", "name": "PIN", "check": "Number" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 300,
    "tooltip": "Nivel Avanzado. El pin del servo puede ser una variable o expresión. Permite crear el servo en un pin configurable dinámicamente.",
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
    "type": "servo_write_advanced",
    "message0": Blockly.Msg.MSG_SERVO_WRITE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "servo" },
      { "type": "input_value", "name": "ANGLE", "check": "Number" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 300,
    "tooltip": "Nivel Avanzado. El ángulo puede ser una variable o expresión. Permite mover el servo dinámicamente desde un bucle o sensor.",
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
  },
{
    "type": "servo_write_us_advanced",
    "message0": Blockly.Msg.MSG_SERVO_WRITE_US,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "servo" },
      { "type": "input_value", "name": "US", "check": "Number" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 300,
    "tooltip": "Nivel Avanzado. Los microsegundos pueden ser una variable o expresión. Permite control preciso del servo con valores calculados.",
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
// ── servo_create_advanced (N3) ────────────────
cppGenerator.forBlock['servo_create_advanced'] = function(block) {
  const name = block.getFieldValue('NAME').trim() || 'servo';
  const pin  = cppGenerator.valueToCode(block, 'PIN', cppGenerator.ORDER_ATOMIC) || '9';
  return name + '.attach(' + pin + ');\n';
};
// ── servo_write ──────────────────────────────
cppGenerator.forBlock['servo_write'] = function(block) {
  const name  = block.getFieldValue('NAME').trim() || 'servo';
  const angle = block.getFieldValue('ANGLE');
  return name + '.write(' + angle + ');\n';
};
// ── servo_write_advanced (N3) ─────────────────
cppGenerator.forBlock['servo_write_advanced'] = function(block) {
  const name  = block.getFieldValue('NAME').trim() || 'servo';
  const angle = cppGenerator.valueToCode(block, 'ANGLE', cppGenerator.ORDER_ATOMIC) || '90';
  return name + '.write(' + angle + ');\n';
};
// ── servo_write_us ───────────────────────────
cppGenerator.forBlock['servo_write_us'] = function(block) {
  const name = block.getFieldValue('NAME').trim() || 'servo';
  const us   = block.getFieldValue('US');
  return name + '.writeMicroseconds(' + us + ');\n';
};
// ── servo_write_us_advanced (N3) ──────────────
cppGenerator.forBlock['servo_write_us_advanced'] = function(block) {
  const name = block.getFieldValue('NAME').trim() || 'servo';
  const us   = cppGenerator.valueToCode(block, 'US', cppGenerator.ORDER_ATOMIC) || '1500';
  return name + '.writeMicroseconds(' + us + ');\n';
};
}
