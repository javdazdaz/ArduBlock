/**
 * ArduBlock — Ejemplos: actividades de clase
 *
 * Dos programas del tramo «usar» de la progresión usar-modificar-crear.
 * La sección declara las tres categorías; las que aún no tienen programa
 * aparecen vacías en el menú, no se esconden.
 */

import _semaforo from '../../examples/blockly-states/ardublock-examples/actividades/usar/semaforo.json';
import _pulsador from '../../examples/blockly-states/ardublock-examples/actividades/usar/pulsador.json';

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
];
