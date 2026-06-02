/**
 * ArduBlock — Ejemplos Arduino (auto-generado por transform-examples.mjs)
 */

import _ForLoopIteration from '../../examples/blockly-states/arduino-examples/control/ForLoopIteration.json';
import _WhileStatementConditional from '../../examples/blockly-states/arduino-examples/control/WhileStatementConditional.json';

export const controlExamples = [
  {
    name: "ForLoopIteration",
    source: "arduino-examples",
    category: "05.Control",
    description: {"es":"Enciende LEDs en secuencia (pines 2-7) de ida y vuelta, repitiendo el patrón","en":"Enciende LEDs en secuencia (pines 2-7) de ida y vuelta, repitiendo el patrón"},
    comment: "/*\n  For Loop Iteration\n\n  Demonstrates the use of a for() loop.\n  Lights multiple LEDs in sequence, then in reverse.\n\n  The circuit:\n  - LEDs from pins 2 through 7 to ground\n\n  created 2006\n  by David A. Mellis\n  modified 30 Aug 2011\n  by Tom Igoe\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/control-structures/ForLoopIteration/\n\n  Agregado a ArduBlock — 2026-05-31\n*/",
    state: _ForLoopIteration,
  },
  {
    name: "switchCase",
    source: "arduino-examples",
    category: "05.Control",
    description: {"es":"Clasifica lecturas de un fotorresistor en 4 rangos (dark/dim/medium/bright)","en":"Clasifica lecturas de un fotorresistor en 4 rangos (dark/dim/medium/bright)"},
    comment: "/*\n  Switch statement\n\n  Demonstrates the use of a switch statement. The switch statement allows you\n  to choose from among a set of discrete values of a variable. It's like a\n  series of if statements.\n\n  To see this sketch in action, put the board and sensor in a well-lit room,\n  open the Serial Monitor, and move your hand gradually down over the sensor.\n\n  The circuit:\n  - photoresistor from analog in 0 to +5V\n  - 10K resistor from analog in 0 to ground\n\n  created 1 Jul 2009\n  modified 9 Apr 2012\n  by Tom Igoe\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/control-structures/SwitchCase/\n\n  Agregado a ArduBlock — 2026-05-31\n*/",
    reason: "NOT_CONVERTIBLE",
    note: "Usa switch/case con 4 ramas (0-3). No existe bloque switch en ArduBlock. Podría aproximarse con controls_if anidados, pero el propósito del ejemplo es demostrar switch, no if/else.",
  },
  {
    name: "WhileStatementConditional",
    source: "arduino-examples",
    category: "05.Control",
    description: {"es":"Calibra un fotorresistor mientras se mantiene presionado un pulsador (while con condición)","en":"Calibra un fotorresistor mientras se mantiene presionado un pulsador (while con condición)"},
    comment: "/*\n  Conditionals - while statement\n\n  This example demonstrates the use of  while() statements.\n\n  While the pushbutton is pressed, the sketch runs the calibration routine.\n  The sensor readings during the while loop define the minimum and maximum of\n  expected values from the photoresistor.\n\n  This is a variation on the calibrate example.\n\n  The circuit:\n  - photoresistor connected from +5V to analog in pin 0\n  - 10 kilohm resistor connected from ground to analog in pin 0\n  - LED connected from digital pin 9 to ground through 220 ohm resistor\n  - pushbutton attached from pin 2 to +5V\n  - 10 kilohm resistor attached from pin 2 to ground\n\n  created 17 Jan 2009\n  modified 30 Aug 2011\n  by Tom Igoe\n  modified 20 Jan 2017\n  by Arturo Guadalupi\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/control-structures/WhileStatementConditional/\n\n  Agregado a ArduBlock — 2026-05-31\n*/",
    state: _WhileStatementConditional,
  },
];
