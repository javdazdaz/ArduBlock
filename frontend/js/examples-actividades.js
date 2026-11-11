/**
 * ArduBlock — Ejemplos: actividades de clase
 *
 * Dos programas del tramo «usar» de la progresión usar-modificar-crear.
 * La sección declara las tres categorías; las que aún no tienen programa
 * aparecen vacías en el menú, no se esconden.
 */

import _semaforo from '../../examples/blockly-states/ardublock-examples/actividades/usar/semaforo.json';
import _pulsador from '../../examples/blockly-states/ardublock-examples/actividades/usar/pulsador.json';
import _distancia from '../../examples/blockly-states/ardublock-examples/actividades/usar/distancia.json';

export const actividadExamples = [
  {
    name: 'Semáforo',
    source: 'actividades',
    category: 'usar',
    description: {
      es: 'Enciende el LED rojo y el verde por turnos e informa cada cambio por el monitor serie',
      en: 'Turns the red and green LEDs on in turn and reports each change on the serial monitor'
    },
    comment: {
      es: '/*\n  1 · Semáforo — usar\n\n  Enciende el LED rojo (D6) y el verde (D3) por turnos,\n  un segundo cada uno, e informa cada cambio por el\n  monitor serie.\n\n  El circuito:\n  - LED rojo de D6 a tierra con resistencia de 220 ohm\n  - LED verde de D3 a tierra con resistencia de 220 ohm\n\n  EDU0251 · AD13 · ArduBlock — 2026\n*/',
      en: '/*\n  1 · Traffic light — use\n\n  Turns the red LED (D6) and the green LED (D3) on in turn,\n  one second each, and reports every change on the\n  serial monitor.\n\n  The circuit:\n  - red LED from D6 to ground through a 220 ohm resistor\n  - green LED from D3 to ground through a 220 ohm resistor\n\n  EDU0251 · AD13 · ArduBlock — 2026\n*/'
    },
    state: _semaforo,
  },
  {
    name: 'Pulsador',
    source: 'actividades',
    category: 'usar',
    description: {
      es: 'Cuenta las pulsaciones y alterna los LED 6 y 5 según la paridad del contador',
      en: 'Counts button presses and alternates LEDs 6 and 5 with the parity of the counter'
    },
    comment: {
      es: '/*\n  2 · Pulsador — usar\n\n  Cuenta las pulsaciones del botón en A1 y alterna los\n  LED 6 y 5: uno encendido por cada pulsación par, el\n  otro por cada impar.\n\n  El circuito:\n  - pulsador de A1 a 5 V, con resistencia de 10 k a tierra\n  - LED de D6 a tierra con resistencia de 220 ohm\n  - LED de D5 a tierra con resistencia de 220 ohm\n\n  EDU0251 · AD13 · ArduBlock — 2026\n*/',
      en: '/*\n  2 · Push button — use\n\n  Counts presses of the button on A1 and alternates\n  LEDs 6 and 5: one on for every even press, the other\n  for every odd press.\n\n  The circuit:\n  - button from A1 to 5 V, with a 10 k resistor to ground\n  - LED from D6 to ground through a 220 ohm resistor\n  - LED from D5 to ground through a 220 ohm resistor\n\n  EDU0251 · AD13 · ArduBlock — 2026\n*/'
    },
    state: _pulsador,
  },
  {
    name: 'Distancia',
    source: 'actividades',
    category: 'usar',
    description: {
      es: 'Mide la distancia con el ultrasónico y fija el brillo del LED rojo según la proximidad',
      en: 'Measures distance with the ultrasonic sensor and sets the red LED brightness by proximity'
    },
    comment: {
      es: '/*\n  3 · Distancia — usar\n\n  Mide la distancia con el HC-SR04 y fija con ella el\n  brillo del LED rojo: 255 en el umbral de 30 cm y 0 a\n  partir de 400 cm. Informa la distancia y el brillo por\n  el monitor serie.\n\n  El circuito:\n  - HC-SR04: TRIG en D9 y ECHO en D10, alimentado a 5 V\n  - LED rojo de D6 a tierra con resistencia de 220 ohm\n  - LED ámbar de D5 a tierra con resistencia de 220 ohm\n  - LED verde de D3 a tierra con resistencia de 220 ohm\n\n  EDU0251 · AD13 · ArduBlock — 2026\n*/',
      en: '/*\n  3 · Distance — use\n\n  Measures distance with the HC-SR04 and uses it to set\n  the red LED brightness: 255 at the 30 cm threshold and\n  0 from 400 cm on. Reports distance and brightness on\n  the serial monitor.\n\n  The circuit:\n  - HC-SR04: TRIG on D9 and ECHO on D10, powered at 5 V\n  - red LED from D6 to ground through a 220 ohm resistor\n  - amber LED from D5 to ground through a 220 ohm resistor\n  - green LED from D3 to ground through a 220 ohm resistor\n\n  EDU0251 · AD13 · ArduBlock — 2026\n*/'
    },
    state: _distancia,
  },
];
