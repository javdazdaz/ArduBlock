import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg
/**
 * ArduBlock — Bloques: avanzada
 */

export const blocks = [
{
    "type": "tone_output",
    "message0": Blockly.Msg.MSG_TONE_OUTPUT,
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 8, "min": 0, "max": 54 },
      { "type": "field_number", "name": "FREQ", "value": 440, "min": 31, "max": 65535 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": Blockly.Msg.TOOLTIP_TONE_OUTPUT,
    "helpUrl": ""
  },
{
    "type": "tone_output_basic",
    "message0": Blockly.Msg.MSG_TONE_OUTPUT,
    "args0": [
      { "type": "field_dropdown", "name": "PIN",
        "options": [
          ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"],
          ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"],
          ["10", "10"], ["11", "11"], ["12", "12"], ["13", "13"]
        ]
      },
      { "type": "field_dropdown", "name": "FREQ",
        "options": [
          ["DO 262 Hz", "262"],
          ["RE 294 Hz", "294"],
          ["MI 330 Hz", "330"],
          ["FA 349 Hz", "349"],
          ["SOL 392 Hz", "392"],
          ["LA 440 Hz", "440"],
          ["SI 494 Hz", "494"],
          ["DO 523 Hz", "523"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": "Nivel Básico. Elige el pin y la frecuencia musical de listas. En Intermedio puedes escribir valores numéricos.",
    "helpUrl": ""
  },
{
    "type": "tone_output_advanced",
    "message0": Blockly.Msg.MSG_TONE_OUTPUT,
    "args0": [
      { "type": "input_value", "name": "PIN", "check": "Number" },
      { "type": "input_value", "name": "FREQ", "check": "Number" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": "Nivel Avanzado. El pin y la frecuencia pueden ser variables o expresiones. Permite melodías dinámicas desde arreglos.",
    "helpUrl": ""
  },
{
    "type": "tone_duration",
    "message0": Blockly.Msg.MSG_TONE_DURATION,
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 8, "min": 0, "max": 54 },
      { "type": "input_value", "name": "FREQ", "check": "Number",
        "shadow": { "type": "math_number", "fields": { "NUM": 440 } } },
      { "type": "input_value", "name": "DURATION", "check": "Number",
        "shadow": { "type": "math_number", "fields": { "NUM": 500 } } }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": Blockly.Msg.TOOLTIP_TONE_DURATION,
    "helpUrl": ""
  },
{
    "type": "tone_duration_advanced",
    "message0": Blockly.Msg.MSG_TONE_DURATION,
    "args0": [
      { "type": "input_value", "name": "PIN", "check": "Number" },
      { "type": "input_value", "name": "FREQ", "check": "Number",
        "shadow": { "type": "math_number", "fields": { "NUM": 440 } } },
      { "type": "input_value", "name": "DURATION", "check": "Number",
        "shadow": { "type": "math_number", "fields": { "NUM": 500 } } }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": "Nivel Avanzado. El pin, frecuencia y duración pueden ser variables o expresiones. Permite melodías completamente dinámicas.",
    "helpUrl": ""
  },
{
    "type": "no_tone_output",
    "message0": Blockly.Msg.MSG_NO_TONE_OUTPUT,
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 8, "min": 0, "max": 54 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": Blockly.Msg.TOOLTIP_NO_TONE_OUTPUT,
    "helpUrl": ""
  },
{
    "type": "no_tone_output_advanced",
    "message0": Blockly.Msg.MSG_NO_TONE_OUTPUT,
    "args0": [
      { "type": "input_value", "name": "PIN", "check": "Number" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": "Nivel Avanzado. El pin puede ser una variable o expresión. Permite controlar el pin de tono dinámicamente.",
    "helpUrl": ""
  },
{
    "type": "pulse_in",
    "message0": Blockly.Msg.MSG_PULSE_IN,
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 7, "min": 0, "max": 54 },
      { "type": "field_dropdown", "name": "VALUE", "options": [["HIGH", "HIGH"], ["LOW", "LOW"]] },
      { "type": "field_number", "name": "TIMEOUT", "value": 1000000, "min": 1 }
    ],
    "output": "Number",
    "colour": 180,
    "tooltip": Blockly.Msg.TOOLTIP_PULSE_IN,
    "helpUrl": ""
  },
{
    "type": "pulse_in_advanced",
    "message0": Blockly.Msg.MSG_PULSE_IN,
    "args0": [
      { "type": "input_value", "name": "PIN", "check": "Number" },
      { "type": "field_dropdown", "name": "VALUE", "options": [["HIGH", "HIGH"], ["LOW", "LOW"]] },
      { "type": "input_value", "name": "TIMEOUT", "check": "Number" }
    ],
    "output": "Number",
    "colour": 180,
    "tooltip": "Nivel Avanzado. El pin y el timeout pueden ser variables o expresiones. Permite medición de pulsos con parámetros dinámicos.",
    "helpUrl": ""
  },
{
    "type": "pulse_in_basic",
    "message0": Blockly.Msg.MSG_PULSE_IN,
    "args0": [
      { "type": "field_dropdown", "name": "PIN",
        "options": [
          ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"],
          ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"],
          ["10", "10"], ["11", "11"], ["12", "12"], ["13", "13"]
        ]
      },
      { "type": "field_dropdown", "name": "VALUE", "options": [["HIGH", "HIGH"], ["LOW", "LOW"]] },
      { "type": "field_number", "name": "TIMEOUT", "value": 1000000, "min": 1 }
    ],
    "output": "Number",
    "colour": 180,
    "tooltip": "Nivel Básico. Elige el pin de una lista. En Intermedio puedes escribir el número.",
    "helpUrl": ""
  },
{
    "type": "attach_interrupt",
    "message0": Blockly.Msg.MSG_ATTACH_INTERRUPT,
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 2, "min": 0, "max": 54 },
      { "type": "field_dropdown", "name": "MODE", "options": [
        ["LOW", "LOW"], ["CHANGE", "CHANGE"], ["RISING", "RISING"], ["FALLING", "FALLING"]
      ]},
      { "type": "input_dummy" },
      { "type": "input_statement", "name": "BODY" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": Blockly.Msg.TOOLTIP_ATTACH_INTERRUPT,
    "helpUrl": ""
  },
{
    "type": "attach_interrupt_advanced",
    "message0": Blockly.Msg.MSG_ATTACH_INTERRUPT,
    "args0": [
      { "type": "input_value", "name": "PIN", "check": "Number" },
      { "type": "field_dropdown", "name": "MODE", "options": [
        ["LOW", "LOW"], ["CHANGE", "CHANGE"], ["RISING", "RISING"], ["FALLING", "FALLING"]
      ]},
      { "type": "input_dummy" },
      { "type": "input_statement", "name": "BODY" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": "Nivel Avanzado. El pin de interrupción puede ser una variable. Permite configurar interrupciones en pines dinámicos.",
    "helpUrl": ""
  }
];

export function registerGenerators(cppGenerator) {
// ── tone_output ───────────────────────────────
cppGenerator.forBlock['tone_output'] = function(block) {
  const pin  = block.getFieldValue('PIN');
  const freq = block.getFieldValue('FREQ');
  return 'tone(' + pin + ', ' + freq + ');\n';
};
// ── tone_output_basic (N1) ────────────────────
cppGenerator.forBlock['tone_output_basic'] = function(block) {
  const pin  = block.getFieldValue('PIN');
  const freq = block.getFieldValue('FREQ');
  return 'tone(' + pin + ', ' + freq + ');\n';
};
// ── tone_output_advanced (N3) ─────────────────
cppGenerator.forBlock['tone_output_advanced'] = function(block) {
  const pin  = cppGenerator.valueToCode(block, 'PIN', cppGenerator.ORDER_ATOMIC) || '0';
  const freq = cppGenerator.valueToCode(block, 'FREQ', cppGenerator.ORDER_ATOMIC) || '440';
  return 'tone(' + pin + ', ' + freq + ');\n';
};
// ── tone_duration ─────────────────────────────
cppGenerator.forBlock['tone_duration'] = function(block) {
  const pin  = block.getFieldValue('PIN');
  const freq = cppGenerator.valueToCode(block, 'FREQ',
    cppGenerator.ORDER_ATOMIC) || '440';
  const dur  = cppGenerator.valueToCode(block, 'DURATION',
    cppGenerator.ORDER_ATOMIC) || '500';
  return 'tone(' + pin + ', ' + freq + ', ' + dur + ');\n';
};
// ── tone_duration_advanced (N3) ───────────────
cppGenerator.forBlock['tone_duration_advanced'] = function(block) {
  const pin  = cppGenerator.valueToCode(block, 'PIN', cppGenerator.ORDER_ATOMIC) || '8';
  const freq = cppGenerator.valueToCode(block, 'FREQ',
    cppGenerator.ORDER_ATOMIC) || '440';
  const dur  = cppGenerator.valueToCode(block, 'DURATION',
    cppGenerator.ORDER_ATOMIC) || '500';
  return 'tone(' + pin + ', ' + freq + ', ' + dur + ');\n';
};
// ── no_tone_output ────────────────────────────
cppGenerator.forBlock['no_tone_output'] = function(block) {
  const pin = block.getFieldValue('PIN');
  return 'noTone(' + pin + ');\n';
};
// ── no_tone_output_advanced (N3) ─────────────
cppGenerator.forBlock['no_tone_output_advanced'] = function(block) {
  const pin = cppGenerator.valueToCode(block, 'PIN', cppGenerator.ORDER_ATOMIC) || '8';
  return 'noTone(' + pin + ');\n';
};
// ── pulse_in (expression) ─────────────────────
cppGenerator.forBlock['pulse_in'] = function(block) {
  const pin     = block.getFieldValue('PIN');
  const value   = block.getFieldValue('VALUE');
  const timeout = block.getFieldValue('TIMEOUT');
  return ['pulseIn(' + pin + ', ' + value + ', ' + timeout + ')', cppGenerator.ORDER_ATOMIC];
};
// ── pulse_in_advanced (N3) ────────────────────
cppGenerator.forBlock['pulse_in_advanced'] = function(block) {
  const pin     = cppGenerator.valueToCode(block, 'PIN', cppGenerator.ORDER_ATOMIC) || '7';
  const value   = block.getFieldValue('VALUE');
  const timeout = cppGenerator.valueToCode(block, 'TIMEOUT', cppGenerator.ORDER_ATOMIC) || '1000000';
  return ['pulseIn(' + pin + ', ' + value + ', ' + timeout + ')', cppGenerator.ORDER_ATOMIC];
};
// ── pulse_in_basic (N1) ───────────────────────
cppGenerator.forBlock['pulse_in_basic'] = function(block) {
  const pin     = block.getFieldValue('PIN');
  const value   = block.getFieldValue('VALUE');
  const timeout = block.getFieldValue('TIMEOUT');
  return ['pulseIn(' + pin + ', ' + value + ', ' + timeout + ')', cppGenerator.ORDER_ATOMIC];
};
// Genera attachInterrupt() donde se coloca + guarda ISR para emitir como global
cppGenerator._isrBodies = [];

cppGenerator.forBlock['attach_interrupt'] = function(block) {
  const pin  = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');
  const body = cppGenerator.statementToCode(block, 'BODY') || '  // sin código\n';
  const isrName = 'isr_pin' + pin;

  // Guardar ISR para emitir en scope global
  cppGenerator._isrBodies.push({ name: isrName, pin: pin, body: body });

  return 'attachInterrupt(digitalPinToInterrupt(' + pin + '), ' + isrName + ', ' + mode + ');\n';
};
// ── attach_interrupt_advanced (N3) ─────────────
cppGenerator.forBlock['attach_interrupt_advanced'] = function(block) {
  const pin  = cppGenerator.valueToCode(block, 'PIN', cppGenerator.ORDER_ATOMIC) || '2';
  const mode = block.getFieldValue('MODE');
  const body = cppGenerator.statementToCode(block, 'BODY') || '  // sin código\n';
  const isrName = 'isr_pin' + pin;

  cppGenerator._isrBodies.push({ name: isrName, pin: pin, body: body });

  return 'attachInterrupt(digitalPinToInterrupt(' + pin + '), ' + isrName + ', ' + mode + ');\n';
};
}
