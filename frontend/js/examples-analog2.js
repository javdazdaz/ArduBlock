/**
 * ArduBlock — Ejemplos Arduino (auto-generado por transform-examples.mjs)
 */

import _AnalogInOutSerial from '../../examples/blockly-states/arduino-examples/analog/AnalogInOutSerial.json';
import _Calibration from '../../examples/blockly-states/arduino-examples/analog/Calibration.json';

export const analog2 = [
  {
    name: "AnalogInOutSerial",
    source: "arduino-examples",
    category: "03.Analog",
    description: {"es":"Lee un potenciómetro, mapea el valor a PWM y controla el brillo de un LED","en":"Lee un potenciómetro, mapea el valor a PWM y controla el brillo de un LED"},
    comment: "/*\n  Analog input, analog output, serial output\n\n  Reads an analog input pin, maps the result to a range from 0 to 255 and uses\n  the result to set the pulse width modulation (PWM) of an output pin.\n  Also prints the results to the Serial Monitor.\n\n  The circuit:\n  - potentiometer connected to analog pin 0.\n    Center pin of the potentiometer goes to the analog pin.\n    side pins of the potentiometer go to +5V and ground\n  - LED connected from digital pin 9 to ground through 220 ohm resistor\n\n  created 29 Dec. 2008\n  modified 9 Apr 2012\n  by Tom Igoe\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/analog/AnalogInOutSerial/\n\n  Agregado a ArduBlock — 2026-05-31\n*/",
    state: _AnalogInOutSerial,
  },
  {
    name: "Calibration",
    source: "arduino-examples",
    category: "03.Analog",
    description: {"es":"Calibra un sensor analógico durante los primeros 5 segundos y ajusta el rango","en":"Calibra un sensor analógico durante los primeros 5 segundos y ajusta el rango"},
    comment: "/*\n  Calibration\n\n  Demonstrates one technique for calibrating sensor input. The sensor readings\n  during the first five seconds of the sketch execution define the minimum and\n  maximum of expected values attached to the sensor pin.\n\n  The sensor minimum and maximum initial values may seem backwards. Initially,\n  you set the minimum high and listen for anything lower, saving it as the new\n  minimum. Likewise, you set the maximum low and listen for anything higher as\n  the new maximum.\n\n  The circuit:\n  - analog sensor (potentiometer will do) attached to analog input 0\n  - LED attached from digital pin 9 to ground through 220 ohm resistor\n\n  created 29 Oct 2008\n  by David A Mellis\n  modified 30 Aug 2011\n  by Tom Igoe\n  modified 07 Apr 2017\n  by Zachary J. Fields\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/analog/Calibration/\n\n  Agregado a ArduBlock — 2026-05-31\n*/",
    state: _Calibration,
  },
];
