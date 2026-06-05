import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg
/**
 * ArduBlock — Bloques: AFMotor_R4 (Adafruit Motor Shield para R4)
 */

export const blocks = [
{
    "type": "afmotor_dc_create",
    "message0": Blockly.Msg.MSG_AFMOTOR_DC_CREATE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "motor1" },
      { "type": "field_dropdown", "name": "CHANNEL", "options": [
        ["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"]
      ]}
    ],
    "inputsInline": true,
    "colour": 310,
    "tooltip": Blockly.Msg.TOOLTIP_AFMOTOR_DC_CREATE,
    "helpUrl": ""
  },
{
    "type": "afmotor_dc_speed",
    "message0": Blockly.Msg.MSG_AFMOTOR_DC_SPEED,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "motor1" },
      { "type": "field_number", "name": "SPEED", "value": 200, "min": 0, "max": 255 }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": 310,
    "tooltip": Blockly.Msg.TOOLTIP_AFMOTOR_DC_SPEED,
    "helpUrl": ""
  },
{
    "type": "afmotor_dc_run",
    "message0": Blockly.Msg.MSG_AFMOTOR_DC_RUN,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "motor1" },
      { "type": "field_dropdown", "name": "DIR", "options": [
        [Blockly.Msg.OPT_FORWARD, "FORWARD"],
        [Blockly.Msg.OPT_BACKWARD, "BACKWARD"],
        [Blockly.Msg.OPT_RELEASE, "RELEASE"]
      ]}
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": 310,
    "tooltip": Blockly.Msg.TOOLTIP_AFMOTOR_DC_RUN,
    "helpUrl": ""
  },
{
    "type": "afmotor_stepper_create",
    "message0": Blockly.Msg.MSG_AFMOTOR_STEPPER_CREATE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "stepper1" },
      { "type": "field_number", "name": "STEPS", "value": 200, "min": 1 },
      { "type": "field_dropdown", "name": "CHANNEL", "options": [
        ["1", "1"], ["2", "2"]
      ]}
    ],
    "inputsInline": true,
    "colour": 310,
    "tooltip": Blockly.Msg.TOOLTIP_AFMOTOR_STEPPER_CREATE,
    "helpUrl": ""
  },
{
    "type": "afmotor_stepper_speed",
    "message0": Blockly.Msg.MSG_AFMOTOR_STEPPER_SPEED,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "stepper1" },
      { "type": "field_number", "name": "RPM", "value": 60, "min": 1 }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": 310,
    "tooltip": Blockly.Msg.TOOLTIP_AFMOTOR_STEPPER_SPEED,
    "helpUrl": ""
  },
{
    "type": "afmotor_stepper_step",
    "message0": Blockly.Msg.MSG_AFMOTOR_STEPPER_STEP,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "stepper1" },
      { "type": "field_number", "name": "COUNT", "value": 100, "min": 1 },
      { "type": "field_dropdown", "name": "DIR", "options": [
        [Blockly.Msg.OPT_FORWARD, "FORWARD"],
        [Blockly.Msg.OPT_BACKWARD, "BACKWARD"]
      ]},
      { "type": "field_dropdown", "name": "STYLE", "options": [
        ["SINGLE", "SINGLE"],
        ["DOUBLE", "DOUBLE"],
        ["INTERLEAVE", "INTERLEAVE"],
        ["MICROSTEP", "MICROSTEP"]
      ]}
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": 310,
    "tooltip": Blockly.Msg.TOOLTIP_AFMOTOR_STEPPER_STEP,
    "helpUrl": ""
  }
];

export function registerGenerators(cppGenerator) {
// ── afmotor_dc_create ─────────────────────────
// Declaración global + attach en setup
cppGenerator.forBlock['afmotor_dc_create'] = function(block) {
  const name = block.getFieldValue('NAME') || 'motor1';
  const channel = block.getFieldValue('CHANNEL');
  cppGenerator._afmotorDcInstances.push({ name, channel });
  return name + '.setSpeed(200);\n';  // velocidad por defecto en setup
};
// ── afmotor_dc_speed ──────────────────────────
cppGenerator.forBlock['afmotor_dc_speed'] = function(block) {
  const name = block.getFieldValue('NAME') || 'motor1';
  const speed = block.getFieldValue('SPEED');
  return name + '.setSpeed(' + speed + ');\n';
};
// ── afmotor_dc_run ────────────────────────────
cppGenerator.forBlock['afmotor_dc_run'] = function(block) {
  const name = block.getFieldValue('NAME') || 'motor1';
  const dir = block.getFieldValue('DIR');
  return name + '.run(' + dir + ');\n';
};
// ── afmotor_stepper_create ────────────────────
cppGenerator.forBlock['afmotor_stepper_create'] = function(block) {
  const name = block.getFieldValue('NAME') || 'stepper1';
  const steps = block.getFieldValue('STEPS');
  const channel = block.getFieldValue('CHANNEL');
  cppGenerator._afmotorStepperInstances.push({ name, steps, channel });
  return name + '.setSpeed(60);\n';  // RPM por defecto
};
// ── afmotor_stepper_speed ─────────────────────
cppGenerator.forBlock['afmotor_stepper_speed'] = function(block) {
  const name = block.getFieldValue('NAME') || 'stepper1';
  const rpm = block.getFieldValue('RPM');
  return name + '.setSpeed(' + rpm + ');\n';
};
// ── afmotor_stepper_step ──────────────────────
cppGenerator.forBlock['afmotor_stepper_step'] = function(block) {
  const name = block.getFieldValue('NAME') || 'stepper1';
  const count = block.getFieldValue('COUNT');
  const dir = block.getFieldValue('DIR');
  const style = block.getFieldValue('STYLE');
  return name + '.step(' + count + ', ' + dir + ', ' + style + ');\n';
};
}
