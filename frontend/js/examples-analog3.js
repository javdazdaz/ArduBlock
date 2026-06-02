/**
 * ArduBlock — Ejemplos Arduino (auto-generado por transform-examples.mjs)
 */

import _Smoothing from '../../examples/blockly-states/arduino-examples/analog/Smoothing.json';

export const analog3 = [
  {
    name: "Smoothing",
    source: "arduino-examples",
    category: "03.Analog",
    description: {"es":"Promedio móvil de lecturas analógicas usando un array circular (NO CONVERTIBLE)","en":"Promedio móvil de lecturas analógicas usando un array circular (NO CONVERTIBLE)"},
    comment: "/*\n  Smoothing\n\n  Reads repeatedly from an analog input, calculating a running average and\n  printing it to the computer. Keeps ten readings in an array and continually\n  averages them.\n\n  The circuit:\n  - analog sensor (potentiometer will do) attached to analog input 0\n\n  created 22 Apr 2007\n  by David A. Mellis  <dam@mellis.org>\n  modified 9 Apr 2012\n  by Tom Igoe\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/analog/Smoothing/\n\n  Agregado a ArduBlock — 2026-05-31\n*/",
    state: _Smoothing,
  },
  {
    name: "AnalogWriteMega",
    source: "arduino-examples",
    category: "03.Analog",
    description: {"es":"Desvanecimiento de LEDs en pines 2-13 del Arduino Mega (NO CONVERTIBLE para Uno)","en":"Desvanecimiento de LEDs en pines 2-13 del Arduino Mega (NO CONVERTIBLE para Uno)"},
    comment: "/*\n  Mega analogWrite() test\n\n  This sketch fades LEDs up and down one at a time on digital pins 2 through 13.\n  This sketch was written for the Arduino Mega, and will not work on other boards.\n\n  The circuit:\n  - LEDs attached from pins 2 through 13 to ground.\n\n  created 8 Feb 2009\n  by Tom Igoe\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/analog/AnalogWriteMega/\n\n  Agregado a ArduBlock — 2026-05-31\n*/",
    reason: "NOT_CONVERTIBLE",
    note: "Escrito específicamente para Arduino Mega. Usa analogWrite() en los pines 2-13, pero en Arduino Uno solo los pines 3, 5, 6, 9, 10, 11 tienen PWM. El sketch mismo advierte: \"will not work on other boards\". ArduBlock apunta a Uno.",
  },
];
