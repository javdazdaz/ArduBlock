/**
 * ArduBlock — Ejemplos Arduino (auto-generado por transform-examples.mjs)
 */

import _BareMinimum from '../../examples/blockly-states/arduino-examples/basics/BareMinimum.json';
import _Blink from '../../examples/blockly-states/arduino-examples/basics/Blink.json';
import _AnalogReadSerial from '../../examples/blockly-states/arduino-examples/basics/AnalogReadSerial.json';
import _DigitalReadSerial from '../../examples/blockly-states/arduino-examples/basics/DigitalReadSerial.json';
import _Fade from '../../examples/blockly-states/arduino-examples/basics/Fade.json';
import _ReadAnalogVoltage from '../../examples/blockly-states/arduino-examples/basics/ReadAnalogVoltage.json';

export const basicsExamples = [
  {
    name: "BareMinimum",
    source: "arduino-examples",
    category: "01.Basics",
    description: {"es":"Estructura mínima de un sketch Arduino","en":"Estructura mínima de un sketch Arduino"},
    comment: {"es":"/*\n  BareMinimum\n\n  Este ejemplo contiene el código mínimo necesario para que un sketch\n  compile en Arduino: el método setup() y el método loop().\n\n  Este código es de dominio público.\n\n  https://docs.arduino.cc/built-in-examples/basics/BareMinimum/\n\n  Agregado a ArduBlock — 2026-05-31\n*/","en":"/*\n  BareMinimum\n\n  This example contains the bare minimum of code you need for a sketch\n  to compile on Arduino: the setup() method and the loop() method.\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/basics/BareMinimum/\n\n  Added to ArduBlock — 2026-05-31\n*/"},
    state: _BareMinimum,
  },
  {
    name: "Blink",
    source: "arduino-examples",
    category: "01.Basics",
    description: {"es":"Enciende y apaga un LED cada 1 segundo","en":"Enciende y apaga un LED cada 1 segundo"},
    comment: {"es":"/*\n  Blink\n\n  Enciende un LED por un segundo, luego lo apaga por un segundo,\n  de forma repetida.\n\n  La mayoría de los Arduinos tienen un LED integrado en la placa.\n  En UNO, MEGA y ZERO está en el pin digital 13.\n\n  modificado 8 May 2014 por Scott Fitzgerald\n  modificado 2 Sep 2016 por Arturo Guadalupi\n  modificado 8 Sep 2016 por Colby Newman\n\n  Este código es de dominio público.\n\n  https://docs.arduino.cc/built-in-examples/basics/Blink/\n\n  Agregado a ArduBlock — 2026-05-31\n*/","en":"/*\n  Blink\n\n  Turns an LED on for one second, then off for one second, repeatedly.\n\n  Most Arduinos have an on-board LED you can control. On the UNO, MEGA and ZERO\n  it is attached to digital pin 13, on MKR1000 on pin 6. LED_BUILTIN is set to\n  the correct LED pin independent of which board is used.\n\n  modified 8 May 2014 by Scott Fitzgerald\n  modified 2 Sep 2016 by Arturo Guadalupi\n  modified 8 Sep 2016 by Colby Newman\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/basics/Blink/\n\n  Added to ArduBlock — 2026-05-31\n*/"},
    state: _Blink,
  },
  {
    name: "AnalogReadSerial",
    source: "arduino-examples",
    category: "01.Basics",
    description: {"es":"Lee un pin analógico y lo imprime por Serial","en":"Lee un pin analógico y lo imprime por Serial"},
    comment: {"es":"/*\n  AnalogReadSerial\n\n  Lee una entrada analógica en el pin 0 e imprime el resultado\n  en el Monitor Serial. Se puede usar el Serial Plotter para\n  ver una gráfica (Herramientas > Serial Plotter).\n\n  Conectá el pin central de un potenciómetro a A0,\n  y los pines externos a +5V y tierra.\n\n  Este código es de dominio público.\n\n  https://docs.arduino.cc/built-in-examples/basics/AnalogReadSerial/\n\n  Agregado a ArduBlock — 2026-05-31\n*/","en":"/*\n  AnalogReadSerial\n\n  Reads an analog input on pin 0, prints the result to the Serial Monitor.\n  Graphical representation is available using Serial Plotter (Tools > Serial Plotter menu).\n  Attach the center pin of a potentiometer to pin A0, and the outside pins to +5V and ground.\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/basics/AnalogReadSerial/\n\n  Added to ArduBlock — 2026-05-31\n*/"},
    state: _AnalogReadSerial,
  },
  {
    name: "DigitalReadSerial",
    source: "arduino-examples",
    category: "01.Basics",
    description: {"es":"Lee un pin digital y lo imprime por Serial","en":"Lee un pin digital y lo imprime por Serial"},
    comment: {"es":"/*\n  DigitalReadSerial\n\n  Lee una entrada digital en el pin 2 e imprime el resultado\n  en el Monitor Serial.\n\n  Conectá un pulsador al pin 2. Al presionarlo, el pin lee HIGH.\n  Al soltarlo, lee LOW.\n\n  Este código es de dominio público.\n\n  https://docs.arduino.cc/built-in-examples/basics/DigitalReadSerial/\n\n  Agregado a ArduBlock — 2026-05-31\n*/","en":"/*\n  DigitalReadSerial\n\n  Reads a digital input on pin 2, prints the result to the Serial Monitor\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/basics/DigitalReadSerial/\n\n  Added to ArduBlock — 2026-05-31\n*/"},
    state: _DigitalReadSerial,
  },
  {
    name: "Fade",
    source: "arduino-examples",
    category: "01.Basics",
    description: {"es":"Aumenta y disminuye el brillo de un LED con PWM","en":"Aumenta y disminuye el brillo de un LED con PWM"},
    comment: {"es":"/*\n  Fade\n\n  Este ejemplo muestra cómo hacer un fade (aumento y disminución\n  de brillo) en un LED conectado al pin 9 usando analogWrite().\n\n  La función analogWrite() usa PWM. Si querés cambiar de pin,\n  asegurate de usar uno con capacidad PWM (~3, ~5, ~6, ~9, ~10, ~11).\n\n  Este código es de dominio público.\n\n  https://docs.arduino.cc/built-in-examples/basics/Fade/\n\n  Agregado a ArduBlock — 2026-05-31\n*/","en":"/*\n  Fade\n\n  This example shows how to fade an LED on pin 9 using the analogWrite() function.\n\n  The analogWrite() function uses PWM, so if you want to change the pin you're\n  using, be sure to use another PWM capable pin. On most Arduino, the PWM pins\n  are identified with a \"~\" sign, like ~3, ~5, ~6, ~9, ~10 and ~11.\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/basics/Fade/\n\n  Added to ArduBlock — 2026-05-31\n*/"},
    state: _Fade,
  },
  {
    name: "ReadAnalogVoltage",
    source: "arduino-examples",
    category: "01.Basics",
    description: {"es":"Lee voltaje analógico y lo imprime por Serial","en":"Lee voltaje analógico y lo imprime por Serial"},
    comment: {"es":"/*\n  ReadAnalogVoltage\n\n  Lee una entrada analógica en el pin 0, la convierte a voltaje\n  e imprime el resultado en el Monitor Serial.\n\n  Conectá el pin central de un potenciómetro a A0,\n  y los pines externos a +5V y tierra.\n\n  Este código es de dominio público.\n\n  https://docs.arduino.cc/built-in-examples/basics/ReadAnalogVoltage/\n\n  Agregado a ArduBlock — 2026-05-31\n*/","en":"/*\n  ReadAnalogVoltage\n\n  Reads an analog input on pin 0, converts it to voltage, and prints the result\n  to the Serial Monitor. Graphical representation is available using Serial\n  Plotter (Tools > Serial Plotter menu). Attach the center pin of a potentiometer\n  to pin A0, and the outside pins to +5V and ground.\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/basics/ReadAnalogVoltage/\n\n  Added to ArduBlock — 2026-05-31\n*/"},
    state: _ReadAnalogVoltage,
  },
];
