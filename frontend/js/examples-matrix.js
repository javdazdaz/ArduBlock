/**
 * ArduBlock — Ejemplos: Matriz LED R4
 *
 * Portados de los ejemplos oficiales de Arduino_LED_Matrix:
 *   libraries/Arduino_LED_Matrix/examples/
 */

import _MatrixHeart from '../../examples/blockly-states/ardublock-examples/matrix/MatrixHeart.json';
import _MatrixBlink from '../../examples/blockly-states/ardublock-examples/matrix/MatrixBlink.json';
import _MatrixPulse from '../../examples/blockly-states/ardublock-examples/matrix/MatrixPulse.json';
import _PlayAnimation from '../../examples/blockly-states/ardublock-examples/matrix/PlayAnimation.json';
import _MatrixIntro from '../../examples/blockly-states/ardublock-examples/matrix/MatrixIntro.json';
import _DisplaySingleFrame from '../../examples/blockly-states/ardublock-examples/matrix/DisplaySingleFrame.json';

export const matrixExamples = [
  {
    name: 'MatrixHeart',
    source: 'ardublock-examples',
    category: 'matrix',
    description: {
      es: 'Muestra un corazón en la matriz LED del R4',
      en: 'Displays a heart on the R4 LED matrix'
    },
    comment: {
      es: '/*\n  MatrixHeart\n\n  Muestra un corazón en la matriz LED integrada\n  del Arduino UNO R4 WiFi.\n\n  La matriz es de 12×8 LEDs y usa la librería\n  Arduino_LED_Matrix incluida en el board package.\n\n  ArduBlock — 2026\n*/',
      en: '/*\n  MatrixHeart\n\n  Displays a heart on the built-in LED matrix\n  of the Arduino UNO R4 WiFi.\n\n  The matrix is 12×8 LEDs and uses the\n  Arduino_LED_Matrix library included in the board package.\n\n  ArduBlock — 2026\n*/'
    },
    state: _MatrixHeart,
  },
  {
    name: 'MatrixBlink',
    source: 'ardublock-examples',
    category: 'matrix',
    description: {
      es: 'Animación de carita feliz parpadeando en la matriz LED',
      en: 'Smiley face blinking animation on the LED matrix'
    },
    comment: {
      es: '/*\n  MatrixBlink\n\n  Reproduce una animación de carita feliz\n  parpadeando en bucle en la matriz LED.\n\n  Usa matrix.loadSequence() para cargar\n  la secuencia y matrix.play(true) para\n  reproducir en bucle infinito.\n\n  ArduBlock — 2026\n*/',
      en: '/*\n  MatrixBlink\n\n  Plays a blinking smiley face animation\n  in a loop on the LED matrix.\n\n  Uses matrix.loadSequence() to load the\n  sequence and matrix.play(true) to play\n  in an infinite loop.\n\n  ArduBlock — 2026\n*/'
    },
    state: _MatrixBlink,
  },
  {
    name: 'MatrixPulse',
    source: 'ardublock-examples',
    category: 'matrix',
    description: {
      es: 'Animación de corazón latiendo en la matriz LED',
      en: 'Heartbeat animation on the LED matrix'
    },
    comment: {
      es: '/*\n  MatrixPulse\n\n  Reproduce una animación de corazón\n  latiendo en bucle en la matriz LED.\n\n  La secuencia alterna entre el corazón\n  encendido y apagado con diferente\n  duración para simular un latido.\n\n  ArduBlock — 2026\n*/',
      en: '/*\n  MatrixPulse\n\n  Plays a heartbeat animation in a loop\n  on the LED matrix.\n\n  The sequence alternates between the heart\n  on and off with different durations to\n  simulate a heartbeat.\n\n  ArduBlock — 2026\n*/'
    },
    state: _MatrixPulse,
  },
  // ── Portados de ejemplos oficiales de Arduino ──
  {
    name: 'MatrixIntro',
    source: 'ardublock-examples',
    category: 'matrix',
    description: {
      es: 'Animación oficial del R4 WiFi: corazón formándose (58 frames)',
      en: 'Official R4 WiFi animation: heart forming (58 frames)'
    },
    comment: {
      es: '/*\n  MatrixIntro\n\n  Sketch original que viene cargado en cada\n  Arduino UNO R4 WiFi de fábrica.\n\n  Muestra una animación de 58 frames donde\n  un corazón se va formando progresivamente.\n\n  El LED integrado (pin 13) parpadea mientras\n  la animación se reproduce en bucle.\n\n  Portado del ejemplo oficial:\n  libraries/Arduino_LED_Matrix/examples/MatrixIntro\n\n  ArduBlock — 2026\n*/',
      en: '/*\n  MatrixIntro\n\n  Original sketch that ships with every\n  Arduino UNO R4 WiFi from the factory.\n\n  Plays a 58-frame animation of a heart\n  forming progressively.\n\n  The built-in LED (pin 13) blinks while\n  the animation loops.\n\n  Ported from official example:\n  libraries/Arduino_LED_Matrix/examples/MatrixIntro\n\n  ArduBlock — 2026\n*/'
    },
    state: _MatrixIntro,
  },
  {
    name: 'PlayAnimation',
    source: 'ardublock-examples',
    category: 'matrix',
    description: {
      es: 'Animación geométrica oficial de Arduino (12 frames)',
      en: 'Official Arduino geometric animation (12 frames)'
    },
    comment: {
      es: '/*\n  PlayAnimation\n\n  Reproduce una animación geométrica de\n  12 frames en la matriz LED del R4.\n\n  La secuencia se carga en setup() con\n  matrix.play(true) y se reproduce en\n  bucle indefinidamente.\n\n  Portado del ejemplo oficial:\n  libraries/Arduino_LED_Matrix/examples/PlayAnimation\n\n  ArduBlock — 2026\n*/',
      en: '/*\n  PlayAnimation\n\n  Plays a 12-frame geometric animation\n  on the R4 LED matrix.\n\n  The sequence is loaded in setup() with\n  matrix.play(true) and loops indefinitely.\n\n  Ported from official example:\n  libraries/Arduino_LED_Matrix/examples/PlayAnimation\n\n  ArduBlock — 2026\n*/'
    },
    state: _PlayAnimation,
  },
  {
    name: 'DisplaySingleFrame',
    source: 'ardublock-examples',
    category: 'matrix',
    description: {
      es: 'Muestra una secuencia de íconos: chip, peligro, feliz, corazón',
      en: 'Displays a sequence of icons: chip, danger, happy, heart'
    },
    comment: {
      es: '/*\n  DisplaySingleFrame\n\n  Muestra una secuencia de íconos en la\n  matriz LED del R4, uno por uno:\n  chip → peligro → feliz → corazón → apagar.\n\n  Cada ícono se muestra durante 500 ms.\n\n  Portado del ejemplo oficial:\n  libraries/Arduino_LED_Matrix/examples/DisplaySingleFrame\n\n  ArduBlock — 2026\n*/',
      en: '/*\n  DisplaySingleFrame\n\n  Displays a sequence of icons on the\n  R4 LED matrix, one by one:\n  chip → danger → happy → heart → clear.\n\n  Each icon is shown for 500 ms.\n\n  Ported from official example:\n  libraries/Arduino_LED_Matrix/examples/DisplaySingleFrame\n\n  ArduBlock — 2026\n*/'
    },
    state: _DisplaySingleFrame,
  },
];
