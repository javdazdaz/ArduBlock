import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg
/**
 * ArduBlock — Bloques: digital
 */

export const blocks = [
{
    "type": "pin_mode",
    "message0": Blockly.Msg.MSG_PIN_MODE,
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 13, "min": 0, "max": 54 },
      { "type": "field_dropdown", "name": "MODE",
        "options": [
          ["ENTRADA", "INPUT"],
          ["SALIDA", "OUTPUT"],
          ["ENTRADA_PULLUP", "INPUT_PULLUP"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 60,
    "tooltip": Blockly.Msg.TOOLTIP_PIN_MODE,
    "helpUrl": ""
  },
{
    "type": "pin_mode_basic",
    "message0": Blockly.Msg.MSG_PIN_MODE,
    "args0": [
      { "type": "field_dropdown", "name": "PIN",
        "options": [
          ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"],
          ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"],
          ["10", "10"], ["11", "11"], ["12", "12"], ["13", "13"],
          ["A0", "A0"], ["A1", "A1"], ["A2", "A2"],
          ["A3", "A3"], ["A4", "A4"], ["A5", "A5"]
        ]
      },
      { "type": "field_dropdown", "name": "MODE",
        "options": [
          ["ENTRADA", "INPUT"],
          ["SALIDA", "OUTPUT"],
          ["ENTRADA_PULLUP", "INPUT_PULLUP"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 60,
    "tooltip": "Nivel Básico. Elige el pin de una lista. En Intermedio puedes escribir el número y en Avanzado usar una variable.",
    "helpUrl": ""
  },
{
    "type": "pin_mode_advanced",
    "message0": Blockly.Msg.MSG_PIN_MODE,
    "args0": [
      { "type": "input_value", "name": "PIN", "check": "Number" },
      { "type": "field_dropdown", "name": "MODE",
        "options": [
          ["ENTRADA", "INPUT"],
          ["SALIDA", "OUTPUT"],
          ["ENTRADA_PULLUP", "INPUT_PULLUP"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 60,
    "tooltip": "Nivel Avanzado. El pin puede ser una variable o expresión matemática. Permite controlar pines dinámicamente desde un bucle o arreglo.",
    "helpUrl": ""
  },
{
    "type": "digital_write",
    "message0": Blockly.Msg.MSG_DIGITAL_WRITE,
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 13, "min": 0, "max": 54 },
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
    "tooltip": Blockly.Msg.TOOLTIP_DIGITAL_WRITE,
    "helpUrl": ""
  },
{
    "type": "digital_write_basic",
    "message0": Blockly.Msg.MSG_DIGITAL_WRITE,
    "args0": [
      { "type": "field_dropdown", "name": "PIN",
        "options": [
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
    "tooltip": "Nivel Básico. Elige el pin de una lista. En Intermedio puedes escribir el número y en Avanzado usar una variable.",
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
    "tooltip": "Nivel Avanzado. El pin puede ser una variable o expresión matemática. Permite controlar pines dinámicamente desde un bucle o arreglo.",
    "helpUrl": ""
  },
{
    "type": "digital_read",
    "message0": Blockly.Msg.MSG_DIGITAL_READ,
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 2, "min": 0, "max": 54 }
    ],
    "output": "Number",
    "colour": 60,
    "tooltip": Blockly.Msg.TOOLTIP_DIGITAL_READ,
    "helpUrl": ""
  },
{
    "type": "digital_read_basic",
    "message0": Blockly.Msg.MSG_DIGITAL_READ,
    "args0": [
      { "type": "field_dropdown", "name": "PIN",
        "options": [
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
    "tooltip": "Nivel Básico. Elige el pin de una lista. En Intermedio puedes escribir el número y en Avanzado usar una variable.",
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
    "tooltip": "Nivel Avanzado. El pin puede ser una variable o expresión. Permite leer pines dinámicamente desde un bucle.",
    "helpUrl": ""
  }
];

export function registerGenerators(cppGenerator) {
// ── pin_mode ────────────────────────────────
cppGenerator.forBlock['pin_mode'] = function(block) {
  const pin  = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');
  return 'pinMode(' + pin + ', ' + mode + ');\n';
};
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
// ── digital_write ────────────────────────────
cppGenerator.forBlock['digital_write'] = function(block) {
  const pin   = block.getFieldValue('PIN');
  const value = block.getFieldValue('VALUE');
  return 'digitalWrite(' + pin + ', ' + value + ');\n';
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
// ── digital_read ─────────────────────────────
cppGenerator.forBlock['digital_read'] = function(block) {
  const pin = block.getFieldValue('PIN');
  return ['digitalRead(' + pin + ')', cppGenerator.ORDER_ATOMIC];
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
