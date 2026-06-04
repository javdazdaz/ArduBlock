import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg
/**
 * ArduBlock — Bloques: lcd
 */

export const blocks = [
{
    "type": "lcd_create",
    "message0": Blockly.Msg.MSG_LCD_CREATE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "lcd" },
      { "type": "field_number", "name": "RS", "value": 12, "min": 0, "max": 54 },
      { "type": "field_number", "name": "EN", "value": 11, "min": 0, "max": 54 },
      { "type": "field_number", "name": "D4", "value": 5, "min": 0, "max": 54 },
      { "type": "field_number", "name": "D5", "value": 4, "min": 0, "max": 54 },
      { "type": "field_number", "name": "D6", "value": 3, "min": 0, "max": 54 },
      { "type": "field_number", "name": "D7", "value": 2, "min": 0, "max": 54 },
      { "type": "input_dummy" },
      { "type": "field_number", "name": "COLS", "value": 16, "min": 8, "max": 40 },
      { "type": "field_number", "name": "ROWS", "value": 2, "min": 1, "max": 4 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": Blockly.Msg.TOOLTIP_LCD_CREATE,
    "helpUrl": ""
  },
{
    "type": "lcd_print",
    "message0": Blockly.Msg.MSG_LCD_PRINT,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "lcd" },
      { "type": "input_value", "name": "TEXT", "check": ["String", "Number"] }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": Blockly.Msg.TOOLTIP_LCD_PRINT,
    "helpUrl": ""
  },
{
    "type": "lcd_set_cursor",
    "message0": Blockly.Msg.MSG_LCD_SET_CURSOR,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "lcd" },
      { "type": "field_number", "name": "COL", "value": 0, "min": 0 },
      { "type": "field_number", "name": "ROW", "value": 0, "min": 0 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": Blockly.Msg.TOOLTIP_LCD_SET_CURSOR,
    "helpUrl": ""
  },
{
    "type": "lcd_clear",
    "message0": Blockly.Msg.MSG_LCD_CLEAR,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "lcd" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": Blockly.Msg.TOOLTIP_LCD_CLEAR,
    "helpUrl": ""
  },
{
    "type": "lcd_i2c_create",
    "message0": Blockly.Msg.MSG_LCD_I2C_CREATE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "lcd" },
      { "type": "field_dropdown", "name": "ADDR", "options": [["0x27", "0x27"], ["0x3F", "0x3F"]] },
      { "type": "field_number", "name": "COLS", "value": 16, "min": 8, "max": 40 },
      { "type": "field_number", "name": "ROWS", "value": 2, "min": 1, "max": 4 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": Blockly.Msg.TOOLTIP_LCD_I2C_CREATE,
    "helpUrl": ""
  }
];

export function registerGenerators(cppGenerator) {
// ── lcd_create ─────────────────────────────────
cppGenerator._lcdInstances = [];
cppGenerator.forBlock['lcd_create'] = function(block) {
  const name = block.getFieldValue('NAME') || 'lcd';
  const rs = block.getFieldValue('RS');
  const en = block.getFieldValue('EN');
  const d4 = block.getFieldValue('D4');
  const d5 = block.getFieldValue('D5');
  const d6 = block.getFieldValue('D6');
  const d7 = block.getFieldValue('D7');
  const cols = block.getFieldValue('COLS');
  const rows = block.getFieldValue('ROWS');
  cppGenerator._lcdInstances.push({ name, rs, en, d4, d5, d6, d7, cols, rows });
  return name + '.begin(' + cols + ', ' + rows + ');\n';
};
// ── lcd_i2c_create ────────────────────────────
cppGenerator._lcdI2cInstances = [];
cppGenerator.forBlock['lcd_i2c_create'] = function(block) {
  const name = block.getFieldValue('NAME') || 'lcd';
  const addr = block.getFieldValue('ADDR');
  const cols = block.getFieldValue('COLS');
  const rows = block.getFieldValue('ROWS');
  cppGenerator._lcdI2cInstances.push({ name, addr, cols, rows });
  return name + '.init();\n  ' + name + '.backlight();\n';
};
// ── lcd_print ──────────────────────────────────
cppGenerator.forBlock['lcd_print'] = function(block) {
  const name = block.getFieldValue('NAME') || 'lcd';
  const text = cppGenerator.valueToCode(block, 'TEXT', cppGenerator.ORDER_NONE) || '""';
  return name + '.print(' + text + ');\n';
};
// ── lcd_set_cursor ─────────────────────────────
cppGenerator.forBlock['lcd_set_cursor'] = function(block) {
  const name = block.getFieldValue('NAME') || 'lcd';
  const col = block.getFieldValue('COL');
  const row = block.getFieldValue('ROW');
  return name + '.setCursor(' + col + ', ' + row + ');\n';
};
// ── lcd_clear ──────────────────────────────────
cppGenerator.forBlock['lcd_clear'] = function(block) {
  const name = block.getFieldValue('NAME') || 'lcd';
  return name + '.clear();\n';
};
}
