/**
 * ArduBlock — Ejemplos: Matriz LED R4
 */

import _MatrixHeart from '../../examples/blockly-states/ardublock-examples/matrix/MatrixHeart.json';
import _MatrixBlink from '../../examples/blockly-states/ardublock-examples/matrix/MatrixBlink.json';
import _MatrixPulse from '../../examples/blockly-states/ardublock-examples/matrix/MatrixPulse.json';

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
];
