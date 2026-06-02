/**
 * ArduBlock — Ejemplos Arduino (auto-generado por transform-examples.mjs)
 */

import _Dimmer from '../../examples/blockly-states/arduino-examples/communication/Dimmer.json';
import _Graph from '../../examples/blockly-states/arduino-examples/communication/Graph.json';
import _PhysicalPixel from '../../examples/blockly-states/arduino-examples/communication/PhysicalPixel.json';
import _ReadASCIIString from '../../examples/blockly-states/arduino-examples/communication/ReadASCIIString.json';
import _SerialCallResponse from '../../examples/blockly-states/arduino-examples/communication/SerialCallResponse.json';
import _SerialCallResponseASCII from '../../examples/blockly-states/arduino-examples/communication/SerialCallResponseASCII.json';
import _VirtualColorMixer from '../../examples/blockly-states/arduino-examples/communication/VirtualColorMixer.json';

export const communicationExamples = [
  {
    name: "Dimmer",
    source: "arduino-examples",
    category: "04.Communication",
    description: {"es":"Controla el brillo de un LED recibiendo bytes por Serial","en":"Controla el brillo de un LED recibiendo bytes por Serial"},
    comment: {"es":"/*\n  Dimmer\n\n  Demuestra cómo enviar datos de la computadora a la placa Arduino,\n  en este caso para controlar el brillo de un LED. Los datos se envían\n  en bytes individuales, cada uno entre 0 y 255. Arduino lee estos bytes\n  y los usa para ajustar el brillo del LED.\n\n  El circuito:\n  - LED conectado del pin digital 9 a tierra con resistencia de 220 ohm.\n\n  creado 2006 por David A. Mellis\n  modificado 30 Ago 2011 por Tom Igoe y Scott Fitzgerald\n\n  Este código es de dominio público.\n\n  https://docs.arduino.cc/built-in-examples/communication/Dimmer/\n\n  Agregado a ArduBlock — 2026-06-01\n*/","en":"/*\n  Dimmer\n\n  Demonstrates sending data from the computer to the Arduino board, in this case\n  to control the brightness of an LED. The data is sent in individual bytes,\n  each of which ranges from 0 to 255. Arduino reads these bytes and uses them to\n  set the brightness of the LED.\n\n  The circuit:\n  - LED attached from digital pin 9 to ground through 220 ohm resistor.\n\n  created 2006\n  by David A. Mellis\n  modified 30 Aug 2011\n  by Tom Igoe and Scott Fitzgerald\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/communication/Dimmer/\n\n  Added to ArduBlock — 2026-06-01\n*/"},
    state: _Dimmer,
  },
  {
    name: "Graph",
    source: "arduino-examples",
    category: "04.Communication",
    description: {"es":"Envía el valor del pin analógico A0 por Serial para graficarlo en la PC","en":"Envía el valor del pin analógico A0 por Serial para graficarlo en la PC"},
    comment: {"es":"/*\n  Graph\n\n  Un ejemplo simple de comunicación desde la placa Arduino a la computadora:\n  se envía por el puerto serial el valor de la entrada analógica 0.\n\n  Podés usar el Monitor Serial de Arduino para ver los datos, o leerlos\n  con Processing, PD, Max/MSP, u otro programa capaz de leer del puerto serial.\n\n  El circuito:\n  - cualquier sensor analógico conectado al pin A0\n\n  creado 2006 por David A. Mellis\n  modificado 9 Abr 2012 por Tom Igoe y Scott Fitzgerald\n\n  Este código es de dominio público.\n\n  https://docs.arduino.cc/built-in-examples/communication/Graph/\n\n  Agregado a ArduBlock — 2026-05-31\n*/","en":"/*\n  Graph\n\n  A simple example of communication from the Arduino board to the computer: The\n  value of analog input 0 is sent out the serial port.\n\n  You can use the Arduino Serial Monitor to view the sent data, or it can be\n  read by Processing, PD, Max/MSP, or any other program capable of reading data\n  from a serial port.\n\n  The circuit:\n  - any analog input sensor attached to analog in pin 0\n\n  created 2006\n  by David A. Mellis\n  modified 9 Apr 2012\n  by Tom Igoe and Scott Fitzgerald\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/communication/Graph/\n\n  Added to ArduBlock — 2026-05-31\n*/"},
    state: _Graph,
  },
  {
    name: "PhysicalPixel",
    source: "arduino-examples",
    category: "04.Communication",
    description: {"es":"Enciende/apaga un LED al recibir los caracteres H/L por Serial","en":"Enciende/apaga un LED al recibir los caracteres H/L por Serial"},
    comment: {"es":"/*\n  Physical Pixel\n\n  Un ejemplo de cómo usar la placa Arduino para recibir datos de la\n  computadora. En este caso, Arduino enciende un LED cuando recibe el\n  carácter 'H' y lo apaga cuando recibe 'L'.\n\n  Los datos se pueden enviar desde el Monitor Serial de Arduino, o desde\n  otro programa como Processing, Flash, PD o Max/MSP.\n\n  El circuito:\n  - LED conectado del pin digital 13 a tierra con resistencia de 220 ohm\n\n  creado 2006 por David A. Mellis\n  modificado 30 Ago 2011 por Tom Igoe y Scott Fitzgerald\n\n  Este código es de dominio público.\n\n  https://docs.arduino.cc/built-in-examples/communication/PhysicalPixel/\n\n  Agregado a ArduBlock — 2026-06-01\n*/","en":"/*\n  Physical Pixel\n\n  An example of using the Arduino board to receive data from the computer. In\n  this case, the Arduino boards turns on an LED when it receives the character\n  'H', and turns off the LED when it receives the character 'L'.\n\n  The data can be sent from the Arduino Serial Monitor, or another program like\n  Processing, Flash, PD, or Max/MSP.\n\n  The circuit:\n  - LED connected from digital pin 13 to ground through 220 ohm resistor\n\n  created 2006\n  by David A. Mellis\n  modified 30 Aug 2011\n  by Tom Igoe and Scott Fitzgerald\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/communication/PhysicalPixel/\n\n  Added to ArduBlock — 2026-06-01\n*/"},
    state: _PhysicalPixel,
  },
  {
    name: "ReadASCIIString",
    source: "arduino-examples",
    category: "04.Communication",
    description: {"es":"Recibe valores RGB por Serial (parseInt) y los muestra en un LED RGB","en":"Recibe valores RGB por Serial (parseInt) y los muestra en un LED RGB"},
    comment: {"es":"/*\n  Leyendo un string ASCII por Serial\n\n  Este sketch demuestra la funcion Serial.parseInt().\n  Busca un string ASCII de valores separados por coma,\n  los convierte a int y los usa para controlar un LED RGB.\n\n  Circuito: LED RGB catodo comun:\n  - anodo rojo:  pin digital 3 con resistencia 220 ohm\n  - anodo verde: pin digital 5 con resistencia 220 ohm\n  - anodo azul:  pin digital 6 con resistencia 220 ohm\n  - catodo: GND\n\n  creado 13 Abr 2012 por Tom Igoe\n  modificado 14 Mar 2016 por Arturo Guadalupi\n\n  Este codigo es de dominio publico.\n\n  https://docs.arduino.cc/built-in-examples/communication/ReadASCIIString/\n\n  Agregado a ArduBlock — 2026-06-01\n*/","en":"/*\n  Reading a serial ASCII-encoded string.\n\n  This sketch demonstrates the Serial parseInt() function.\n  It looks for an ASCII string of comma-separated values.\n  It parses them into ints, and uses those to fade an RGB LED.\n\n  Circuit: Common-Cathode RGB LED wired like so:\n  - red anode: digital pin 3 through 220 ohm resistor\n  - green anode: digital pin 5 through 220 ohm resistor\n  - blue anode: digital pin 6 through 220 ohm resistor\n  - cathode: GND\n\n  created 13 Apr 2012\n  by Tom Igoe\n  modified 14 Mar 2016\n  by Arturo Guadalupi\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/communication/ReadASCIIString/\n\n  Added to ArduBlock — 2026-06-01\n*/"},
    state: _ReadASCIIString,
  },
  {
    name: "SerialCallResponse",
    source: "arduino-examples",
    category: "04.Communication",
    description: {"es":"Protocolo de handshake Serial: responde con 3 valores de sensores al recibir un byte","en":"Protocolo de handshake Serial: responde con 3 valores de sensores al recibir un byte"},
    comment: {"es":"/*\n  Serial Call and Response\n\n  Este programa envia una 'A' ASCII (byte 65) al iniciar\n  y la repite hasta recibir datos. Luego espera un byte\n  en el puerto serial y envia tres valores de sensores.\n\n  El circuito:\n  - potenciometros en entradas analogicas A0 y A1\n  - pulsador en pin digital 2\n\n  creado 26 Sep 2005 por Tom Igoe\n  modificado 24 Abr 2012 por Tom Igoe y Scott Fitzgerald\n\n  Este codigo es de dominio publico.\n\n  https://docs.arduino.cc/built-in-examples/communication/SerialCallResponse/\n\n  Agregado a ArduBlock — 2026-06-01\n*/","en":"/*\n  Serial Call and Response\n  Language: Wiring/Arduino\n\n  This program sends an ASCII A (byte of value 65) on startup and repeats that\n  until it gets some data in. Then it waits for a byte in the serial port, and\n  sends three sensor values whenever it gets a byte in.\n\n  The circuit:\n  - potentiometers attached to analog inputs 0 and 1\n  - pushbutton attached to digital I/O 2\n\n  created 26 Sep 2005\n  by Tom Igoe\n  modified 24 Apr 2012\n  by Tom Igoe and Scott Fitzgerald\n  Thanks to Greg Shakar and Scott Fitzgerald for the improvements\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/communication/SerialCallResponse/\n\n  Added to ArduBlock — 2026-06-01\n*/"},
    state: _SerialCallResponse,
  },
  {
    name: "SerialCallResponseASCII",
    source: "arduino-examples",
    category: "04.Communication",
    description: {"es":"Handshake Serial ASCII: envía 3 valores de sensores separados por coma al recibir un byte","en":"Handshake Serial ASCII: envía 3 valores de sensores separados por coma al recibir un byte"},
    comment: {"es":"/*\n  Serial Call and Response en ASCII\n\n  Este programa envia \"0,0,0\" al iniciar y lo repite\n  hasta recibir datos. Luego espera un byte en Serial y\n  responde con los tres valores de sensores separados por\n  coma con salto de linea.\n\n  El circuito:\n  - potenciometros en entradas analogicas A0 y A1\n  - pulsador en pin digital 2\n\n  creado 26 Sep 2005 por Tom Igoe\n  modificado 24 Abr 2012 por Tom Igoe y Scott Fitzgerald\n\n  Este codigo es de dominio publico.\n\n  https://docs.arduino.cc/built-in-examples/communication/SerialCallResponseASCII/\n\n  Agregado a ArduBlock — 2026-06-01\n*/","en":"/*\n  Serial Call and Response in ASCII\n  Language: Wiring/Arduino\n\n  This program sends an ASCII A (byte of value 65) on startup and repeats that\n  until it gets some data in. Then it waits for a byte in the serial port, and\n  sends three ASCII-encoded, comma-separated sensor values, truncated by a\n  linefeed and carriage return, whenever it gets a byte in.\n\n  The circuit:\n  - potentiometers attached to analog inputs 0 and 1\n  - pushbutton attached to digital I/O 2\n\n  created 26 Sep 2005\n  by Tom Igoe\n  modified 24 Apr 2012\n  by Tom Igoe and Scott Fitzgerald\n  Thanks to Greg Shakar and Scott Fitzgerald for the improvements\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/communication/SerialCallResponseASCII/\n\n  Added to ArduBlock — 2026-06-01\n*/"},
    state: _SerialCallResponseASCII,
  },
  {
    name: "Midi",
    source: "arduino-examples",
    category: "04.Communication",
    description: {"es":"Reproduce notas MIDI en secuencia usando el pin Serial TX","en":"Reproduce notas MIDI en secuencia usando el pin Serial TX"},
    comment: "/*\n  MIDI note player\n\n  This sketch shows how to use the serial transmit pin (pin 1) to send MIDI note data.\n  If this circuit is connected to a MIDI synth, it will play the notes\n  F#-0 (0x1E) to F#-5 (0x5A) in sequence.\n\n  The circuit:\n  - digital in 1 connected to MIDI jack pin 5\n  - MIDI jack pin 2 connected to ground\n  - MIDI jack pin 4 connected to +5V through 220 ohm resistor\n  - Attach a MIDI cable to the jack, then to a MIDI synth, and play music.\n\n  created 13 Jun 2006\n  modified 13 Aug 2012\n  by Tom Igoe\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/communication/Midi/\n\n  Added to ArduBlock — 2026-05-31\n*/",
    reason: "NOT_CONVERTIBLE",
    note: "Requiere hardware MIDI (jack, sintetizador), baud rate 31250 y función custom noteOn(). No representable en bloques.",
  },
  {
    name: "MultiSerial",
    source: "arduino-examples",
    category: "04.Communication",
    description: {"es":"Puente Serial bidireccional entre Serial y Serial1 (solo Mega/Due/Zero)","en":"Puente Serial bidireccional entre Serial y Serial1 (solo Mega/Due/Zero)"},
    comment: "/*\n  Multiple Serial test\n\n  Receives from the main serial port, sends to the others.\n  Receives from serial port 1, sends to the main serial (Serial 0).\n\n  This example works only with boards with more than one serial like Arduino Mega, Due, Zero etc.\n\n  The circuit:\n  - any serial device attached to Serial port 1\n  - Serial Monitor open on Serial port 0\n\n  created 30 Dec 2008\n  modified 20 May 2012\n  by Tom Igoe & Jed Roach\n  modified 27 Nov 2015\n  by Arturo Guadalupi\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/communication/MultiSerialMega/\n\n  Added to ArduBlock — 2026-05-31\n*/",
    reason: "NOT_CONVERTIBLE",
    note: "Usa Serial1 que solo existe en Arduino Mega/Due/Zero. No compatible con Arduino Uno.",
  },
  {
    name: "ASCIITable",
    source: "arduino-examples",
    category: "04.Communication",
    description: {"es":"Imprime la tabla ASCII completa con sus representaciones decimal, hex, octal y binario","en":"Imprime la tabla ASCII completa con sus representaciones decimal, hex, octal y binario"},
    comment: "/*\n  ASCII table\n\n  Prints out byte values in all possible formats:\n  - as raw binary values\n  - as ASCII-encoded decimal, hex, octal, and binary values\n\n  For more on ASCII, see http://www.asciitable.com and http://en.wikipedia.org/wiki/ASCII\n\n  The circuit: No external hardware needed.\n\n  created 2006\n  by Nicholas Zambetti <http://www.zambetti.com>\n  modified 9 Apr 2012\n  by Tom Igoe\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/communication/ASCIITable/\n\n  Added to ArduBlock — 2026-06-01\n*/",
    reason: "NOT_CONVERTIBLE",
    note: "Usa Serial.print(n, HEX), Serial.print(n, OCT) y Serial.print(n, BIN) para mostrar valores en distintas bases numéricas. ArduBlock no tiene bloques con formato de salida (DEC/HEX/OCT/BIN). También usa Serial.write() para enviar el byte crudo y un bucle infinito al final.",
  },
  {
    name: "SerialEvent",
    source: "arduino-examples",
    category: "04.Communication",
    description: {"es":"Acumula caracteres recibidos por Serial usando el callback serialEvent()","en":"Acumula caracteres recibidos por Serial usando el callback serialEvent()"},
    comment: "/*\n  Serial Event example\n\n  When new serial data arrives, this sketch adds it to a String.\n  When a newline is received, the loop prints the string and clears it.\n\n  A good test for this is to try it with a GPS receiver that sends out\n  NMEA 0183 sentences.\n\n  NOTE: The serialEvent() feature is not available on the Leonardo, Micro, or\n  other ATmega32U4 based boards.\n\n  created 9 May 2011\n  by Tom Igoe\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/communication/SerialEvent/\n\n  Added to ArduBlock — 2026-06-01\n*/",
    reason: "NOT_CONVERTIBLE",
    note: "Define la funcion custom serialEvent() que Arduino llama automaticamente entre iteraciones de loop() cuando llegan datos por Serial. ArduBlock no puede definir funciones con nombre reservado ni callbacks. Tambien usa el tipo String (objeto) y concatenacion con +=.",
  },
  {
    name: "SerialPassthrough",
    source: "arduino-examples",
    category: "04.Communication",
    description: {"es":"Puente Serial entre el puerto USB y los pines 0-1 (emula passthrough en placas con USB nativo)","en":"Puente Serial entre el puerto USB y los pines 0-1 (emula passthrough en placas con USB nativo)"},
    comment: "/*\n  SerialPassthrough sketch\n\n  Some boards, like the Arduino 101, the MKR1000, Zero, or the Micro, have one\n  hardware serial port attached to Digital pins 0-1, and a separate USB serial\n  port attached to the IDE Serial Monitor. This means that the \"serial\n  passthrough\" which is possible with the Arduino UNO (commonly used to interact\n  with devices/shields that require configuration via serial AT commands) will\n  not work by default.\n\n  This sketch allows you to emulate the serial passthrough behaviour. Any text\n  you type in the IDE Serial monitor will be written out to the serial port on\n  Digital pins 0 and 1, and vice-versa.\n\n  On the 101, MKR1000, Zero, and Micro, \"Serial\" refers to the USB Serial port\n  attached to the Serial Monitor, and \"Serial1\" refers to the hardware serial\n  port attached to pins 0 and 1. This sketch will emulate Serial passthrough\n  using those two Serial ports on the boards mentioned above, but you can change\n  these names to connect any two serial ports on a board that has multiple ports.\n\n  created 23 May 2016\n  by Erik Nyquist\n\n  https://docs.arduino.cc/built-in-examples/communication/SerialPassthrough/\n\n  Added to ArduBlock — 2026-06-01\n*/",
    reason: "NOT_CONVERTIBLE",
    note: "Usa Serial1 (segundo puerto hardware) que solo existe en placas con USB nativo (Zero, MKR1000, Micro, 101). ArduBlock apunta a Arduino Uno que no tiene Serial1. Ademas usa Serial.available() y Serial.read() encadenados directamente como argumento de Serial1.write().",
  },
  {
    name: "VirtualColorMixer",
    source: "arduino-examples",
    category: "04.Communication",
    description: {"es":"Mezclador RGB virtual: recibe 3 valores por Serial y los aplica a un LED RGB","en":"Mezclador RGB virtual: recibe 3 valores por Serial y los aplica a un LED RGB"},
    comment: {"es":"/*\n  Mezclador de color virtual\n\n  Este ejemplo lee tres valores enteros del puerto Serial\n  (para rojo, verde y azul) y los usa para controlar\n  un LED RGB mediante PWM.\n\n  Envia valores como \"255,128,0\" desde el Monitor Serial\n  o desde Processing.\n\n  Circuito: LED RGB catodo comun:\n  - anodo rojo:  pin 9 con resistencia 220 ohm\n  - anodo verde: pin 10 con resistencia 220 ohm\n  - anodo azul:  pin 11 con resistencia 220 ohm\n  - catodo: GND\n\n  creado 2007 por David A. Mellis\n  modificado 30 Ago 2011 por Tom Igoe\n\n  Este codigo es de dominio publico.\n\n  https://docs.arduino.cc/built-in-examples/communication/VirtualColorMixer/\n\n  Agregado a ArduBlock — 2026-06-01\n*/","en":"/*\n  Virtual Color Mixer\n\n  This example reads three integer values from the serial port\n  (for red, green, and blue) and uses them to drive an RGB LED\n  via PWM.\n\n  Send values like \"255,128,0\" from the Serial Monitor or Processing.\n\n  Circuit: Common-Cathode RGB LED:\n  - red anode:   pin 9 through 220 ohm resistor\n  - green anode: pin 10 through 220 ohm resistor\n  - blue anode:  pin 11 through 220 ohm resistor\n  - cathode: GND\n\n  created 2007\n  by David A. Mellis\n  modified 30 Aug 2011\n  by Tom Igoe\n\n  This example code is in the public domain.\n\n  https://docs.arduino.cc/built-in-examples/communication/VirtualColorMixer/\n\n  Added to ArduBlock — 2026-06-01\n*/"},
    state: _VirtualColorMixer,
  },
];
