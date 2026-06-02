/**
 * ArduBlock — Ejemplos Arduino (auto-generado por transform-examples.mjs)
 */

import _Button from '../../examples/blockly-states/arduino-examples/digital/Button.json';
import _DigitalInputPullup from '../../examples/blockly-states/arduino-examples/digital/DigitalInputPullup.json';
import _toneKeyboard from '../../examples/blockly-states/arduino-examples/digital/toneKeyboard.json';
import _tonePitchFollower from '../../examples/blockly-states/arduino-examples/digital/tonePitchFollower.json';
import _BlinkWithoutDelay from '../../examples/blockly-states/arduino-examples/digital/BlinkWithoutDelay.json';
import _Debounce from '../../examples/blockly-states/arduino-examples/digital/Debounce.json';
import _StateChangeDetection from '../../examples/blockly-states/arduino-examples/digital/StateChangeDetection.json';
import _toneMelody from '../../examples/blockly-states/arduino-examples/digital/toneMelody.json';
import _toneMultiple from '../../examples/blockly-states/arduino-examples/digital/toneMultiple.json';

export const digitalSimple = [
  {
    name: "Button",
    source: "arduino-examples",
    category: "02.Digital",
    description: {"es":"Enciende un LED al presionar un pulsador","en":"Enciende un LED al presionar un pulsador"},
    comment: {"es":"/*\n  Button\n\n  Enciende y apaga un LED conectado al pin digital 13\n  al presionar un pulsador conectado al pin 2.\n\n  El circuito:\n  - LED del pin 13 a tierra con resistencia de 220 ohm\n  - pulsador del pin 2 a +5V\n  - resistencia de 10K del pin 2 a tierra\n\n  creado 2005 por DojoDave\n  modificado 30 Ago 2011 por Tom Igoe\n\n  Este código es de dominio público.\n\n  https://docs.arduino.cc/built-in-examples/digital/Button/\n\n  Agregado a ArduBlock — 2026-05-31\n*/","en":"/*\n  Button\n\n  Turns on and off a light emitting diode(LED) connected to digital pin 13,\n  when pressing a pushbutton attached to pin 2.\n\n  The circuit:\n  - LED attached from pin 13 to ground through 220 ohm resistor\n  - pushbutton attached to pin 2 from +5V\n  - 10K resistor attached to pin 2 from ground\n\n  created 2005 by DojoDave\n  modified 30 Aug 2011 by Tom Igoe\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/digital/Button/\n\n  Added to ArduBlock — 2026-05-31\n*/"},
    state: _Button,
  },
  {
    name: "DigitalInputPullup",
    source: "arduino-examples",
    category: "02.Digital",
    description: {"es":"Lee un pulsador con resistencia pull-up interna y lo imprime por Serial","en":"Lee un pulsador con resistencia pull-up interna y lo imprime por Serial"},
    comment: {"es":"/*\n  Input Pull-up Serial\n\n  Este ejemplo demuestra el uso de pinMode(INPUT_PULLUP).\n  Lee una entrada digital en el pin 2 e imprime los resultados\n  en el Monitor Serial.\n\n  El circuito:\n  - pulsador momentáneo del pin 2 a tierra\n  - LED integrado en el pin 13\n\n  A diferencia de pinMode(INPUT), no se necesita resistencia\n  pull-down externa. Una resistencia interna de 20K ohm está\n  conectada a 5V. La entrada lee HIGH cuando el pulsador está\n  abierto, y LOW cuando está cerrado.\n\n  creado 14 Mar 2012 por Scott Fitzgerald\n\n  Este código es de dominio público.\n\n  https://docs.arduino.cc/built-in-examples/digital/InputPullupSerial/\n\n  Agregado a ArduBlock — 2026-05-31\n*/","en":"/*\n  Input Pull-up Serial\n\n  This example demonstrates the use of pinMode(INPUT_PULLUP). It reads a digital\n  input on pin 2 and prints the results to the Serial Monitor.\n\n  The circuit:\n  - momentary switch attached from pin 2 to ground\n  - built-in LED on pin 13\n\n  Unlike pinMode(INPUT), there is no pull-down resistor necessary. An internal\n  20K-ohm resistor is pulled to 5V. This configuration causes the input to read\n  HIGH when the switch is open, and LOW when it is closed.\n\n  created 14 Mar 2012 by Scott Fitzgerald\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/digital/InputPullupSerial/\n\n  Added to ArduBlock — 2026-05-31\n*/"},
    state: _DigitalInputPullup,
  },
  {
    name: "toneKeyboard",
    source: "arduino-examples",
    category: "02.Digital",
    description: {"es":"Teclado de 3 sensores que generan notas musicales","en":"Teclado de 3 sensores que generan notas musicales"},
    comment: {"es":"/*\n  Keyboard\n\n  Toca notas musicales según la lectura de sensores\n  de presión analógicos.\n\n  circuito:\n  - tres resistencias sensoras de fuerza de +5V a A0, A1, A2\n  - tres resistencias de 10 kilohm de A0, A1, A2 a tierra\n  - parlante de 8 ohm en el pin digital 8\n\n  creado 21 Ene 2010, modificado 9 Abr 2012 por Tom Igoe\n\n  Este código es de dominio público.\n\n  https://docs.arduino.cc/built-in-examples/digital/toneKeyboard/\n\n  Agregado a ArduBlock — 2026-05-31\n*/","en":"/*\n  Keyboard\n\n  Plays a pitch that changes based on a changing analog input\n\n  circuit:\n  - three force-sensing resistors from +5V to analog in 0 through 2\n  - three 10 kilohm resistors from analog in 0 through 2 to ground\n  - 8 ohm speaker on digital pin 8\n\n  created 21 Jan 2010, modified 9 Apr 2012 by Tom Igoe\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/digital/toneKeyboard/\n\n  Added to ArduBlock — 2026-05-31\n*/"},
    state: _toneKeyboard,
  },
  {
    name: "tonePitchFollower",
    source: "arduino-examples",
    category: "02.Digital",
    description: {"es":"Genera un tono cuya frecuencia varía según un sensor de luz","en":"Genera un tono cuya frecuencia varía según un sensor de luz"},
    comment: {"es":"/*\n  Pitch follower\n\n  Toca un tono cuya frecuencia cambia según la lectura\n  de una entrada analógica (fotorresistor).\n\n  circuito:\n  - parlante de 8 ohm en el pin digital 9\n  - fotorresistor en A0 a 5V\n  - resistencia de 4.7 kilohm en A0 a tierra\n\n  creado 21 Ene 2010, modificado 31 May 2012\n  por Tom Igoe, con sugerencia de Michael Flynn\n\n  Este código es de dominio público.\n\n  https://docs.arduino.cc/built-in-examples/digital/tonePitchFollower/\n\n  Agregado a ArduBlock — 2026-05-31\n*/","en":"/*\n  Pitch follower\n\n  Plays a pitch that changes based on a changing analog input\n\n  circuit:\n  - 8 ohm speaker on digital pin 9\n  - photoresistor on analog 0 to 5V\n  - 4.7 kilohm resistor on analog 0 to ground\n\n  created 21 Jan 2010, modified 31 May 2012\n  by Tom Igoe, with suggestion from Michael Flynn\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/digital/tonePitchFollower/\n\n  Added to ArduBlock — 2026-05-31\n*/"},
    state: _tonePitchFollower,
  },
  {
    name: "BlinkWithoutDelay",
    source: "arduino-examples",
    category: "02.Digital",
    description: {"es":"Parpadea un LED sin usar delay(), usando millis()","en":"Parpadea un LED sin usar delay(), usando millis()"},
    comment: {"es":"/*\n  Blink without Delay\n\n  Enciende y apaga un LED sin usar la función delay().\n  Esto permite que otro código se ejecute al mismo tiempo\n  sin ser interrumpido por el parpadeo.\n\n  creado 2005 por David A. Mellis\n  modificado 8 Feb 2010 por Paul Stoffregen\n  modificado 11 Nov 2013 por Scott Fitzgerald\n  modificado 9 Ene 2017 por Arturo Guadalupi\n\n  Este código es de dominio público.\n\n  https://docs.arduino.cc/built-in-examples/digital/BlinkWithoutDelay/\n\n  Agregado a ArduBlock — 2026-05-31\n*/","en":"/*\n  Blink without Delay\n\n  Turns on and off a light emitting diode (LED) connected to a digital pin,\n  without using the delay() function. This means that other code can run at the\n  same time without being interrupted by the LED code.\n\n  created 2005 by David A. Mellis\n  modified 8 Feb 2010 by Paul Stoffregen\n  modified 11 Nov 2013 by Scott Fitzgerald\n  modified 9 Jan 2017 by Arturo Guadalupi\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/digital/BlinkWithoutDelay/\n\n  Added to ArduBlock — 2026-05-31\n*/"},
    state: _BlinkWithoutDelay,
  },
  {
    name: "Debounce",
    source: "arduino-examples",
    category: "02.Digital",
    description: {"es":"Anti-rebote de pulsador con millis()","en":"Anti-rebote de pulsador con millis()"},
    comment: {"es":"/*\n  Debounce\n\n  Cada vez que el pin de entrada pasa de LOW a HIGH\n  (al presionar un pulsador), el pin de salida alterna\n  entre LOW y HIGH. Incluye un retardo mínimo para\n  eliminar el ruido del rebote.\n\n  creado 21 Nov 2006 por David A. Mellis\n  modificado 30 Ago 2011 por Limor Fried\n  modificado 28 Dic 2012 por Mike Walters\n  modificado 30 Ago 2016 por Arturo Guadalupi\n\n  Este código es de dominio público.\n\n  https://docs.arduino.cc/built-in-examples/digital/Debounce/\n\n  Agregado a ArduBlock — 2026-05-31\n*/","en":"/*\n  Debounce\n\n  Each time the input pin goes from LOW to HIGH (e.g. because of a push-button\n  press), the output pin is toggled from LOW to HIGH or HIGH to LOW. There's a\n  minimum delay between toggles to debounce the circuit (i.e. to ignore noise).\n\n  created 21 Nov 2006 by David A. Mellis\n  modified 30 Aug 2011 by Limor Fried\n  modified 28 Dec 2012 by Mike Walters\n  modified 30 Aug 2016 by Arturo Guadalupi\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/digital/Debounce/\n\n  Added to ArduBlock — 2026-05-31\n*/"},
    state: _Debounce,
  },
  {
    name: "StateChangeDetection",
    source: "arduino-examples",
    category: "02.Digital",
    description: {"es":"Detección de cambio de estado (flanco) de un pulsador","en":"Detección de cambio de estado (flanco) de un pulsador"},
    comment: {"es":"/*\n  State change detection (edge detection)\n\n  Detecta cuando un pulsador cambia de estado (de OFF a ON\n  o de ON a OFF). Cuenta las veces que se presiona y enciende\n  un LED cada 4 pulsaciones.\n\n  creado 27 Sep 2005, modificado 30 Ago 2011 por Tom Igoe\n\n  Este código es de dominio público.\n\n  https://docs.arduino.cc/built-in-examples/digital/StateChangeDetection/\n\n  Agregado a ArduBlock — 2026-05-31\n*/","en":"/*\n  State change detection (edge detection)\n\n  Often, you don't need to know the state of a digital input all the time, but\n  you just need to know when the input changes from one state to another.\n\n  created 27 Sep 2005, modified 30 Aug 2011 by Tom Igoe\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/digital/StateChangeDetection/\n\n  Added to ArduBlock — 2026-05-31\n*/"},
    state: _StateChangeDetection,
  },
  {
    name: "toneMelody",
    source: "arduino-examples",
    category: "02.Digital",
    description: {"es":"Reproduce una melodía con tonos","en":"Reproduce una melodía con tonos"},
    comment: {"es":"/*\n  Melody\n\n  Reproduce una melodía usando la función tone().\n\n  circuito:\n  - parlante de 8 ohm en el pin digital 8\n\n  creado 21 Ene 2010, modificado 30 Ago 2011 por Tom Igoe\n\n  Este código es de dominio público.\n\n  https://docs.arduino.cc/built-in-examples/digital/toneMelody/\n\n  Agregado a ArduBlock — 2026-05-31\n*/","en":"/*\n  Melody\n\n  Plays a melody\n\n  circuit:\n  - 8 ohm speaker on digital pin 8\n\n  created 21 Jan 2010, modified 30 Aug 2011 by Tom Igoe\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/digital/toneMelody/\n\n  Added to ArduBlock — 2026-05-31\n*/"},
    state: _toneMelody,
    tabs: [{"filename":"pitches.h","content":"/*************************************************\n   Public Constants\n *************************************************/\n\n#define NOTE_B0  31\n#define NOTE_C1  33\n#define NOTE_CS1  35\n#define NOTE_D1  37\n#define NOTE_DS1  39\n#define NOTE_E1  41\n#define NOTE_F1  44\n#define NOTE_FS1  46\n#define NOTE_G1  49\n#define NOTE_GS1  52\n#define NOTE_A1  55\n#define NOTE_AS1  58\n#define NOTE_B1  62\n#define NOTE_C2  65\n#define NOTE_CS2  69\n#define NOTE_D2  73\n#define NOTE_DS2  78\n#define NOTE_E2  82\n#define NOTE_F2  87\n#define NOTE_FS2  93\n#define NOTE_G2  98\n#define NOTE_GS2  104\n#define NOTE_A2  110\n#define NOTE_AS2  117\n#define NOTE_B2  123\n#define NOTE_C3  131\n#define NOTE_CS3  139\n#define NOTE_D3  147\n#define NOTE_DS3  156\n#define NOTE_E3  165\n#define NOTE_F3  175\n#define NOTE_FS3  185\n#define NOTE_G3  196\n#define NOTE_GS3  208\n#define NOTE_A3  220\n#define NOTE_AS3  233\n#define NOTE_B3  247\n#define NOTE_C4  262\n#define NOTE_CS4  277\n#define NOTE_D4  294\n#define NOTE_DS4  311\n#define NOTE_E4  330\n#define NOTE_F4  349\n#define NOTE_FS4  370\n#define NOTE_G4  392\n#define NOTE_GS4  415\n#define NOTE_A4  440\n#define NOTE_AS4  466\n#define NOTE_B4  494\n#define NOTE_C5  523\n#define NOTE_CS5  554\n#define NOTE_D5  587\n#define NOTE_DS5  622\n#define NOTE_E5  659\n#define NOTE_F5  698\n#define NOTE_FS5  740\n#define NOTE_G5  784\n#define NOTE_GS5  831\n#define NOTE_A5  880\n#define NOTE_AS5  932\n#define NOTE_B5  988\n#define NOTE_C6  1047\n#define NOTE_CS6  1109\n#define NOTE_D6  1175\n#define NOTE_DS6  1245\n#define NOTE_E6  1319\n#define NOTE_F6  1397\n#define NOTE_FS6  1480\n#define NOTE_G6  1568\n#define NOTE_GS6  1661\n#define NOTE_A6  1760\n#define NOTE_AS6  1865\n#define NOTE_B6  1976\n#define NOTE_C7  2093\n#define NOTE_CS7  2217\n#define NOTE_D7  2349\n#define NOTE_DS7  2489\n#define NOTE_E7  2637\n#define NOTE_F7  2794\n#define NOTE_FS7  2960\n#define NOTE_G7  3136\n#define NOTE_GS7  3322\n#define NOTE_A7  3520\n#define NOTE_AS7  3729\n#define NOTE_B7  3951\n#define NOTE_C8  4186\n#define NOTE_CS8  4435\n#define NOTE_D8  4699\n#define NOTE_DS8  4978"}],
  },
  {
    name: "toneMultiple",
    source: "arduino-examples",
    category: "02.Digital",
    description: {"es":"Reproduce tonos en múltiples pines en secuencia","en":"Reproduce tonos en múltiples pines en secuencia"},
    comment: {"es":"/*\n  Multiple tone player\n\n  Reproduce tonos en múltiples pines de forma secuencial.\n\n  circuito:\n  - tres parlantes de 8 ohm en los pines digitales 6, 7 y 8\n\n  creado 8 Mar 2010 por Tom Igoe\n  basado en un fragmento de Greg Borenstein\n\n  Este código es de dominio público.\n\n  https://docs.arduino.cc/built-in-examples/digital/toneMultiple/\n\n  Agregado a ArduBlock — 2026-05-31\n*/","en":"/*\n  Multiple tone player\n\n  Plays multiple tones on multiple pins in sequence\n\n  circuit:\n  - three 8 ohm speakers on digital pins 6, 7, and 8\n\n  created 8 Mar 2010 by Tom Igoe\n  based on a snippet from Greg Borenstein\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/digital/toneMultiple/\n\n  Added to ArduBlock — 2026-05-31\n*/"},
    state: _toneMultiple,
  },
];
