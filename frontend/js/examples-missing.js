/**
 * ArduBlock — Ejemplos faltantes (02.Digital, 05.Control, 06.Sensors)
 */
export const missingExamples = [
  {
    name: 'toneMelody',
    category: '02.Digital',
    description: 'Reproduce una melodía con tonos',
    comment: `/*
  Melody — Plays a melody
  circuit: 8 ohm speaker on digital pin 8
  created 21 Jan 2010 by Tom Igoe
  This example code is in the public domain.
*/
Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa arrays (melody[], noteDurations[]) y #include "pitches.h" para definir notas musicales. Sin soporte de arrays ni archivos de cabecera externos.'
  },

  {
    name: 'toneMultiple',
    category: '02.Digital',
    description: 'Reproduce tonos en múltiples pines en secuencia',
    comment: `/*
  Multiple tone player — Plays multiple tones on multiple pins in sequence
  circuit: three 8 ohm speakers on digital pins 6, 7, and 8
  created 8 Mar 2010 by Tom Igoe
  This example code is in the public domain.
*/
Agregado a ArduBlock — 2026-05-31`,
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          { type: 'arduino_setup', id: 'tm1', x: 20, y: 20 },
          {
            type: 'arduino_loop', id: 'tm2', x: 20, y: 120,
            inputs: {
              BODY: {
                block: {
                  type: 'no_tone_output', id: 'tm3',
                  fields: { PIN: 8 },
                  next: {
                    block: {
                      type: 'tone_output', id: 'tm4',
                      fields: { PIN: 6, FREQ: 440 },
                      next: {
                        block: {
                          type: 'delay_ms', id: 'tm5',
                          fields: { MS: 200 },
                          next: {
                            block: {
                              type: 'no_tone_output', id: 'tm6',
                              fields: { PIN: 6 },
                              next: {
                                block: {
                                  type: 'tone_output', id: 'tm7',
                                  fields: { PIN: 7, FREQ: 494 },
                                  next: {
                                    block: {
                                      type: 'delay_ms', id: 'tm8',
                                      fields: { MS: 500 },
                                      next: {
                                        block: {
                                          type: 'no_tone_output', id: 'tm9',
                                          fields: { PIN: 7 },
                                          next: {
                                            block: {
                                              type: 'tone_output', id: 'tm10',
                                              fields: { PIN: 8, FREQ: 523 },
                                              next: {
                                                block: {
                                                  type: 'delay_ms', id: 'tm11',
                                                  fields: { MS: 300 }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
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

  {
    name: 'StateChangeDetection',
    category: '02.Digital',
    description: 'Detección de cambio de estado (flanco) de un pulsador',
    comment: `/*
  State change detection (edge detection)
  created 27 Sep 2005, modified 30 Aug 2011 by Tom Igoe
  This example code is in the public domain.
*/
Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa digitalWrite(ledPin, ledState) con variable dinámica — el bloque digital_write solo acepta dropdown estático HIGH/LOW. Además el contador buttonPushCounter++ requiere variable_set con auto-incremento no disponible.'
  },

  {
    name: 'Debounce',
    category: '02.Digital',
    description: 'Anti-rebote de pulsador con millis()',
    comment: `/*
  Debounce — Each time the input pin goes from LOW to HIGH the output pin toggles.
  created 21 Nov 2006 by David A. Mellis
  modified 30 Aug 2011 by Limor Fried, 28 Dec 2012 by Mike Walters
  This example code is in the public domain.
*/
Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Máquina de estados compleja con millis(), múltiples variables de tiempo (lastDebounceTime, debounceDelay) y toggle ledState = !ledState. El workspace resultante sería excesivamente complejo para uso educativo, y el toggle requiere digital_write con entrada de valor dinámica que no existe.'
  },

  {
    name: 'Arrays',
    category: '05.Control',
    description: 'Demostración de arrays para controlar LEDs en orden arbitrario',
    comment: `/*
  Arrays — Demonstrates the use of an array to hold pin numbers.
  created 2006 by David A. Mellis, modified 30 Aug 2011 by Tom Igoe
  This example code is in the public domain.
*/
Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Ejemplo diseñado específicamente para demostrar arrays (ledPins[6]). Sin soporte de arrays en ArduBlock. El mismo patrón secuencial se puede hacer con bloques individuales (ver ForLoopIteration).'
  },

  {
    name: 'switchCase2',
    category: '05.Control',
    description: 'Switch/case con entrada Serial',
    comment: `/*
  Switch statement with serial input
  created 1 Jul 2009 by Tom Igoe
  This example code is in the public domain.
*/
Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa Serial.available() y Serial.read() para recibir caracteres (sin bloques serial_read), y switch/case con valores ASCII (sin bloque switch).'
  },

  {
    name: 'ADXL3xx',
    category: '06.Sensors',
    description: 'Acelerómetro ADXL3xx — lectura de 3 ejes',
    comment: `/*
  ADXL3xx — Reads an Analog Devices ADXL3xx accelerometer.
  created 2 Jul 2008 by David A. Mellis, modified 30 Aug 2011 by Tom Igoe
  This example code is in the public domain.
*/
Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa analogRead en pines A1-A3 como ground/power para el acelerómetro (técnica de cableado directo). Requiere Serial.print con tabuladores para formatear 3 columnas. Serial.print repetido con \\t no tiene equivalente en bloques.'
  },

  {
    name: 'Knock',
    category: '06.Sensors',
    description: 'Sensor de golpe piezoeléctrico',
    comment: `/*
  Knock Sensor — Reads a piezo element to detect a knocking sound.
  created 25 Mar 2007 by David Cuartielles, modified 30 Aug 2011 by Tom Igoe
  This example code is in the public domain.
*/
Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa ledState = !ledState (toggle lógico) y digitalWrite(ledPin, ledState) con variable. El bloque digital_write solo acepta dropdown estático HIGH/LOW. Mismo problema que BlinkWithoutDelay.'
  },

  {
    name: 'Memsic2125',
    category: '06.Sensors',
    description: 'Acelerómetro Memsic 2125 — lectura de pulsos',
    comment: `/*
  Memsic2125 — Read the Memsic 2125 two-axis accelerometer.
  created 6 Nov 2008 by David A. Mellis, modified 30 Aug 2011 by Tom Igoe
  This example code is in the public domain.
*/
Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa pulseIn() para medir ancho de pulso (tenemos bloque pulse_in), pero requiere aritmética compleja: ((pulseX/10)-500)*8 con variables intermedias y Serial.print formateado con tabuladores. El workspace resultante con 4 niveles de math_arithmetic anidados sería difícil de leer para un estudiante.'
  }
];
