import * as Blockly from 'blockly';
import '../i18n.js';

/**
 * ArduBlock — Bloques: Matriz LED Directa 8×8 (sin driver)
 *
 * Conexión directa al Arduino con 16 pines (8 filas + 8 columnas).
 * Pinout por defecto 1088AS:
 *   Filas (ánodos): 10, 11, 12, 13, A0, A1, A2, A3
 *   Columnas (cátodos): 2, 3, 4, 5, 6, 7, 8, 9
 *
 * Multiplexado por software: se activa una fila a la vez,
 * se encienden las columnas correspondientes (LOW = encendido),
 * y se repite durante la duración indicada.
 */

// ═══ Bloques ═══════════════════════════════════

export const blocks = [
  // ── matrixdirect_create ────────────────────
  {
    type: 'matrixdirect_create',
    message0: Blockly.Msg.MSG_DIRECT_CREATE,
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 35,
    tooltip: Blockly.Msg.TOOLTIP_DIRECT_CREATE,
    helpUrl: '',
  },
  // ── matrixdirect_show ──────────────────────
  {
    type: 'matrixdirect_show',
    message0: Blockly.Msg.MSG_DIRECT_SHOW,
    args0: [
      {
        type: 'field_dropdown',
        name: 'FRAME',
        options: function() {
          const opts = [
            ['\u2764 ' + Blockly.Msg.OPT_DIRECT_HEART, 'heart'],
            ['\u263A ' + Blockly.Msg.OPT_DIRECT_SMILEY, 'smiley'],
            ['\u2639 ' + Blockly.Msg.OPT_DIRECT_SAD, 'sad'],
            ['\u2191 ' + Blockly.Msg.OPT_DIRECT_ARROW_UP, 'arrow_up'],
            ['\u2193 ' + Blockly.Msg.OPT_DIRECT_ARROW_DOWN, 'arrow_down'],
            ['\u2190 ' + Blockly.Msg.OPT_DIRECT_ARROW_LEFT, 'arrow_left'],
            ['\u2192 ' + Blockly.Msg.OPT_DIRECT_ARROW_RIGHT, 'arrow_right'],
            ['\u2713 ' + Blockly.Msg.OPT_DIRECT_CHECK, 'check'],
            ['\u2717 ' + Blockly.Msg.OPT_DIRECT_CROSS, 'cross'],
            ['\u2605 ' + Blockly.Msg.OPT_DIRECT_STAR, 'star'],
            ['\u25A0 ' + Blockly.Msg.OPT_DIRECT_SQUARE, 'square'],
            ['\u25A1 ' + Blockly.Msg.OPT_DIRECT_ALL, 'all'],
          ];
          try {
            const saved = JSON.parse(localStorage.getItem('ardublock:direct-frames') || '{}');
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
      {
        type: 'field_number',
        name: 'DURATION',
        value: 500,
        min: 50,
        max: 10000,
        precision: 1,
      },
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 35,
    tooltip: Blockly.Msg.TOOLTIP_DIRECT_SHOW,
    helpUrl: '',
  },
  // ── matrixdirect_clear ─────────────────────
  {
    type: 'matrixdirect_clear',
    message0: Blockly.Msg.MSG_DIRECT_CLEAR,
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 35,
    tooltip: Blockly.Msg.TOOLTIP_DIRECT_CLEAR,
    helpUrl: '',
  },
];

// ═══ Generadores ═══════════════════════════════

export function registerGenerators(cppGenerator) {

  // ── matrixdirect_create ────────────────────
  cppGenerator.forBlock['matrixdirect_create'] = function(_block) {
    cppGenerator._directUsed = true;
    return '// matriz directa inicializada (pines configurados en setup)\n';
  };

  // ── matrixdirect_show ──────────────────────
  cppGenerator.forBlock['matrixdirect_show'] = function(block) {
    cppGenerator._directUsed = true;
    const frame = block.getFieldValue('FRAME') || 'heart';
    const dur = Number(block.getFieldValue('DURATION')) || 500;

    if (!cppGenerator._directFrameNames) {
      cppGenerator._directFrameNames = new Set();
    }
    cppGenerator._directFrameNames.add(frame);

    return '_direct_show(frame_' + frame + ', ' + dur + ');\n';
  };

  // ── matrixdirect_clear ─────────────────────
  cppGenerator.forBlock['matrixdirect_clear'] = function(_block) {
    cppGenerator._directUsed = true;
    return '// apagar matriz directa\n'
         + 'for (int _d = 0; _d < 8; _d++) {\n'
         + '  digitalWrite(_md_rows[_d], LOW);\n'
         + '  digitalWrite(_md_cols[_d], HIGH);\n'
         + '}\n';
  };
}
