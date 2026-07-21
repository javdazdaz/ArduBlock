import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg
/**
 * ArduBlock — Bloques: Matriz LED (UNO R4)
 *
 * Requiere Arduino_LED_Matrix.h (incluida en el board package del R4).
 * La matriz es 12 columnas × 8 filas (96 LEDs) direccionados por 3 uint32_t.
 */

// ═══ Frames predefinidos (12×8 row-major, 3 uint32_t cada uno) ═══

export const MATRIX_FRAMES = {
  heart:      [ 0x3184a444, 0x42081100, 0xa0040000 ],
  smiley:     [ 0x30c40, 0x20004022, 0x41f8000 ],
  sad:        [ 0x30c40, 0x20001f82, 0x4402000 ],
  check:      [ 0x100200, 0x40088104, 0x203c0000 ],
  cross:      [ 0x40220, 0x41080901, 0x8204402 ],
  arrow_up:   [ 0x400e01f, 0x36c6660, 0x40040040 ],
  arrow_down: [ 0x4004004, 0x66636c1, 0xf00e0040 ],
  arrow_left: [ 0x4008, 0xffeffe0, 0x80040000 ],
  arrow_right:[ 0x2001, 0x7ff7ff0, 0x10020000 ],
  star:       [ 0x400407f, 0xe1f01503, 0xb8444000 ],
  clear:      [ 0x0, 0x0, 0x0 ],
};

// Secuencias de animación: cada frame es [u32_0, u32_1, u32_2, duracion_ms]
export const MATRIX_ANIMATIONS = {
  blink: [
    [ 0x30c40, 0x20004022, 0x41f8000, 500 ],
    [ 0x0, 0x0, 0x0, 500 ],
  ],
  pulse: [
    [ 0x3184a444, 0x42081100, 0xa0040000, 300 ],
    [ 0x0, 0x0, 0x0, 150 ],
    [ 0x3184a444, 0x42081100, 0xa0040000, 300 ],
    [ 0x0, 0x0, 0x0, 700 ],
  ],
};

// ═══ Bloques ═══════════════════════════════════

export const blocks = [
  {
    type: 'matrix_init',
    message0: Blockly.Msg.MSG_MATRIX_INIT,
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 35,
    tooltip: Blockly.Msg.TOOLTIP_MATRIX_INIT,
    helpUrl: '',
  },
  {
    type: 'matrix_show_icon',
    message0: Blockly.Msg.MSG_MATRIX_SHOW_ICON,
    args0: [
      {
        type: 'field_dropdown',
        name: 'ICON',
        options: [
          ['\u2764 ' + Blockly.Msg.OPT_MATRIX_HEART, 'heart'],
          ['\u263A ' + Blockly.Msg.OPT_MATRIX_SMILEY, 'smiley'],
          ['\u2639 ' + Blockly.Msg.OPT_MATRIX_SAD, 'sad'],
          ['\u2713 ' + Blockly.Msg.OPT_MATRIX_CHECK, 'check'],
          ['\u2717 ' + Blockly.Msg.OPT_MATRIX_CROSS, 'cross'],
          ['\u2191 ' + Blockly.Msg.OPT_MATRIX_ARROW_UP, 'arrow_up'],
          ['\u2193 ' + Blockly.Msg.OPT_MATRIX_ARROW_DOWN, 'arrow_down'],
          ['\u2190 ' + Blockly.Msg.OPT_MATRIX_ARROW_LEFT, 'arrow_left'],
          ['\u2192 ' + Blockly.Msg.OPT_MATRIX_ARROW_RIGHT, 'arrow_right'],
          ['\u2605 ' + Blockly.Msg.OPT_MATRIX_STAR, 'star'],
        ],
      },
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 35,
    tooltip: Blockly.Msg.TOOLTIP_MATRIX_SHOW_ICON,
    helpUrl: '',
  },
  {
    type: 'matrix_play_animation',
    message0: Blockly.Msg.MSG_MATRIX_PLAY_ANIMATION,
    args0: [
      {
        type: 'field_dropdown',
        name: 'ANIM',
        options: [
          [Blockly.Msg.OPT_MATRIX_ANIM_BLINK, 'blink'],
          [Blockly.Msg.OPT_MATRIX_ANIM_PULSE, 'pulse'],
        ],
      },
      {
        type: 'field_checkbox',
        name: 'LOOP',
        checked: false,
      },
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 35,
    tooltip: Blockly.Msg.TOOLTIP_MATRIX_PLAY_ANIMATION,
    helpUrl: '',
  },
  {
    type: 'matrix_clear',
    message0: Blockly.Msg.MSG_MATRIX_CLEAR,
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 35,
    tooltip: Blockly.Msg.TOOLTIP_MATRIX_CLEAR,
    helpUrl: '',
  },
  {
    type: 'matrix_sequence_done',
    message0: Blockly.Msg.MSG_MATRIX_SEQUENCE_DONE,
    inputsInline: true,
    output: 'Boolean',
    colour: 35,
    tooltip: Blockly.Msg.TOOLTIP_MATRIX_SEQUENCE_DONE,
    helpUrl: '',
  },
];

// ═══ Generadores ═══════════════════════════════

export function registerGenerators(cppGenerator) {

  // ── matrix_init ─────────────────────────────
  // Marca que la matriz está en uso para que el scaffold emita
  // #include, objeto global y begin()
  cppGenerator.forBlock['matrix_init'] = function(_block) {
    cppGenerator._matrixUsed = true;
    return 'matrix.begin();\n';
  };

  // ── matrix_show_icon ────────────────────────
  cppGenerator.forBlock['matrix_show_icon'] = function(block) {
    cppGenerator._matrixUsed = true;
    const icon = block.getFieldValue('ICON') || 'heart';
    if (!cppGenerator._matrixFrameNames) {
      cppGenerator._matrixFrameNames = new Set();
    }
    cppGenerator._matrixFrameNames.add(icon);
    return 'matrix.loadFrame(frame_' + icon + ');\n';
  };

  // ── matrix_play_animation ───────────────────
  cppGenerator.forBlock['matrix_play_animation'] = function(block) {
    cppGenerator._matrixUsed = true;
    const anim = block.getFieldValue('ANIM') || 'blink';
    const loop = block.getFieldValue('LOOP') === 'TRUE';
    if (!cppGenerator._matrixAnimNames) {
      cppGenerator._matrixAnimNames = new Set();
    }
    cppGenerator._matrixAnimNames.add(anim);
    const loopStr = loop ? 'true' : 'false';
    return 'matrix.loadSequence(anim_' + anim + ');\n'
         + 'matrix.play(' + loopStr + ');\n';
  };

  // ── matrix_clear ────────────────────────────
  cppGenerator.forBlock['matrix_clear'] = function(_block) {
    cppGenerator._matrixUsed = true;
    if (!cppGenerator._matrixFrameNames) {
      cppGenerator._matrixFrameNames = new Set();
    }
    cppGenerator._matrixFrameNames.add('clear');
    return 'matrix.loadFrame(frame_clear);\n';
  };

  // ── matrix_sequence_done ────────────────────
  cppGenerator.forBlock['matrix_sequence_done'] = function(_block) {
    return ['matrix.sequenceDone()', cppGenerator.ORDER_ATOMIC];
  };
}
