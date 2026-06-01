/**
 * ArduBlock — Ejemplos 03.Analog: Smoothing + AnalogWriteMega
 */
export const analog3 = [

  // ═══ Smoothing ═════════════════════════════
  {
    name: 'Smoothing',
    category: '03.Analog',
    description: 'Promedio móvil de lecturas analógicas usando un array circular (NO CONVERTIBLE)',
    comment: `/*
  Smoothing

  Reads repeatedly from an analog input, calculating a running average and
  printing it to the computer. Keeps ten readings in an array and continually
  averages them.

  The circuit:
  - analog sensor (potentiometer will do) attached to analog input 0

  created 22 Apr 2007
  by David A. Mellis  <dam@mellis.org>
  modified 9 Apr 2012
  by Tom Igoe

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/analog/Smoothing/

  Agregado a ArduBlock — 2026-05-31
*/`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa arrays (int readings[numReadings]), índice circular, y algoritmo de promedio móvil con resta/acumulación. ArduBlock no soporta arrays ni indexado de arrays.'
  },

  // ═══ AnalogWriteMega ═══════════════════════
  {
    name: 'AnalogWriteMega',
    category: '03.Analog',
    description: 'Desvanecimiento de LEDs en pines 2-13 del Arduino Mega (NO CONVERTIBLE para Uno)',
    comment: `/*
  Mega analogWrite() test

  This sketch fades LEDs up and down one at a time on digital pins 2 through 13.
  This sketch was written for the Arduino Mega, and will not work on other boards.

  The circuit:
  - LEDs attached from pins 2 through 13 to ground.

  created 8 Feb 2009
  by Tom Igoe

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/analog/AnalogWriteMega/

  Agregado a ArduBlock — 2026-05-31
*/`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Escrito específicamente para Arduino Mega. Usa analogWrite() en los pines 2-13, pero en Arduino Uno solo los pines 3, 5, 6, 9, 10, 11 tienen PWM. El sketch mismo advierte: "will not work on other boards". ArduBlock apunta a Uno.'
  }
];
