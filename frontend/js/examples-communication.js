/**
 * ArduBlock — Ejemplos 04.Communication como workspace states
 * Cada ejemplo tiene: name, description, comment (header .ino), state (Blockly JSON)
 * o reason/note si no es convertible.
 */
export const communicationExamples = [
  // ═══ 1. Dimmer ════════════════════════════════
  {
    name: 'Dimmer',
    category: '04.Communication',
    description: 'Controla el brillo de un LED recibiendo bytes por Serial',
    comment: `/*
  Dimmer

  Demonstrates sending data from the computer to the Arduino board, in this case
  to control the brightness of an LED. The data is sent in individual bytes,
  each of which ranges from 0 to 255. Arduino reads these bytes and uses them to
  set the brightness of the LED.

  The circuit:
  - LED attached from digital pin 9 to ground through 220 ohm resistor.
  - Serial connection to Processing, Max/MSP, or another serial application

  created 2006
  by David A. Mellis
  modified 30 Aug 2011
  by Tom Igoe and Scott Fitzgerald

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/communication/Dimmer/
*/
Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa Serial.available() y Serial.read() para recibir bytes y controlar LED con analogWrite. No existen bloques serial_read / serial_available en ArduBlock.'
  },

  // ═══ 2. Graph ═════════════════════════════════
  {
    name: 'Graph',
    category: '04.Communication',
    description: 'Envía el valor del pin analógico A0 por Serial para graficarlo en la PC',
    comment: `/*
  Graph

  A simple example of communication from the Arduino board to the computer: The
  value of analog input 0 is sent out the serial port. We call this "serial"
  communication because the connection appears to both the Arduino and the
  computer as a serial port, even though it may actually use a USB cable. Bytes
  are sent one after another (serially) from the Arduino to the computer.

  You can use the Arduino Serial Monitor to view the sent data, or it can be
  read by Processing, PD, Max/MSP, or any other program capable of reading data
  from a serial port. The Processing code below graphs the data received so you
  can see the value of the analog input changing over time.

  The circuit:
  - any analog input sensor attached to analog in pin 0

  created 2006
  by David A. Mellis
  modified 9 Apr 2012
  by Tom Igoe and Scott Fitzgerald

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/communication/Graph/
*/
Agregado a ArduBlock — 2026-05-31`,
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'arduino_setup', id: 'g1', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'serial_begin', id: 'g2',
                  fields: { BAUD: '9600' }
                }
              }
            }
          },
          {
            type: 'arduino_loop', id: 'g3', x: 20, y: 160,
            inputs: {
              BODY: {
                block: {
                  type: 'serial_println', id: 'g4',
                  inputs: {
                    TEXT: {
                      block: {
                        type: 'analog_read', id: 'g5',
                        fields: { PIN: 0 }
                      }
                    }
                  },
                  next: {
                    block: {
                      type: 'delay_ms', id: 'g6',
                      fields: { DELAY: 2 }
                    }
                  }
                }
              }
            }
          }
        ]
      }
    }
  },

  // ═══ 3. PhysicalPixel ═════════════════════════
  {
    name: 'PhysicalPixel',
    category: '04.Communication',
    description: 'Enciende/apaga un LED al recibir los caracteres H/L por Serial',
    comment: `/*
  Physical Pixel

  An example of using the Arduino board to receive data from the computer. In
  this case, the Arduino boards turns on an LED when it receives the character
  'H', and turns off the LED when it receives the character 'L'.

  The data can be sent from the Arduino Serial Monitor, or another program like
  Processing (see code below), Flash (via a serial-net proxy), PD, or Max/MSP.

  The circuit:
  - LED connected from digital pin 13 to ground through 220 ohm resistor

  created 2006
  by David A. Mellis
  modified 30 Aug 2011
  by Tom Igoe and Scott Fitzgerald

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/communication/PhysicalPixel/
*/
Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa Serial.available() y Serial.read() para recibir caracteres (H/L) y controlar LED con digitalWrite. No existen bloques serial_read / serial_available en ArduBlock.'
  },

  // ═══ 4. ReadASCIIString ═══════════════════════
  {
    name: 'ReadASCIIString',
    category: '04.Communication',
    description: 'Recibe valores RGB por Serial (parseInt) y los muestra en un LED RGB',
    comment: `/*
  Reading a serial ASCII-encoded string.

  This sketch demonstrates the Serial parseInt() function.
  It looks for an ASCII string of comma-separated values.
  It parses them into ints, and uses those to fade an RGB LED.

  Circuit: Common-Cathode RGB LED wired like so:
  - red anode: digital pin 3 through 220 ohm resistor
  - green anode: digital pin 5 through 220 ohm resistor
  - blue anode: digital pin 6 through 220 ohm resistor
  - cathode: GND

  created 13 Apr 2012
  by Tom Igoe
  modified 14 Mar 2016
  by Arturo Guadalupi

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/communication/ReadASCIIString/
*/
Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa Serial.parseInt() tres veces para parsear valores RGB separados por coma, Serial.read() para detectar newline, y analogWrite para LED RGB. Requiere bloques serial_read, serial_available y parseInt no disponibles en ArduBlock.'
  },

  // ═══ 5. SerialCallResponse ════════════════════
  {
    name: 'SerialCallResponse',
    category: '04.Communication',
    description: 'Protocolo de handshake Serial: responde con 3 valores de sensores al recibir un byte',
    comment: `/*
  Serial Call and Response
  Language: Wiring/Arduino

  This program sends an ASCII A (byte of value 65) on startup and repeats that
  until it gets some data in. Then it waits for a byte in the serial port, and
  sends three sensor values whenever it gets a byte in.

  The circuit:
  - potentiometers attached to analog inputs 0 and 1
  - pushbutton attached to digital I/O 2

  created 26 Sep 2005
  by Tom Igoe
  modified 24 Apr 2012
  by Tom Igoe and Scott Fitzgerald
  Thanks to Greg Shakar and Scott Fitzgerald for the improvements

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/communication/SerialCallResponse/
*/
Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Implementa protocolo de handshake call-response con establishContact(), usa Serial.available(), Serial.read(), Serial.write(), analogRead, digitalRead y map(). Requiere bloques serial_read/serial_available y soporte para funciones custom no disponibles en ArduBlock.'
  },

  // ═══ 6. SerialCallResponseASCII ═══════════════
  {
    name: 'SerialCallResponseASCII',
    category: '04.Communication',
    description: 'Handshake Serial ASCII: envía 3 valores de sensores separados por coma al recibir un byte',
    comment: `/*
  Serial Call and Response in ASCII
  Language: Wiring/Arduino

  This program sends an ASCII A (byte of value 65) on startup and repeats that
  until it gets some data in. Then it waits for a byte in the serial port, and
  sends three ASCII-encoded, comma-separated sensor values, truncated by a
  linefeed and carriage return, whenever it gets a byte in.

  The circuit:
  - potentiometers attached to analog inputs 0 and 1
  - pushbutton attached to digital I/O 2

  created 26 Sep 2005
  by Tom Igoe
  modified 24 Apr 2012
  by Tom Igoe and Scott Fitzgerald
  Thanks to Greg Shakar and Scott Fitzgerald for the improvements

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/communication/SerialCallResponseASCII/
*/
Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Similar a SerialCallResponse pero con salida ASCII (valores separados por coma). Implementa handshake con establishContact(), usa Serial.available() y Serial.read(). Requiere bloques serial_read/serial_available no disponibles en ArduBlock.'
  },

  // ═══ 7. Midi ══════════════════════════════════
  {
    name: 'Midi',
    category: '04.Communication',
    description: 'Reproduce notas MIDI en secuencia usando el pin Serial TX',
    comment: `/*
  MIDI note player

  This sketch shows how to use the serial transmit pin (pin 1) to send MIDI note data.
  If this circuit is connected to a MIDI synth, it will play the notes
  F#-0 (0x1E) to F#-5 (0x5A) in sequence.

  The circuit:
  - digital in 1 connected to MIDI jack pin 5
  - MIDI jack pin 2 connected to ground
  - MIDI jack pin 4 connected to +5V through 220 ohm resistor
  - Attach a MIDI cable to the jack, then to a MIDI synth, and play music.

  created 13 Jun 2006
  modified 13 Aug 2012
  by Tom Igoe

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/communication/Midi/
*/
Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere hardware MIDI (jack MIDI, sintetizador), usa baud rate MIDI específico (31250) y envía secuencias de bytes del protocolo MIDI mediante función custom noteOn(). Hardware y protocolo MIDI no representables en bloques ArduBlock.'
  },

  // ═══ 8. MultiSerial ═══════════════════════════
  {
    name: 'MultiSerial',
    category: '04.Communication',
    description: 'Puente Serial bidireccional entre Serial y Serial1 (solo Mega/Due/Zero)',
    comment: `/*
  Multiple Serial test

  Receives from the main serial port, sends to the others.
  Receives from serial port 1, sends to the main serial (Serial 0).

  This example works only with boards with more than one serial like Arduino Mega, Due, Zero etc.

  The circuit:
  - any serial device attached to Serial port 1
  - Serial Monitor open on Serial port 0

  created 30 Dec 2008
  modified 20 May 2012
  by Tom Igoe & Jed Roach
  modified 27 Nov 2015
  by Arturo Guadalupi

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/communication/MultiSerialMega/
*/
Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa Serial1 (hardware UART #1) que solo existe en Arduino Mega, Due, Zero, etc. No compatible con Arduino Uno estándar. ArduBlock no tiene bloque para Serial1 ni configuración multi-UART.'
  }
];
