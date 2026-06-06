import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg
/**
 * ArduBlock — Bloques: tiempo
 */

export const blocks = [
{
    "type": "delay_ms",
    "message0": Blockly.Msg.MSG_DELAY_MS,
    "args0": [
      { "type": "field_number", "name": "MS", "value": 1000, "min": 0 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 270,
    "tooltip": Blockly.Msg.TOOLTIP_DELAY_MS,
    "helpUrl": ""
  },
{
    "type": "delay_ms_basic",
    "message0": Blockly.Msg.MSG_DELAY_MS,
    "args0": [
      { "type": "field_dropdown", "name": "MS",
        "options": [
          ["100 ms", "100"],
          ["250 ms", "250"],
          ["500 ms", "500"],
          ["1000 ms (1 s)", "1000"],
          ["2000 ms (2 s)", "2000"],
          ["5000 ms (5 s)", "5000"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 270,
    "tooltip": "Nivel Básico. Elige un tiempo de espera de la lista. En Intermedio puedes escribir cualquier valor.",
    "helpUrl": ""
  },
{
    "type": "delay_ms_advanced",
    "message0": Blockly.Msg.MSG_DELAY_MS,
    "args0": [
      { "type": "input_value", "name": "MS", "check": "Number" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 270,
    "tooltip": "Nivel Avanzado. El tiempo de espera puede ser una variable o expresión. Permite delays dinámicos.",
    "helpUrl": ""
  },
{
    "type": "millis",
    "message0": Blockly.Msg.MSG_MILLIS,
    "output": "Number",
    "colour": 270,
    "tooltip": Blockly.Msg.TOOLTIP_MILLIS,
    "helpUrl": ""
  },
{
    "type": "delay_microseconds",
    "message0": Blockly.Msg.MSG_DELAY_US,
    "args0": [
      { "type": "field_number", "name": "US", "value": 10, "min": 0 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 270,
    "tooltip": Blockly.Msg.TOOLTIP_DELAY_US,
    "helpUrl": ""
  }
];

export function registerGenerators(cppGenerator) {
// ── delay_ms ─────────────────────────────────
cppGenerator.forBlock['delay_ms'] = function(block) {
  const ms = block.getFieldValue('MS');
  return 'delay(' + ms + ');\n';
};
// ── delay_ms_basic (N1) ───────────────────────
cppGenerator.forBlock['delay_ms_basic'] = function(block) {
  const ms = block.getFieldValue('MS');
  return 'delay(' + ms + ');\n';
};
// ── delay_ms_advanced (N3) ────────────────────
cppGenerator.forBlock['delay_ms_advanced'] = function(block) {
  const ms = cppGenerator.valueToCode(block, 'MS', cppGenerator.ORDER_ATOMIC) || '0';
  return 'delay(' + ms + ');\n';
};
// ── millis ───────────────────────────────────
cppGenerator.forBlock['millis'] = function(_block) {
  return ['millis()', cppGenerator.ORDER_ATOMIC];
};
// ── delay_microseconds ───────────────────────
cppGenerator.forBlock['delay_microseconds'] = function(block) {
  const us = block.getFieldValue('US');
  return 'delayMicroseconds(' + us + ');\n';
};
}
