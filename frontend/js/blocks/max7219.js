import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg

/**
 * ArduBlock — Bloques: Matriz LED MAX7219 8×8
 *
 * Usa la librería LedControl (SPI bit-bang, pines configurables).
 * Compatible con todas las placas Arduino (Uno, Nano, Mega, R3, R4, ESP32...).
 * Soporta múltiples módulos en daisy-chain (1-8).
 */

// ═══ Frames predefinidos 8×8 (row-major, un byte por fila) ═══
// Cada frame es un array de 8 bytes, byte[0]=fila superior (row 0)
export const MAX7219_FRAMES = {
  heart: [
    0b01100110,
    0b11111111,
    0b11111111,
    0b11111111,
    0b01111110,
    0b00111100,
    0b00011000,
    0b00000000,
  ],
  smiley: [
    0b00111100,
    0b01000010,
    0b10100101,
    0b10000001,
    0b10100101,
    0b10011001,
    0b01000010,
    0b00111100,
  ],
  sad: [
    0b00111100,
    0b01000010,
    0b10100101,
    0b10000001,
    0b10011001,
    0b10100101,
    0b01000010,
    0b00111100,
  ],
  arrow_up: [
    0b00011000,
    0b00111100,
    0b01111110,
    0b11111111,
    0b00011000,
    0b00011000,
    0b00011000,
    0b00000000,
  ],
  arrow_down: [
    0b00011000,
    0b00011000,
    0b00011000,
    0b11111111,
    0b01111110,
    0b00111100,
    0b00011000,
    0b00000000,
  ],
  arrow_left: [
    0b00010000,
    0b00110000,
    0b01111111,
    0b11111111,
    0b01111111,
    0b00110000,
    0b00010000,
    0b00000000,
  ],
  arrow_right: [
    0b00001000,
    0b00001100,
    0b11111110,
    0b11111111,
    0b11111110,
    0b00001100,
    0b00001000,
    0b00000000,
  ],
  check: [
    0b00000000,
    0b00000001,
    0b00000011,
    0b10000110,
    0b11001100,
    0b01111000,
    0b00110000,
    0b00000000,
  ],
  cross: [
    0b10000001,
    0b01000010,
    0b00100100,
    0b00011000,
    0b00011000,
    0b00100100,
    0b01000010,
    0b10000001,
  ],
  star: [
    0b00011000,
    0b00011000,
    0b11111111,
    0b01111110,
    0b00111100,
    0b01111110,
    0b10100101,
    0b00000000,
  ],
  square: [
    0b11111111,
    0b10000001,
    0b10000001,
    0b10000001,
    0b10000001,
    0b10000001,
    0b10000001,
    0b11111111,
  ],
  clear: [
    0b00000000,
    0b00000000,
    0b00000000,
    0b00000000,
    0b00000000,
    0b00000000,
    0b00000000,
    0b00000000,
  ],
  all: [
    0b11111111,
    0b11111111,
    0b11111111,
    0b11111111,
    0b11111111,
    0b11111111,
    0b11111111,
    0b11111111,
  ],
};

// ═══ Bloques ═══════════════════════════════════

export const blocks = [
  // ── max7219_create ─────────────────────────
  {
    type: 'max7219_create',
    message0: Blockly.Msg.MSG_MAX7219_CREATE,
    args0: [
      { type: 'field_number', name: 'DIN', value: 12, min: 0, max: 255 },
      { type: 'field_number', name: 'CS', value: 10, min: 0, max: 255 },
      { type: 'field_number', name: 'CLK', value: 11, min: 0, max: 255 },
      { type: 'field_number', name: 'NUM', value: 1, min: 1, max: 8 },
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 35,
    tooltip: Blockly.Msg.TOOLTIP_MAX7219_CREATE,
    helpUrl: '',
  },
  // ── max7219_set_led ────────────────────────
  {
    type: 'max7219_set_led',
    message0: Blockly.Msg.MSG_MAX7219_SET_LED,
    args0: [
      { type: 'field_number', name: 'MODULE', value: 0, min: 0, max: 7 },
      { type: 'field_number', name: 'ROW', value: 0, min: 0, max: 7 },
      { type: 'field_number', name: 'COL', value: 0, min: 0, max: 7 },
      { type: 'field_checkbox', name: 'STATE', checked: true },
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 35,
    tooltip: Blockly.Msg.TOOLTIP_MAX7219_SET_LED,
    helpUrl: '',
  },
  // ── max7219_clear ──────────────────────────
  {
    type: 'max7219_clear',
    message0: Blockly.Msg.MSG_MAX7219_CLEAR,
    args0: [
      { type: 'field_number', name: 'MODULE', value: 0, min: 0, max: 7 },
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 35,
    tooltip: Blockly.Msg.TOOLTIP_MAX7219_CLEAR,
    helpUrl: '',
  },
  // ── max7219_set_brightness ─────────────────
  {
    type: 'max7219_set_brightness',
    message0: Blockly.Msg.MSG_MAX7219_BRIGHTNESS,
    args0: [
      { type: 'field_number', name: 'MODULE', value: 0, min: 0, max: 7 },
      { type: 'field_number', name: 'INTENSITY', value: 8, min: 0, max: 15 },
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 35,
    tooltip: Blockly.Msg.TOOLTIP_MAX7219_BRIGHTNESS,
    helpUrl: '',
  },
  // ── max7219_draw_frame ─────────────────────
  {
    type: 'max7219_draw_frame',
    message0: Blockly.Msg.MSG_MAX7219_DRAW_FRAME,
    args0: [
      { type: 'field_number', name: 'MODULE', value: 0, min: 0, max: 7 },
      {
        type: 'field_dropdown',
        name: 'FRAME',
        options: function() {
          const opts = [
            ['\u2764 ' + Blockly.Msg.OPT_MAX7219_HEART, 'heart'],
            ['\u263A ' + Blockly.Msg.OPT_MAX7219_SMILEY, 'smiley'],
            ['\u2639 ' + Blockly.Msg.OPT_MAX7219_SAD, 'sad'],
            ['\u2191 ' + Blockly.Msg.OPT_MAX7219_ARROW_UP, 'arrow_up'],
            ['\u2193 ' + Blockly.Msg.OPT_MAX7219_ARROW_DOWN, 'arrow_down'],
            ['\u2190 ' + Blockly.Msg.OPT_MAX7219_ARROW_LEFT, 'arrow_left'],
            ['\u2192 ' + Blockly.Msg.OPT_MAX7219_ARROW_RIGHT, 'arrow_right'],
            ['\u2713 ' + Blockly.Msg.OPT_MAX7219_CHECK, 'check'],
            ['\u2717 ' + Blockly.Msg.OPT_MAX7219_CROSS, 'cross'],
            ['\u2605 ' + Blockly.Msg.OPT_MAX7219_STAR, 'star'],
            ['\u25A0 ' + Blockly.Msg.OPT_MAX7219_SQUARE, 'square'],
            ['\u25A1 ' + Blockly.Msg.OPT_MAX7219_ALL, 'all'],
          ];
          try {
            const saved = JSON.parse(localStorage.getItem('ardublock:max7219-frames') || '{}');
            const names = Object.keys(saved).sort();
            if (names.length > 0) {
              opts.push(['──────────', '']);
              for (const name of names) {
                opts.push(['📁 ' + name, name]);
              }
            }
          } catch (_) { /* ignore */ }
          return opts;
        },
      },
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 35,
    tooltip: Blockly.Msg.TOOLTIP_MAX7219_DRAW_FRAME,
    helpUrl: '',
  },
];

// ═══ Generadores ═══════════════════════════════

export function registerGenerators(cppGenerator) {

  // ── max7219_create ─────────────────────────
  cppGenerator.forBlock['max7219_create'] = function(block) {
    cppGenerator._max7219Used = true;
    const din = Number(block.getFieldValue('DIN')) || 12;
    const cs  = Number(block.getFieldValue('CS'))  || 10;
    const clk = Number(block.getFieldValue('CLK')) || 11;
    const num = Number(block.getFieldValue('NUM')) || 1;

    if (!cppGenerator._max7219Configs) cppGenerator._max7219Configs = [];
    // Guardar la config para emitir en scaffold
    cppGenerator._max7219Configs.push({ din, cs, clk, num });

    // Generar init en setup
    let code = '';
    for (let i = 0; i < num; i++) {
      code += 'lc.shutdown(' + i + ', false);  // despertar módulo ' + i + '\n';
      code += 'lc.setIntensity(' + i + ', 8);  // brillo medio\n';
    }
    code += 'lc.clearDisplay(0);\n';
    return code;
  };

  // ── max7219_set_led ────────────────────────
  cppGenerator.forBlock['max7219_set_led'] = function(block) {
    cppGenerator._max7219Used = true;
    const module = Number(block.getFieldValue('MODULE')) || 0;
    const row    = Number(block.getFieldValue('ROW'))    || 0;
    const col    = Number(block.getFieldValue('COL'))    || 0;
    const state  = block.getFieldValue('STATE') === 'TRUE';
    return 'lc.setLed(' + module + ', ' + row + ', ' + col + ', ' + state + ');\n';
  };

  // ── max7219_clear ──────────────────────────
  cppGenerator.forBlock['max7219_clear'] = function(block) {
    cppGenerator._max7219Used = true;
    const module = Number(block.getFieldValue('MODULE')) || 0;
    return 'lc.clearDisplay(' + module + ');\n';
  };

  // ── max7219_set_brightness ─────────────────
  cppGenerator.forBlock['max7219_set_brightness'] = function(block) {
    cppGenerator._max7219Used = true;
    const module    = Number(block.getFieldValue('MODULE'))    || 0;
    const intensity = Number(block.getFieldValue('INTENSITY')) || 8;
    return 'lc.setIntensity(' + module + ', ' + intensity + ');\n';
  };

  // ── max7219_draw_frame ─────────────────────
  cppGenerator.forBlock['max7219_draw_frame'] = function(block) {
    cppGenerator._max7219Used = true;
    const module = Number(block.getFieldValue('MODULE')) || 0;
    const frame  = block.getFieldValue('FRAME') || 'heart';

    if (!cppGenerator._max7219FrameNames) {
      cppGenerator._max7219FrameNames = new Set();
    }
    cppGenerator._max7219FrameNames.add(frame);

    let code = '// dibujar frame: ' + frame + '\n';
    for (let row = 0; row < 8; row++) {
      code += 'lc.setRow(' + module + ', ' + row + ', frame_' + frame + '[' + row + ']);\n';
    }
    return code;
  };
}
