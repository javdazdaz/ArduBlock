/**
 * ArduBlock — Ejemplos Arduino (auto-generado por transform-examples.mjs)
 */

import _AnalogInput from '../../examples/blockly-states/arduino-examples/analog/AnalogInput.json';
import _IfStatementConditional from '../../examples/blockly-states/arduino-examples/control/IfStatementConditional.json';

export const analogControlExamples = [
  {
    name: "AnalogInput",
    source: "arduino-examples",
    category: "03.Analog",
    description: {"es":"Controla el brillo de un LED con un potenciómetro","en":"Controla el brillo de un LED con un potenciómetro"},
    comment: "/*\n  Analog Input\n\n  Demonstrates analog input by reading an analog sensor on analog pin 0 and\n  turning on and off a light emitting diode(LED) connected to digital pin 13.\n  The amount of time the LED will be on and off depends on the value obtained\n  by analogRead().\n\n  The circuit:\n  - potentiometer\n    center pin of the potentiometer to the analog input 0\n    one side pin (either one) to ground\n    the other side pin to +5V\n  - LED\n    anode (long leg) attached to digital output 13 through 220 ohm resistor\n    cathode (short leg) attached to ground\n\n  - Note: because most Arduinos have a built-in LED attached to pin 13 on the\n    board, the LED is optional.\n\n  created by David Cuartielles\n  modified 30 Aug 2011\n  By Tom Igoe\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/analog/AnalogInput/\n\n  Agregado a ArduBlock — 2026-05-31\n*/",
    state: _AnalogInput,
  },
  {
    name: "Fading",
    source: "arduino-examples",
    category: "03.Analog",
    description: {"es":"Aumenta y disminuye el brillo de un LED con PWM (for con paso variable)","en":"Aumenta y disminuye el brillo de un LED con PWM (for con paso variable)"},
    comment: "/*\n  Fading\n\n  This example shows how to fade an LED using the analogWrite() function.\n\n  The circuit:\n  - LED attached from digital pin 9 to ground through 220 ohm resistor.\n\n  created 1 Nov 2008\n  by David A. Mellis\n  modified 30 Aug 2011\n  by Tom Igoe\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/analog/Fading/\n\n  Agregado a ArduBlock — 2026-05-31\n*/",
    reason: "NOT_CONVERTIBLE",
    note: "Usa for (int fadeValue = 0; fadeValue <= 255; fadeValue += 5). controls_repeat_ext no soporta paso variable (step 5), solo repetición N veces. Requiere bloque for con inicio/fin/paso.",
  },
  {
    name: "IfStatementConditional",
    source: "arduino-examples",
    category: "05.Control",
    description: {"es":"Enciende un LED si el potenciómetro supera un umbral","en":"Enciende un LED si el potenciómetro supera un umbral"},
    comment: "/*\n  Conditionals - If statement\n\n  This example demonstrates the use of if() statements.\n  It reads the state of a potentiometer (an analog input) and turns on an LED\n  only if the potentiometer goes above a certain threshold level. It prints the\n  analog value regardless of the level.\n\n  The circuit:\n  - potentiometer\n    Center pin of the potentiometer goes to analog pin 0.\n    Side pins of the potentiometer go to +5V and ground.\n  - LED connected from digital pin 13 to ground through 220 ohm resistor\n\n  - Note: On most Arduino boards, there is already an LED on the board connected\n    to pin 13, so you don't need any extra components for this example.\n\n  created 17 Jan 2009\n  modified 9 Apr 2012\n  by Tom Igoe\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/control-structures/ifStatementConditional/\n\n  Agregado a ArduBlock — 2026-05-31\n*/",
    state: _IfStatementConditional,
  },
];
