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
    "previousStatement": null,
    "nextStatement": null,
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
        [Blockly.Msg.OPT_BRAKE, "BRAKE"],
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
    "previousStatement": null,
    "nextStatement": null,
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
  },
{
    "type": "afmotor_stepper_onestep",
    "message0": Blockly.Msg.MSG_AFMOTOR_STEPPER_ONESTEP,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "stepper1" },
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
    "output": "Number",
    "inputsInline": true,
    "colour": 310,
    "tooltip": Blockly.Msg.TOOLTIP_AFMOTOR_STEPPER_ONESTEP,
    "helpUrl": ""
  },
{
    "type": "afmotor_stepper_release",
    "message0": Blockly.Msg.MSG_AFMOTOR_STEPPER_RELEASE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "stepper1" }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": 310,
    "tooltip": Blockly.Msg.TOOLTIP_AFMOTOR_STEPPER_RELEASE,
    "helpUrl": ""
  },
{
    "type": "afmotor_servo_create",
    "message0": Blockly.Msg.MSG_AFMOTOR_SERVO_CREATE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "servo1" },
      { "type": "field_dropdown", "name": "SERVO", "options": [
        ["1", "1"], ["2", "2"]
      ]}
    ],
    "previousStatement": null,
    "nextStatement": null,
    "inputsInline": true,
    "colour": 310,
    "tooltip": Blockly.Msg.TOOLTIP_AFMOTOR_SERVO_CREATE,
    "helpUrl": ""
  },
{
    "type": "afmotor_servo_write",
    "message0": Blockly.Msg.MSG_AFMOTOR_SERVO_WRITE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "servo1" },
      { "type": "field_number", "name": "ANGLE", "value": 90, "min": 0, "max": 180 }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": 310,
    "tooltip": Blockly.Msg.TOOLTIP_AFMOTOR_SERVO_WRITE,
    "helpUrl": ""
  },
{
    "type": "afmotor_servo_write_us",
    "message0": Blockly.Msg.MSG_AFMOTOR_SERVO_WRITE_US,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "servo1" },
      { "type": "field_number", "name": "US", "value": 1500, "min": 500, "max": 2500 }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": 310,
    "tooltip": Blockly.Msg.TOOLTIP_AFMOTOR_SERVO_WRITE_US,
    "helpUrl": ""
  },
{
    "type": "afmotor_servo_read",
    "message0": Blockly.Msg.MSG_AFMOTOR_SERVO_READ,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "servo1" }
    ],
    "output": "Number",
    "inputsInline": true,
    "colour": 310,
    "tooltip": Blockly.Msg.TOOLTIP_AFMOTOR_SERVO_READ,
    "helpUrl": ""
  },
{
    "type": "afmotor_servo_detach",
    "message0": Blockly.Msg.MSG_AFMOTOR_SERVO_DETACH,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "servo1" }
    ],
    "inputsInline": true,
    "previousStatement": null,
    "nextStatement": null,
    "colour": 310,
    "tooltip": Blockly.Msg.TOOLTIP_AFMOTOR_SERVO_DETACH,
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
// ── afmotor_stepper_onestep ───────────────────
// Devuelve uint8_t: la posición tras el paso.
cppGenerator.forBlock['afmotor_stepper_onestep'] = function(block) {
  const name = block.getFieldValue('NAME') || 'stepper1';
  const dir = block.getFieldValue('DIR');
  const style = block.getFieldValue('STYLE');
  return [name + '.onestep(' + dir + ', ' + style + ')', cppGenerator.ORDER_ATOMIC];
};
// ── afmotor_stepper_release ───────────────────
cppGenerator.forBlock['afmotor_stepper_release'] = function(block) {
  const name = block.getFieldValue('NAME') || 'stepper1';
  return name + '.release();\n';
};
// ── Servo del shield ──────────────────────────
// El shield no tiene electrónica de servo: la señal de la bornera SERVO_1
// llega al pin 9 y la de SERVO_2 al pin 10. Se controla con la librería
// Servo, cuyo #include y declaración emite generateArduinoCode.
const AFMOTOR_SERVO_PINES = { '1': '9', '2': '10' };

cppGenerator.forBlock['afmotor_servo_create'] = function(block) {
  const name = (block.getFieldValue('NAME') || 'servo1').trim();
  const pin = AFMOTOR_SERVO_PINES[block.getFieldValue('SERVO')] || '9';
  return name + '.attach(' + pin + ');\n';
};
// ── afmotor_servo_write ───────────────────────
cppGenerator.forBlock['afmotor_servo_write'] = function(block) {
  const name = (block.getFieldValue('NAME') || 'servo1').trim();
  const angle = block.getFieldValue('ANGLE');
  return name + '.write(' + angle + ');\n';
};
// ── afmotor_servo_write_us ────────────────────
cppGenerator.forBlock['afmotor_servo_write_us'] = function(block) {
  const name = (block.getFieldValue('NAME') || 'servo1').trim();
  const us = block.getFieldValue('US');
  return name + '.writeMicroseconds(' + us + ');\n';
};
// ── afmotor_servo_read ────────────────────────
cppGenerator.forBlock['afmotor_servo_read'] = function(block) {
  const name = (block.getFieldValue('NAME') || 'servo1').trim();
  return [name + '.read()', cppGenerator.ORDER_ATOMIC];
};
// ── afmotor_servo_detach ──────────────────────
cppGenerator.forBlock['afmotor_servo_detach'] = function(block) {
  const name = (block.getFieldValue('NAME') || 'servo1').trim();
  return name + '.detach();\n';
};
}
