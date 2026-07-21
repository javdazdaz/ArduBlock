import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg
/**
 * ArduBlock — Bloques: Matriz LED (UNO R4)
 *
 * Requiere Arduino_LED_Matrix.h (incluida en el board package del R4).
 * La matriz es 12 columnas × 8 filas (96 LEDs) direccionados por 3 uint32_t.
 * Frames y animaciones portados de los ejemplos oficiales de Arduino.
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
  // ── Oficiales de Arduino (examples/DisplaySingleFrame/frames.h) ──
  happy:      [ 0x19819, 0x80000001, 0x81f8000 ],
  chip:       [ 0x1503f811, 0x3181103, 0xf8150000 ],
  danger:     [ 0x400a015, 0x1502082, 0x484047fc ],
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
  // ── Oficial: PlayAnimation (12 frames, geométrico) ──
  animation: [
    [ 0x30c20, 0x43fc3fc2, 0x430c000, 66 ],
    [ 0x30c29, 0x436c36c2, 0x9430c000, 66 ],
    [ 0x30c2f, 0x430c30c2, 0xf430c000, 66 ],
    [ 0x36c29, 0x41081082, 0x9436c000, 66 ],
    [ 0x3fc30, 0xc1081083, 0xc3fc000, 66 ],
    [ 0x3fc20, 0x42042042, 0x43fc000, 66 ],
    [ 0x3f, 0xc2042043, 0xfc000000, 66 ],
    [ 0x0, 0x3fc3fc0, 0x0, 66 ],
    [ 0x0, 0x1f81f80, 0x0, 66 ],
    [ 0x0, 0xf00f00, 0x0, 66 ],
    [ 0x0, 0x600600, 0x0, 66 ],
    [ 0x0, 0x0, 0x0, 66 ],
  ],
  // ── Oficial: MatrixIntro (58 frames, corazón formándose) ──
  frames: [
    [ 0xe0000000, 0x0, 0x0, 66 ],
    [ 0x400e0000, 0x0, 0x0, 66 ],
    [ 0x400e0, 0x0, 0x0, 66 ],
    [ 0x40, 0xe000000, 0x0, 66 ],
    [ 0x3000000, 0x400e000, 0x0, 66 ],
    [ 0x3003000, 0x400e, 0x0, 66 ],
    [ 0x3003, 0x4, 0xe00000, 66 ],
    [ 0x3, 0x300000, 0x400e00, 66 ],
    [ 0x0, 0x300300, 0x400e00, 66 ],
    [ 0x1c000000, 0x300, 0x30400e00, 66 ],
    [ 0x401c000, 0x0, 0x30430e00, 66 ],
    [ 0x401c, 0x0, 0x430e30, 66 ],
    [ 0x4, 0x1c00000, 0x430e30, 66 ],
    [ 0x0, 0x401c00, 0x430e30, 66 ],
    [ 0x800000, 0x401, 0xc0430e30, 66 ],
    [ 0x800800, 0x0, 0x405f0e30, 66 ],
    [ 0x800800, 0x80000000, 0x470ff0, 66 ],
    [ 0x800800, 0x80080000, 0x470ff0, 66 ],
    [ 0x800, 0x80080080, 0x470ff0, 66 ],
    [ 0x38000000, 0x80080080, 0x8470ff0, 66 ],
    [ 0x10038000, 0x80080, 0x8478ff0, 66 ],
    [ 0x10038, 0x80, 0x8478ff8, 66 ],
    [ 0x700010, 0x3800080, 0x8478ff8, 66 ],
    [ 0x400700, 0x1003880, 0x8478ff8, 66 ],
    [ 0x400, 0x70001083, 0x88478ff8, 66 ],
    [ 0xf000000, 0x40070081, 0x87f8ff8, 66 ],
    [ 0xf000, 0x400f1, 0x87f8ff8, 66 ],
    [ 0x8000000f, 0xc1, 0xf7f8ff8, 66 ],
    [ 0xc0080000, 0xf00081, 0xc7ffff8, 66 ],
    [ 0x400c0080, 0xf81, 0x87fcfff, 66 ],
    [ 0x3400c0, 0x8000081, 0xf87fcfff, 66 ],
    [ 0x20200340, 0xc008081, 0xf87fcfff, 66 ],
    [ 0x38220200, 0x3400c089, 0xf87fcfff, 66 ],
    [ 0x38220, 0x2003408d, 0xf8ffcfff, 66 ],
    [ 0x86100038, 0x220240bd, 0xf8ffcfff, 66 ],
    [ 0xec186100, 0x38260ad, 0xfbffcfff, 66 ],
    [ 0x3ec186, 0x100078af, 0xfaffffff, 66 ],
    [ 0x114003ec, 0x186178af, 0xfaffffff, 66 ],
    [ 0x3b411400, 0x3ec1febf, 0xfaffffff, 66 ],
    [ 0x143b411, 0x4ec3febf, 0xfbffffff, 66 ],
    [ 0xc040143b, 0x4fd7febf, 0xfbffffff, 66 ],
    [ 0xc60c0439, 0x4ff7ffff, 0xfbffffff, 66 ],
    [ 0x33c60f9, 0x4ff7ffff, 0xffffffff, 66 ],
    [ 0x3cbc33ff, 0x4ff7ffff, 0xffffffff, 66 ],
    [ 0x8ffbff, 0x7ff7ffff, 0xffffffff, 66 ],
    [ 0xf0cffbff, 0xfff7ffff, 0xffffffff, 66 ],
    [ 0xfe1fffff, 0xffffffff, 0xffffffff, 66 ],
    [ 0xffffffff, 0xffffffff, 0xffffffff, 66 ],
    [ 0x7fffffff, 0xffffffff, 0xfffff7ff, 66 ],
    [ 0x3fe7ffff, 0xffffffff, 0xff7ff3fe, 66 ],
    [ 0x1fc3fe7f, 0xfffffff7, 0xff3fe1fc, 66 ],
    [ 0xf81fc3f, 0xe7ff7ff3, 0xfe1fc0f8, 66 ],
    [ 0x500f81f, 0xc3fe3fe1, 0xfc0f8070, 66 ],
    [ 0x500f, 0x81fc1fc0, 0xf8070020, 66 ],
    [ 0x5, 0xf80f80, 0x70020000, 66 ],
    [ 0x5, 0xa80880, 0x50020000, 600 ],
    [ 0xd812, 0x41040880, 0x50020000, 200 ],
    [ 0x5, 0xa80880, 0x50020000, 0 ],
  ],
  // ── upiir: ported from github.com/upiir/arduino_uno_r4_led_display ──
  upiir_battery: [
    [ 0x7fc802a0, 0x3a03a03a, 0x38027fc, 66 ],
    [ 0x7fc802a8, 0x3a83a83a, 0x838027fc, 66 ],
    [ 0x7fc802aa, 0x3aa3aa3a, 0xa38027fc, 66 ],
    [ 0x7fc802aa, 0xbaabaaba, 0xab8027fc, 66 ],
  ],
  upiir_signal: [
    [ 0x0, 0x0, 0x6db, 66 ],
    [ 0x0, 0x0, 0x6006db, 66 ],
    [ 0x0, 0xc00, 0xc06c06db, 66 ],
    [ 0x1, 0x80180d80, 0xd86d86db, 66 ],
    [ 0x300301, 0xb01b0db0, 0xdb6db6db, 66 ],
  ],
  upiir_sound: [
    [ 0x18028048, 0x8a08a04, 0x80280180, 66 ],
    [ 0x18029048, 0x88a88a84, 0x88290180, 66 ],
    [ 0x18429248, 0xa8aa8aa4, 0x8a292184, 66 ],
  ],
  upiir_talk: [
    [ 0x8208228, 0xaaaaaaa2, 0x8a082082, 66 ],
    [ 0x8a8a, 0xaaaaaaa8, 0xaa08a000, 66 ],
    [ 0x2822aa, 0xaaaaaaaa, 0xaa822002, 66 ],
    [ 0x828a, 0x2aaaaaa8, 0xa2082000, 66 ],
    [ 0x800a02a, 0xaaaaaaa2, 0xaa0a0080, 66 ],
  ],
  upiir_load: [
    [ 0x3000800, 0x0, 0x0, 66 ],
    [ 0x3000800, 0x40040040, 0x4000000, 66 ],
    [ 0x3000800, 0x40040040, 0x41080f0, 66 ],
    [ 0x1000820, 0x42042042, 0x41080f0, 66 ],
    [ 0x8010020, 0x42042042, 0x41080f0, 66 ],
    [ 0x8010020, 0x2002002, 0x1000c0, 66 ],
    [ 0xc010020, 0x0, 0x0, 66 ],
    [ 0xc000000, 0x0, 0x0, 66 ],
    [ 0x4000000, 0x0, 0x0, 66 ],
  ],
  upiir_arrows: [
    [ 0x83fc40, 0x80000001, 0x23fc100, 66 ],
    [ 0x43fe00, 0x40000002, 0x7fc200, 66 ],
    [ 0x1fe00, 0x60000006, 0x7f8000, 66 ],
    [ 0xfe00, 0x7002400e, 0x7f0000, 66 ],
    [ 0x7c00, 0x2407e024, 0x3e0000, 66 ],
    [ 0x3c40, 0x2e024074, 0x23c0000, 66 ],
    [ 0x41ce0, 0x24024024, 0x7382000, 66 ],
    [ 0x60c60, 0x24024024, 0x6306000, 66 ],
    [ 0x20070460, 0x24024024, 0x620e004, 66 ],
    [ 0x10038450, 0x24024024, 0xa21c008, 66 ],
    [ 0x803c048, 0x24024024, 0x1203c010, 66 ],
    [ 0x403e044, 0x4024020, 0x2207c020, 66 ],
    [ 0x203f042, 0x4000020, 0x420fc040, 66 ],
  ],
  upiir_checkbox: [
    [ 0x3f820, 0x82082082, 0x82083f8, 66 ],
    [ 0x3f820, 0x82082082, 0x82083f8, 66 ],
    [ 0x3f820, 0x82082082, 0x82083f8, 66 ],
    [ 0x3f820, 0x82082082, 0x82083f8, 66 ],
    [ 0x3f820, 0x82802082, 0x82083f8, 66 ],
    [ 0x3f820, 0x82802402, 0x82083f8, 66 ],
    [ 0x3f820, 0x2802402, 0x202083f8, 66 ],
    [ 0x3f020, 0x2882502, 0x202083f8, 66 ],
    [ 0x3f220, 0x42882502, 0x202083f8, 66 ],
    [ 0x3f220, 0x42882502, 0x202083f8, 66 ],
    [ 0x3f220, 0x42882502, 0x202083f8, 66 ],
    [ 0x3f220, 0x42882502, 0x202083f8, 66 ],
    [ 0x3f220, 0x42882502, 0x202083f8, 66 ],
    [ 0x3f020, 0x2882502, 0x202083f8, 66 ],
    [ 0x3f820, 0x2802402, 0x202083f8, 66 ],
    [ 0x3f820, 0x82802402, 0x82083f8, 66 ],
    [ 0x3f820, 0x82802082, 0x82083f8, 66 ],
  ],
  upiir_lock: [
    [ 0xe011001, 0x103f83, 0xb83b81f0, 66 ],
  ],
  upiir_arduino_logo: [
    [ 0x8, 0x400000, 0x0, 66 ],
    [ 0x70088, 0x400000, 0x0, 66 ],
    [ 0x70088, 0x8408408, 0x80700000, 66 ],
    [ 0x70e89, 0x8608408, 0x80700000, 66 ],
    [ 0x70e89, 0x18618418, 0x81700000, 66 ],
    [ 0x70e89, 0x18618418, 0x8170e000, 66 ],
    [ 0x70e89, 0x18618418, 0x9170e000, 66 ],
    [ 0x70e89, 0x18618618, 0x9170e000, 66 ],
    [ 0x70e89, 0x18618618, 0x9170e000, 66 ],
    [ 0x70e89, 0x18618618, 0x9170e000, 66 ],
    [ 0x70e89, 0x18618618, 0x9170e000, 66 ],
    [ 0x70e89, 0x18618618, 0x9170e000, 66 ],
    [ 0x70e89, 0x1a65a658, 0x9170e000, 66 ],
    [ 0x40289, 0x130c30c8, 0x91402000, 66 ],
    [ 0x30, 0x79e79e3, 0x0, 66 ],
    [ 0x30030, 0xfdffdf3, 0x300000, 66 ],
    [ 0x30030, 0xfdffdf3, 0x300000, 66 ],
    [ 0x30030, 0xfdffdf3, 0x300000, 66 ],
    [ 0x30030, 0xfdffdf3, 0x300000, 66 ],
    [ 0x30030, 0xfdffdf3, 0x300000, 66 ],
    [ 0x30030030, 0xcfbcfb3, 0x300300, 66 ],
    [ 0x30030000, 0x8718710, 0x300300, 66 ],
    [ 0x30000000, 0x200200, 0x300, 66 ],
    [ 0x0, 0x0, 0x0, 66 ],
    [ 0x0, 0x0, 0x0, 66 ],
    [ 0x0, 0x0, 0x0, 66 ],
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
        options: function() {
          const opts = [
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
            ['\uD83D\uDE00 ' + Blockly.Msg.OPT_MATRIX_HAPPY, 'happy'],
            ['\uD83D\uDCBE ' + Blockly.Msg.OPT_MATRIX_CHIP, 'chip'],
            ['\u26A0 ' + Blockly.Msg.OPT_MATRIX_DANGER, 'danger'],
          ];
          try {
            const saved = JSON.parse(localStorage.getItem('ardublock:matrix-frames') || '{}');
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
        options: function() {
          const opts = [
            [Blockly.Msg.OPT_MATRIX_ANIM_BLINK, 'blink'],
            [Blockly.Msg.OPT_MATRIX_ANIM_PULSE, 'pulse'],
            [Blockly.Msg.OPT_MATRIX_ANIM_ANIMATION, 'animation'],
            [Blockly.Msg.OPT_MATRIX_ANIM_FRAMES, 'frames'],
          ];
          // Incluir animaciones upiir (del objeto MATRIX_ANIMATIONS)
          const upiirKeys = Object.keys(MATRIX_ANIMATIONS).filter(k => k.startsWith('upiir_'));
          if (upiirKeys.length > 0) {
            opts.push(['── upiir ──', '']);
            for (const k of upiirKeys.sort()) {
              const label = k.replace('upiir_', '');
              opts.push(['📦 ' + label, k]);
            }
          }
          // Animaciones custom del usuario (localStorage)
          try {
            const saved = JSON.parse(localStorage.getItem('ardublock:matrix-animations') || '{}');
            const names = Object.keys(saved).sort();
            if (names.length > 0) {
              opts.push(['──────────', '']);
              for (const name of names) {
                opts.push(['🎬 ' + name, name]);
              }
            }
          } catch (_) { /* ignore */ }
          return opts;
        },
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
