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
// ── stepper_speed ──────────────────────────────
cppGenerator.forBlock['stepper_speed'] = function(block) {
  const name = block.getFieldValue('NAME') || 'motor';
  const rpm  = block.getFieldValue('RPM');
  return name + '.setSpeed(' + rpm + ');\n';
};
// ── stepper_step ───────────────────────────────
cppGenerator.forBlock['stepper_step'] = function(block) {
  const name  = block.getFieldValue('NAME') || 'motor';
  const count = block.getFieldValue('COUNT');
  return name + '.step(' + count + ');\n';
};
}
