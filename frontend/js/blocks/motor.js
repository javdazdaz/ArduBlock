import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg
/**
 * ArduBlock — Bloques: motor
 */

export const blocks = [
{
    "type": "stepper_create",
    "message0": Blockly.Msg.MSG_STEPPER_CREATE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "motor" },
      { "type": "field_number", "name": "STEPS", "value": 2048, "min": 1 },
      { "type": "field_number", "name": "P1", "value": 8, "min": 0, "max": 54 },
      { "type": "field_number", "name": "P2", "value": 9, "min": 0, "max": 54 },
      { "type": "field_number", "name": "P3", "value": 10, "min": 0, "max": 54 },
      { "type": "field_number", "name": "P4", "value": 11, "min": 0, "max": 54 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 310,
    "tooltip": Blockly.Msg.TOOLTIP_STEPPER_CREATE,
    "helpUrl": ""
  },
{
    "type": "stepper_create_advanced",
    "message0": Blockly.Msg.MSG_STEPPER_CREATE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "motor" },
      { "type": "input_value", "name": "STEPS", "check": "Number" },
      { "type": "input_value", "name": "P1", "check": "Number" },
      { "type": "input_value", "name": "P2", "check": "Number" },
      { "type": "input_value", "name": "P3", "check": "Number" },
      { "type": "input_value", "name": "P4", "check": "Number" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 310,
    "tooltip": "Nivel Avanzado. Los pasos por revolución y pines pueden ser variables. Permite configurar el motor paso a paso con parámetros dinámicos.",
    "helpUrl": ""
  },
{
    "type": "stepper_speed",
    "message0": Blockly.Msg.MSG_STEPPER_SPEED,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "motor" },
      { "type": "field_number", "name": "RPM", "value": 10, "min": 1 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 310,
    "tooltip": Blockly.Msg.TOOLTIP_STEPPER_SPEED,
    "helpUrl": ""
  },
{
    "type": "stepper_speed_advanced",
    "message0": Blockly.Msg.MSG_STEPPER_SPEED,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "motor" },
      { "type": "input_value", "name": "RPM", "check": "Number" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 310,
    "tooltip": "Nivel Avanzado. La velocidad RPM puede ser una variable o expresión. Permite cambiar la velocidad del motor dinámicamente.",
    "helpUrl": ""
  },
{
    "type": "stepper_step",
    "message0": Blockly.Msg.MSG_STEPPER_STEP,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "motor" },
      { "type": "field_number", "name": "COUNT", "value": 100, "min": -32768 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 310,
    "tooltip": Blockly.Msg.TOOLTIP_STEPPER_STEP,
    "helpUrl": ""
  },
{
    "type": "stepper_step_advanced",
    "message0": Blockly.Msg.MSG_STEPPER_STEP,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "motor" },
      { "type": "input_value", "name": "COUNT", "check": "Number" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 310,
    "tooltip": "Nivel Avanzado. El número de pasos puede ser una variable o expresión. Permite controlar la posición del motor desde un bucle.",
    "helpUrl": ""
  }
];

export function registerGenerators(cppGenerator) {
// ── stepper_create ─────────────────────────────
cppGenerator._stepperInstances = [];
cppGenerator.forBlock['stepper_create'] = function(block) {
  const name  = block.getFieldValue('NAME') || 'motor';
  const steps = block.getFieldValue('STEPS');
  const p1 = block.getFieldValue('P1');
  const p2 = block.getFieldValue('P2');
  const p3 = block.getFieldValue('P3');
  const p4 = block.getFieldValue('P4');
  cppGenerator._stepperInstances.push({ name, steps, p1, p2, p3, p4 });
  return '';  // constructor va global, nada que emitir aquí
};
// ── stepper_create_advanced (N3) ───────────────
cppGenerator.forBlock['stepper_create_advanced'] = function(block) {
  const name  = block.getFieldValue('NAME') || 'motor';
  const steps = cppGenerator.valueToCode(block, 'STEPS', cppGenerator.ORDER_ATOMIC) || '2048';
  const p1    = cppGenerator.valueToCode(block, 'P1', cppGenerator.ORDER_ATOMIC) || '8';
  const p2    = cppGenerator.valueToCode(block, 'P2', cppGenerator.ORDER_ATOMIC) || '9';
  const p3    = cppGenerator.valueToCode(block, 'P3', cppGenerator.ORDER_ATOMIC) || '10';
  const p4    = cppGenerator.valueToCode(block, 'P4', cppGenerator.ORDER_ATOMIC) || '11';
  cppGenerator._stepperInstances.push({ name, steps, p1, p2, p3, p4 });
  return '';
};
// ── stepper_speed ──────────────────────────────
cppGenerator.forBlock['stepper_speed'] = function(block) {
  const name = block.getFieldValue('NAME') || 'motor';
  const rpm  = block.getFieldValue('RPM');
  return name + '.setSpeed(' + rpm + ');\n';
};
// ── stepper_speed_advanced (N3) ────────────────
cppGenerator.forBlock['stepper_speed_advanced'] = function(block) {
  const name = block.getFieldValue('NAME') || 'motor';
  const rpm  = cppGenerator.valueToCode(block, 'RPM', cppGenerator.ORDER_ATOMIC) || '10';
  return name + '.setSpeed(' + rpm + ');\n';
};
// ── stepper_step ───────────────────────────────
cppGenerator.forBlock['stepper_step'] = function(block) {
  const name  = block.getFieldValue('NAME') || 'motor';
  const count = block.getFieldValue('COUNT');
  return name + '.step(' + count + ');\n';
};
// ── stepper_step_advanced (N3) ─────────────────
cppGenerator.forBlock['stepper_step_advanced'] = function(block) {
  const name  = block.getFieldValue('NAME') || 'motor';
  const count = cppGenerator.valueToCode(block, 'COUNT', cppGenerator.ORDER_ATOMIC) || '100';
  return name + '.step(' + count + ');\n';
};
}
