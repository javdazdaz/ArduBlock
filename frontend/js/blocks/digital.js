import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg
/**
 * ArduBlock — Bloques: digital
 */

export const blocks = [
{
    "type": "pin_mode_basic",
    "message0": Blockly.Msg.MSG_PIN_MODE,
    "args0": [
      { "type": "field_dropdown", "name": "PIN",
        "options": [
          ["0", "0"], ["1", "1"],
          ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"],
          ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"],
          ["10", "10"], ["11", "11"], ["12", "12"], ["13", "13"],
          ["A0", "A0"], ["A1", "A1"], ["A2", "A2"],
          ["A3", "A3"], ["A4", "A4"], ["A5", "A5"]
        ]
      },
      { "type": "field_dropdown", "name": "MODE",
        "options": [
          [Blockly.Msg.INPUT, "INPUT"],
          [Blockly.Msg.OUTPUT, "OUTPUT"],
          [Blockly.Msg.INPUT_PULLUP, "INPUT_PULLUP"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 60,
    "tooltip": "Elige el pin de una lista y configura si es de entrada o salida.",
    "helpUrl": ""
  },
{
    "type": "pin_mode_advanced",
    "message0": Blockly.Msg.MSG_PIN_MODE,
    "args0": [
      { "type": "input_value", "name": "PIN", "check": "Number" },
      { "type": "field_dropdown", "name": "MODE",
        "options": [
          [Blockly.Msg.INPUT, "INPUT"],
          [Blockly.Msg.OUTPUT, "OUTPUT"],
          [Blockly.Msg.INPUT_PULLUP, "INPUT_PULLUP"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 60,
    "tooltip": "El pin puede ser una variable o expresión matemática. Útil para configurar pines desde un bucle.",
    "helpUrl": ""
  },
{
    "type": "digital_write_basic",
    "message0": Blockly.Msg.MSG_DIGITAL_WRITE,
    "args0": [
      { "type": "field_dropdown", "name": "PIN",
        "options": [
          ["0", "0"], ["1", "1"],
          ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"],
          ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"],
          ["10", "10"], ["11", "11"], ["12", "12"], ["13", "13"],
          ["A0", "A0"], ["A1", "A1"], ["A2", "A2"],
          ["A3", "A3"], ["A4", "A4"], ["A5", "A5"]
        ]
      },
      { "type": "field_dropdown", "name": "VALUE",
        "options": [
          ["HIGH", "HIGH"],
          ["LOW", "LOW"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 60,
    "tooltip": "Elige el pin de una lista y escribe HIGH (encendido) o LOW (apagado).",
    "helpUrl": ""
  },
{
    "type": "digital_write_advanced",
    "message0": Blockly.Msg.MSG_DIGITAL_WRITE,
    "args0": [
      { "type": "input_value", "name": "PIN", "check": "Number" },
      { "type": "field_dropdown", "name": "VALUE",
        "options": [
          ["HIGH", "HIGH"],
          ["LOW", "LOW"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 60,
    "tooltip": "El pin puede ser una variable o expresión. Útil para controlar pines desde un bucle o arreglo.",
    "helpUrl": ""
  },
{
    "type": "digital_read_basic",
    "message0": Blockly.Msg.MSG_DIGITAL_READ,
    "args0": [
      { "type": "field_dropdown", "name": "PIN",
        "options": [
          ["0", "0"], ["1", "1"],
          ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"],
          ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"],
          ["10", "10"], ["11", "11"], ["12", "12"], ["13", "13"],
          ["A0", "A0"], ["A1", "A1"], ["A2", "A2"],
          ["A3", "A3"], ["A4", "A4"], ["A5", "A5"]
        ]
      }
    ],
    "output": "Boolean",
    "colour": 60,
    "tooltip": "Elige el pin de una lista y lee su valor digital (HIGH o LOW).",
    "helpUrl": ""
  },
{
    "type": "digital_read_advanced",
    "message0": Blockly.Msg.MSG_DIGITAL_READ,
    "args0": [
      { "type": "input_value", "name": "PIN", "check": "Number" }
    ],
    "output": "Boolean",
    "colour": 60,
    "tooltip": "El pin puede ser una variable o expresión. Útil para leer pines desde un bucle.",
    "helpUrl": ""
  }
];

export function registerGenerators(cppGenerator) {
// ── pin_mode_basic (N1) ──────────────────────
cppGenerator.forBlock['pin_mode_basic'] = function(block) {
  const pin  = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');
  return 'pinMode(' + pin + ', ' + mode + ');\n';
};
// ── pin_mode_advanced (N3) ───────────────────
cppGenerator.forBlock['pin_mode_advanced'] = function(block) {
  const pin  = cppGenerator.valueToCode(block, 'PIN', cppGenerator.ORDER_ATOMIC) || '0';
  const mode = block.getFieldValue('MODE');
  return 'pinMode(' + pin + ', ' + mode + ');\n';
};
// ── digital_write_basic (N1) ──────────────────
cppGenerator.forBlock['digital_write_basic'] = function(block) {
  const pin   = block.getFieldValue('PIN');
  const value = block.getFieldValue('VALUE');
  return 'digitalWrite(' + pin + ', ' + value + ');\n';
};
// ── digital_write_advanced (N3) ───────────────
cppGenerator.forBlock['digital_write_advanced'] = function(block) {
  const pin   = cppGenerator.valueToCode(block, 'PIN', cppGenerator.ORDER_ATOMIC) || '0';
  const value = block.getFieldValue('VALUE');
  return 'digitalWrite(' + pin + ', ' + value + ');\n';
};
// ── digital_read_basic (N1) ───────────────────
cppGenerator.forBlock['digital_read_basic'] = function(block) {
  const pin = block.getFieldValue('PIN');
  return ['digitalRead(' + pin + ')', cppGenerator.ORDER_ATOMIC];
};
// ── digital_read_advanced (N3) ────────────────
cppGenerator.forBlock['digital_read_advanced'] = function(block) {
  const pin = cppGenerator.valueToCode(block, 'PIN', cppGenerator.ORDER_ATOMIC) || '0';
  return ['digitalRead(' + pin + ')', cppGenerator.ORDER_ATOMIC];
};
}
