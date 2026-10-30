import * as Blockly from 'blockly';
import '../i18n.js';
import { OLED_ANIMATIONS, animacionesPropias } from '../oled-animations.js';

/**
 * ArduBlock — Bloques: OLED SSD1315 / SSD1306 (I2C, sin librerías gráficas)
 *
 * El sketch generado lleva su propio driver: tabla de inicio de 26 bytes,
 * búfer de 1024 bytes por páginas de 8 filas y volcado de las páginas sucias.
 * Es el mismo protocolo que el sketch Bad_Apple_Flash, probado en placa.
 */

// ── Tabla de inicio del controlador (SSD1315 y SSD1306 la aceptan) ──
const INIT_BYTES = [
  0xAE, 0xD5, 0x80, 0xA8, 0x3F, 0xD3, 0x00, 0x40, 0x8D, 0x14,
  0x20, 0x00, 0xA1, 0xC8, 0xDA, 0x12, 0x81, 0xCF, 0xD9, 0xF1,
  0xDB, 0x40, 0xA4, 0xA6, 0x2E, 0xAF,
];

/** Globals + funciones que acompañan a cualquier bloque OLED. */
export function oledDriverCode({ texto }) {
  let code = '';
  code += 'uint8_t oled_buf[1024];        // 8 páginas de 128 columnas\n';
  code += 'bool    oled_sucia[8];\n';
  code += 'uint8_t oled_dir = 0x3C;\n\n';

  code += 'void _oled_limpiar() {\n';
  code += '  for (uint16_t i = 0; i < 1024; i++) oled_buf[i] = 0;\n';
  code += '  for (uint8_t p = 0; p < 8; p++) oled_sucia[p] = true;\n';
  code += '}\n\n';

  code += 'void _oled_pagina(uint8_t p) {\n';
  code += '  Wire.beginTransmission(oled_dir);\n';
  code += '  Wire.write((uint8_t)0x00);\n';
  code += '  Wire.write((uint8_t)(0xB0 | p));\n';
  code += '  Wire.write((uint8_t)0x00);\n';
  code += '  Wire.write((uint8_t)0x10);\n';
  code += '  Wire.endTransmission();\n';
  code += '  Wire.beginTransmission(oled_dir);\n';
  code += '  Wire.write((uint8_t)0x40);\n';
  code += '  Wire.write(&oled_buf[p * 128], 128);\n';
  code += '  Wire.endTransmission();\n';
  code += '}\n\n';

  code += 'void _oled_volcar() {\n';
  code += '  for (uint8_t p = 0; p < 8; p++) {\n';
  code += '    if (oled_sucia[p]) { _oled_pagina(p); oled_sucia[p] = false; }\n';
  code += '  }\n';
  code += '}\n\n';

  code += 'void _oled_init(uint8_t dir, uint32_t reloj) {\n';
  code += '  static const uint8_t init[] = { ' + INIT_BYTES.map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(', ') + ' };\n';
  code += '  oled_dir = dir;\n';
  code += '  Wire.begin();\n';
  code += '  Wire.setClock(reloj);\n';
  code += '  Wire.beginTransmission(oled_dir);\n';
  code += '  Wire.write((uint8_t)0x00);\n';
  code += '  for (uint8_t i = 0; i < sizeof(init); i++) Wire.write(init[i]);\n';
  code += '  Wire.endTransmission();\n';
  code += '  _oled_limpiar();\n';
  code += '  _oled_volcar();\n';
  code += '}\n\n';

  code += 'void _oled_punto(int16_t x, int16_t y, bool encendido) {\n';
  code += '  if (x < 0 || x > 127 || y < 0 || y > 63) return;\n';
  code += '  uint8_t p = y >> 3;\n';
  code += '  uint8_t bit = 1 << (y & 7);\n';
  code += '  if (encendido) oled_buf[p * 128 + x] |= bit;\n';
  code += '  else oled_buf[p * 128 + x] &= ~bit;\n';
  code += '  oled_sucia[p] = true;\n';
  code += '}\n\n';

  if (texto) {
    code += '// Fuente 5x7 de dominio público (glcdfont), caracteres 32 a 126\n';
    code += 'const uint8_t _oled_font5x7[][5] PROGMEM = {\n';
    code += '  {0x00,0x00,0x00,0x00,0x00}, {0x00,0x00,0x5F,0x00,0x00}, {0x00,0x07,0x00,0x07,0x00},\n';
    code += '  {0x14,0x7F,0x14,0x7F,0x14}, {0x24,0x2A,0x7F,0x2A,0x12}, {0x23,0x13,0x08,0x64,0x62},\n';
    code += '  {0x36,0x49,0x56,0x20,0x50}, {0x00,0x08,0x07,0x03,0x00}, {0x00,0x1C,0x22,0x41,0x00},\n';
    code += '  {0x00,0x41,0x22,0x1C,0x00}, {0x2A,0x1C,0x7F,0x1C,0x2A}, {0x08,0x08,0x3E,0x08,0x08},\n';
    code += '  {0x00,0x80,0x70,0x30,0x00}, {0x08,0x08,0x08,0x08,0x08}, {0x00,0x00,0x60,0x60,0x00},\n';
    code += '  {0x20,0x10,0x08,0x04,0x02}, {0x3E,0x51,0x49,0x45,0x3E}, {0x00,0x42,0x7F,0x40,0x00},\n';
    code += '  {0x72,0x49,0x49,0x49,0x46}, {0x21,0x41,0x49,0x4D,0x33}, {0x18,0x14,0x12,0x7F,0x10},\n';
    code += '  {0x27,0x45,0x45,0x45,0x39}, {0x3C,0x4A,0x49,0x49,0x31}, {0x41,0x21,0x11,0x09,0x07},\n';
    code += '  {0x36,0x49,0x49,0x49,0x36}, {0x46,0x49,0x49,0x29,0x1E}, {0x00,0x00,0x14,0x00,0x00},\n';
    code += '  {0x00,0x40,0x34,0x00,0x00}, {0x00,0x08,0x14,0x22,0x41}, {0x14,0x14,0x14,0x14,0x14},\n';
    code += '  {0x00,0x41,0x22,0x14,0x08}, {0x02,0x01,0x59,0x09,0x06}, {0x3E,0x41,0x5D,0x59,0x4E},\n';
    code += '  {0x7C,0x12,0x11,0x12,0x7C}, {0x7F,0x49,0x49,0x49,0x36}, {0x3E,0x41,0x41,0x41,0x22},\n';
    code += '  {0x7F,0x41,0x41,0x41,0x3E}, {0x7F,0x49,0x49,0x49,0x41}, {0x7F,0x09,0x09,0x09,0x01},\n';
    code += '  {0x3E,0x41,0x41,0x51,0x73}, {0x7F,0x08,0x08,0x08,0x7F}, {0x00,0x41,0x7F,0x41,0x00},\n';
    code += '  {0x20,0x40,0x41,0x3F,0x01}, {0x7F,0x08,0x14,0x22,0x41}, {0x7F,0x40,0x40,0x40,0x40},\n';
    code += '  {0x7F,0x02,0x1C,0x02,0x7F}, {0x7F,0x04,0x08,0x10,0x7F}, {0x3E,0x41,0x41,0x41,0x3E},\n';
    code += '  {0x7F,0x09,0x09,0x09,0x06}, {0x3E,0x41,0x51,0x21,0x5E}, {0x7F,0x09,0x19,0x29,0x46},\n';
    code += '  {0x26,0x49,0x49,0x49,0x32}, {0x03,0x01,0x7F,0x01,0x03}, {0x3F,0x40,0x40,0x40,0x3F},\n';
    code += '  {0x1F,0x20,0x40,0x20,0x1F}, {0x3F,0x40,0x38,0x40,0x3F}, {0x63,0x14,0x08,0x14,0x63},\n';
    code += '  {0x03,0x04,0x78,0x04,0x03}, {0x61,0x59,0x49,0x4D,0x43}, {0x00,0x7F,0x41,0x41,0x41},\n';
    code += '  {0x02,0x04,0x08,0x10,0x20}, {0x00,0x41,0x41,0x41,0x7F}, {0x04,0x02,0x01,0x02,0x04},\n';
    code += '  {0x40,0x40,0x40,0x40,0x40}, {0x00,0x03,0x07,0x08,0x00}, {0x20,0x54,0x54,0x78,0x40},\n';
    code += '  {0x7F,0x28,0x44,0x44,0x38}, {0x38,0x44,0x44,0x44,0x28}, {0x38,0x44,0x44,0x28,0x7F},\n';
    code += '  {0x38,0x54,0x54,0x54,0x18}, {0x00,0x08,0x7E,0x09,0x02}, {0x18,0xA4,0xA4,0x9C,0x78},\n';
    code += '  {0x7F,0x08,0x04,0x04,0x78}, {0x00,0x44,0x7D,0x40,0x00}, {0x20,0x40,0x40,0x3D,0x00},\n';
    code += '  {0x7F,0x10,0x28,0x44,0x00}, {0x00,0x41,0x7F,0x40,0x00}, {0x7C,0x04,0x78,0x04,0x78},\n';
    code += '  {0x7C,0x08,0x04,0x04,0x78}, {0x38,0x44,0x44,0x44,0x38}, {0xFC,0x18,0x24,0x24,0x18},\n';
    code += '  {0x18,0x24,0x24,0x18,0xFC}, {0x7C,0x08,0x04,0x04,0x08}, {0x48,0x54,0x54,0x54,0x24},\n';
    code += '  {0x04,0x04,0x3F,0x44,0x24}, {0x3C,0x40,0x40,0x20,0x7C}, {0x1C,0x20,0x40,0x20,0x1C},\n';
    code += '  {0x3C,0x40,0x30,0x40,0x3C}, {0x44,0x28,0x10,0x28,0x44}, {0x4C,0x90,0x90,0x90,0x7C},\n';
    code += '  {0x44,0x64,0x54,0x4C,0x44}, {0x00,0x08,0x36,0x41,0x00}, {0x00,0x00,0x77,0x00,0x00},\n';
    code += '  {0x00,0x41,0x36,0x08,0x00}, {0x02,0x01,0x02,0x04,0x02},\n';
    code += '};\n\n';
    code += 'void _oled_texto(int16_t x, int16_t y, const char *s) {\n';
    code += '  while (*s) {\n';
    code += '    uint8_t c = (uint8_t)*s++;\n';
    code += '    if (c < 32 || c > 126) c = 32;\n';
    code += '    for (uint8_t i = 0; i < 5; i++) {\n';
    code += '      uint8_t col = pgm_read_byte(&_oled_font5x7[c - 32][i]);\n';
    code += '      for (uint8_t j = 0; j < 7; j++)\n';
    code += '        if (col & (1 << j)) _oled_punto(x + i, y + j, true);\n';
    code += '    }\n';
    code += '    x += 6;\n';
    code += '    if (x > 127) return;\n';
    code += '  }\n';
    code += '}\n\n';
  }

  return code;
}

/** Decodificador de animaciones: mismo formato que el sketch Bad_Apple_Flash. */
export function oledAnimCode() {
  let code = '';
  code += '// Animación: cuadros RLE de bloques 8x8 (cabecera 255 = cuadro completo)\n';
  code += 'uint8_t _oled_tab(const uint8_t *a, const uint8_t *b, uint32_t corte, uint32_t i) {\n';
  code += '  return (b && i >= corte) ? pgm_read_byte(&b[i - corte]) : pgm_read_byte(&a[i]);\n';
  code += '}\n\n';

  code += 'void _oled_bloque8(const uint8_t *a, const uint8_t *b, uint32_t corte, uint32_t *pos, uint8_t offset) {\n';
  code += '  uint8_t bloque[8];\n';
  code += '  for (uint8_t i = 0; i < 8; i++) bloque[i] = _oled_tab(a, b, corte, (*pos)++);\n';
  code += '  uint8_t x = offset / 8;\n';
  code += '  uint8_t pagina = offset % 8;\n';
  code += '  for (uint8_t i = 0; i < 8; i++) {\n';
  code += '    uint8_t col = 0;\n';
  code += '    for (uint8_t yi = 0; yi < 8; yi++)\n';
  code += '      if (bloque[yi] & (0x80 >> i)) col |= (1 << yi);\n';
  code += '    oled_buf[pagina * 128 + x * 8 + i] = col;\n';
  code += '  }\n';
  code += '  oled_sucia[pagina] = true;\n';
  code += '}\n\n';

  code += 'void _oled_cuadro(const uint8_t *a, const uint8_t *b, uint32_t corte, uint32_t *pos, uint32_t bytes) {\n';
  code += '  if (*pos >= bytes) return;\n';
  code += '  uint8_t cab = _oled_tab(a, b, corte, (*pos)++);\n';
  code += '  if (cab == 255) {\n';
  code += '    for (uint8_t x = 0; x < 16; x++)\n';
  code += '      for (uint8_t y = 0; y < 8; y++) {\n';
  code += '        if (*pos + 8 > bytes) return;\n';
  code += '        _oled_bloque8(a, b, corte, pos, x * 8 + y);\n';
  code += '      }\n';
  code += '  } else {\n';
  code += '    for (uint8_t i = 0; i < cab; i++) {\n';
  code += '      if (*pos >= bytes) return;\n';
  code += '      uint8_t off = _oled_tab(a, b, corte, (*pos)++);\n';
  code += '      if (*pos + 8 > bytes) return;\n';
  code += '      _oled_bloque8(a, b, corte, pos, off);\n';
  code += '    }\n';
  code += '  }\n';
  code += '}\n\n';

  code += 'void _oled_anim_play(const uint8_t *a, const uint8_t *b, uint32_t corte,\n';
  code += '                     uint32_t bytes, uint32_t cuadros, uint8_t fps, bool bucle) {\n';
  code += '  if (fps == 0) fps = 25;\n';
  code += '  uint32_t inicio;\n';
  code += '  do {\n';
  code += '    uint32_t pos = 0, n = 0;\n';
  code += '    _oled_limpiar();\n';
  code += '    _oled_volcar();\n';
  code += '    inicio = millis();\n';
  code += '    while (pos < bytes && n < cuadros) {\n';
  code += '      _oled_cuadro(a, b, corte, &pos, bytes);\n';
  code += '      n++;\n';
  code += '      int32_t objetivo = (int32_t)inicio + (int32_t)((n * 1000UL) / fps);\n';
  code += '      int32_t delta = objetivo - (int32_t)millis();\n';
  code += '      if (delta >= -40) _oled_volcar();\n';
  code += '      if (delta > 0) delay(delta);\n';
  code += '    }\n';
  code += '  } while (bucle);\n';
  code += '}\n\n';
  return code;
}

// ═══ Bloques ═══════════════════════════════════

export const blocks = [
  {
    type: 'oled_create',
    message0: Blockly.Msg.MSG_OLED_CREATE,
    args0: [
      { type: 'field_dropdown', name: 'ADDR', options: [['0x3C', '0x3C'], ['0x3D', '0x3D']] },
      {
        type: 'field_dropdown', name: 'CLOCK',
        options: [['400 kHz', '400000'], ['100 kHz', '100000']],
      },
    ],
    previousStatement: null,
    nextStatement: null,
    colour: 340,
    tooltip: Blockly.Msg.TOOLTIP_OLED_CREATE,
    helpUrl: '',
  },
  {
    type: 'oled_clear',
    message0: Blockly.Msg.MSG_OLED_CLEAR,
    previousStatement: null,
    nextStatement: null,
    colour: 340,
    tooltip: Blockly.Msg.TOOLTIP_OLED_CLEAR,
    helpUrl: '',
  },
  {
    type: 'oled_show',
    message0: Blockly.Msg.MSG_OLED_SHOW,
    previousStatement: null,
    nextStatement: null,
    colour: 340,
    tooltip: Blockly.Msg.TOOLTIP_OLED_SHOW,
    helpUrl: '',
  },
  {
    type: 'oled_pixel',
    message0: Blockly.Msg.MSG_OLED_PIXEL,
    args0: [
      { type: 'input_value', name: 'X', check: 'Number' },
      { type: 'input_value', name: 'Y', check: 'Number' },
      {
        type: 'field_dropdown', name: 'ON',
        options: [
          [Blockly.Msg.OPT_OLED_ON, 'true'],
          [Blockly.Msg.OPT_OLED_OFF, 'false'],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 340,
    tooltip: Blockly.Msg.TOOLTIP_OLED_PIXEL,
    helpUrl: '',
  },
  {
    type: 'oled_text',
    message0: Blockly.Msg.MSG_OLED_TEXT,
    args0: [
      { type: 'input_value', name: 'TEXT', check: ['String', 'Number'] },
      { type: 'input_value', name: 'X', check: 'Number' },
      { type: 'input_value', name: 'Y', check: 'Number' },
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 340,
    tooltip: Blockly.Msg.TOOLTIP_OLED_TEXT,
    helpUrl: '',
  },
  {
    type: 'oled_play_animation',
    message0: Blockly.Msg.MSG_OLED_PLAY,
    args0: [
      {
        type: 'field_dropdown',
        name: 'ANIM',
        options: function () {
          const opts = [];
          for (const k of Object.keys(OLED_ANIMATIONS).sort()) {
            opts.push(['🎬 ' + (OLED_ANIMATIONS[k].label || k), k]);
          }
          try {
            const saved = JSON.parse(localStorage.getItem('ardublock:oled-animations') || '{}');
            const names = Object.keys(saved).sort();
            if (names.length > 0) {
              opts.push(['──────────', '']);
              for (const name of names) {
                const enTabs = Array.isArray(saved[name].arrays) && saved[name].arrays.length > 0;
                opts.push(['📁 ' + name + (enTabs ? ' (tabs)' : ''), 'oj_' + name]);
              }
            }
          } catch (_) { /* sin animaciones propias */ }
          return opts;
        },
      },
      {
        type: 'field_dropdown', name: 'LOOP',
        options: [
          [Blockly.Msg.OPT_OLED_LOOP_OFF, 'FALSE'],
          [Blockly.Msg.OPT_OLED_LOOP_ON, 'TRUE'],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 340,
    tooltip: Blockly.Msg.TOOLTIP_OLED_PLAY,
    helpUrl: '',
  },
];

// ═══ Generadores ═══════════════════════════════

export function registerGenerators(cppGenerator) {
  // ── oled_create ──────────────────────────────
  cppGenerator.forBlock['oled_create'] = function (block) {
    cppGenerator._oledUsed = true;
    const addr = block.getFieldValue('ADDR') || '0x3C';
    const clock = block.getFieldValue('CLOCK') || '400000';
    return '_oled_init(' + addr + ', ' + clock + ');\n';
  };

  // ── oled_clear ───────────────────────────────
  cppGenerator.forBlock['oled_clear'] = function (_block) {
    cppGenerator._oledUsed = true;
    return '_oled_limpiar();\n';
  };

  // ── oled_show ────────────────────────────────
  cppGenerator.forBlock['oled_show'] = function (_block) {
    cppGenerator._oledUsed = true;
    return '_oled_volcar();\n';
  };

  // ── oled_pixel ───────────────────────────────
  cppGenerator.forBlock['oled_pixel'] = function (block) {
    cppGenerator._oledUsed = true;
    const x = cppGenerator.valueToCode(block, 'X', cppGenerator.ORDER_ATOMIC) || '0';
    const y = cppGenerator.valueToCode(block, 'Y', cppGenerator.ORDER_ATOMIC) || '0';
    const on = block.getFieldValue('ON') === 'true' ? 'true' : 'false';
    return '_oled_punto(' + x + ', ' + y + ', ' + on + ');\n';
  };

  // ── oled_text ────────────────────────────────
  cppGenerator.forBlock['oled_text'] = function (block) {
    cppGenerator._oledUsed = true;
    cppGenerator._oledText = true;
    const text = cppGenerator.valueToCode(block, 'TEXT', cppGenerator.ORDER_NONE) || '""';
    const x = cppGenerator.valueToCode(block, 'X', cppGenerator.ORDER_ATOMIC) || '0';
    const y = cppGenerator.valueToCode(block, 'Y', cppGenerator.ORDER_ATOMIC) || '0';
    return '_oled_texto(' + x + ', ' + y + ', ' + text + ');\n';
  };

  // ── oled_play_animation ──────────────────────
  cppGenerator.forBlock['oled_play_animation'] = function (block) {
    cppGenerator._oledUsed = true;
    const anim = block.getFieldValue('ANIM') || 'badapple';
    const loop = block.getFieldValue('LOOP') === 'TRUE' ? 'true' : 'false';

    if (anim.startsWith('oj_')) {
      const name = anim.slice(3);
      cppGenerator._oledAnimCustom = name;

      // Animación propia guardada como tabs .h: se reproduce desde los dos
      // arreglos, igual que el recurso, porque su tabla no cabe en el .ino.
      let propia = null;
      try { propia = animacionesPropias()[name] || null; } catch (_) { propia = null; }
      if (propia && Array.isArray(propia.arrays) && propia.arrays.length > 0) {
        return '_oled_anim_play(' + propia.arrays[0] + ', ' + (propia.arrays[1] || 'NULL')
             + ', ' + (propia.corte || 0) + ', ' + (propia.bytes || 0)
             + ', ' + (propia.cuadros || 0) + ', ' + (propia.fps || 25) + ', ' + loop + ');\n';
      }

      return '_oled_anim_play(oled_anim_' + name + ', NULL, 0, '
           + 'sizeof(oled_anim_' + name + '), 0, 25, ' + loop + ');\n';
    }

    const meta = OLED_ANIMATIONS[anim];
    if (!meta) return '// animación OLED desconocida: ' + anim + '\n';
    cppGenerator._oledAnimBuiltin = anim;
    // Una animación que cabe en un tab viaja en un solo arreglo: el segundo va
    // nulo y el decodificador lee todo de `a`.
    return '_oled_anim_play(' + meta.arrays[0] + ', ' + (meta.arrays[1] || 'NULL') + ', '
         + (meta.corte || 0) + ', ' + meta.bytes + ', ' + meta.cuadros + ', '
         + (meta.fps || 25) + ', ' + loop + ');\n';
  };
}
