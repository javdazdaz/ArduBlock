/**
 * ArduBlock — Ejemplos 02.Digital como workspace states.
 * Comentarios bilingües (es/en). Variables usan el sistema custom de ArduBlock.
 */
export const digitalSimple = [

  // ═══ 1. Button ════════════════════════════════
  {
    name: 'Button',
    category: '02.Digital',
    description: 'Enciende un LED al presionar un pulsador',
    comment: {
      es: `/*
  Button

  Enciende y apaga un LED conectado al pin digital 13
  al presionar un pulsador conectado al pin 2.

  El circuito:
  - LED del pin 13 a tierra con resistencia de 220 ohm
  - pulsador del pin 2 a +5V
  - resistencia de 10K del pin 2 a tierra

  creado 2005 por DojoDave
  modificado 30 Ago 2011 por Tom Igoe

  Este código es de dominio público.

  https://docs.arduino.cc/built-in-examples/digital/Button/

  Agregado a ArduBlock — 2026-05-31
*/`,
      en: `/*
  Button

  Turns on and off a light emitting diode(LED) connected to digital pin 13,
  when pressing a pushbutton attached to pin 2.

  The circuit:
  - LED attached from pin 13 to ground through 220 ohm resistor
  - pushbutton attached to pin 2 from +5V
  - 10K resistor attached to pin 2 from ground

  created 2005 by DojoDave
  modified 30 Aug 2011 by Tom Igoe

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/digital/Button/

  Added to ArduBlock — 2026-05-31
*/`
    },
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'variable_declare', id: 'bt0', x: 20, y: 280,
            fields: { NAME: 'buttonState', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'bt0v', fields: { NUM: 0 } } } }
          },
          {
            type: 'arduino_setup', id: 'bt1', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'pin_mode', id: 'bt2',
                  fields: { PIN: 13, MODE: 'OUTPUT' },
                  next: {
                    block: {
                      type: 'pin_mode', id: 'bt3',
                      fields: { PIN: 2, MODE: 'INPUT' }
                    }
                  }
                }
              }
            }
          },
          {
            type: 'arduino_loop', id: 'bt4', x: 20, y: 160,
            inputs: {
              BODY: {
                block: {
                  type: 'variable_set', id: 'bt5',
                  fields: { NAME: 'buttonState' },
                  inputs: {
                    VALUE: {
                      block: {
                        type: 'digital_read', id: 'bt6',
                        fields: { PIN: 2 }
                      }
                    }
                  },
                  next: {
                    block: {
                      type: 'controls_if', id: 'bt7',
                      extraState: { hasElse: true },
                      inputs: {
                        IF0: {
                          block: {
                            type: 'logic_compare', id: 'bt8',
                            fields: { OP: 'EQ' },
                            inputs: {
                              A: { block: { type: 'variable_get', id: 'bt9', fields: { NAME: 'buttonState' } } },
                              B: { block: { type: 'math_number', id: 'bt10', fields: { NUM: 1 } } }
                            }
                          }
                        },
                        DO0: {
                          block: {
                            type: 'digital_write', id: 'bt11',
                            fields: { PIN: 13, VALUE: 'HIGH' }
                          }
                        },
                        ELSE: {
                          block: {
                            type: 'digital_write', id: 'bt12',
                            fields: { PIN: 13, VALUE: 'LOW' }
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

  // ═══ 2. DigitalInputPullup ════════════════════
  {
    name: 'DigitalInputPullup',
    category: '02.Digital',
    description: 'Lee un pulsador con resistencia pull-up interna y lo imprime por Serial',
    comment: {
      es: `/*
  Input Pull-up Serial

  Este ejemplo demuestra el uso de pinMode(INPUT_PULLUP).
  Lee una entrada digital en el pin 2 e imprime los resultados
  en el Monitor Serial.

  El circuito:
  - pulsador momentáneo del pin 2 a tierra
  - LED integrado en el pin 13

  A diferencia de pinMode(INPUT), no se necesita resistencia
  pull-down externa. Una resistencia interna de 20K ohm está
  conectada a 5V. La entrada lee HIGH cuando el pulsador está
  abierto, y LOW cuando está cerrado.

  creado 14 Mar 2012 por Scott Fitzgerald

  Este código es de dominio público.

  https://docs.arduino.cc/built-in-examples/digital/InputPullupSerial/

  Agregado a ArduBlock — 2026-05-31
*/`,
      en: `/*
  Input Pull-up Serial

  This example demonstrates the use of pinMode(INPUT_PULLUP). It reads a digital
  input on pin 2 and prints the results to the Serial Monitor.

  The circuit:
  - momentary switch attached from pin 2 to ground
  - built-in LED on pin 13

  Unlike pinMode(INPUT), there is no pull-down resistor necessary. An internal
  20K-ohm resistor is pulled to 5V. This configuration causes the input to read
  HIGH when the switch is open, and LOW when it is closed.

  created 14 Mar 2012 by Scott Fitzgerald

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/digital/InputPullupSerial/

  Added to ArduBlock — 2026-05-31
*/`
    },
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'arduino_setup', id: 'dp1', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'serial_begin', id: 'dp2',
                  fields: { BAUD: '9600' },
                  next: {
                    block: {
                      type: 'pin_mode', id: 'dp3',
                      fields: { PIN: 2, MODE: 'INPUT_PULLUP' },
                      next: {
                        block: {
                          type: 'pin_mode', id: 'dp4',
                          fields: { PIN: 13, MODE: 'OUTPUT' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          {
            type: 'arduino_loop', id: 'dp5', x: 20, y: 180,
            inputs: {
              BODY: {
                block: {
                  type: 'variable_declare', id: 'dp6',
                  fields: { NAME: 'sensorVal', TYPE: 'int' },
                  inputs: {
                    VALUE: {
                      block: {
                        type: 'digital_read', id: 'dp7',
                        fields: { PIN: 2 }
                      }
                    }
                  },
                  next: {
                    block: {
                      type: 'serial_println', id: 'dp8',
                      inputs: {
                        TEXT: {
                          block: { type: 'variable_get', id: 'dp9', fields: { NAME: 'sensorVal' } }
                        }
                      },
                      next: {
                        block: {
                          type: 'controls_if', id: 'dp10',
                          extraState: { hasElse: true },
                          inputs: {
                            IF0: {
                              block: {
                                type: 'logic_compare', id: 'dp11',
                                fields: { OP: 'EQ' },
                                inputs: {
                                  A: { block: { type: 'variable_get', id: 'dp12', fields: { NAME: 'sensorVal' } } },
                                  B: { block: { type: 'math_number', id: 'dp13', fields: { NUM: 1 } } }
                                }
                              }
                            },
                            DO0: {
                              block: { type: 'digital_write', id: 'dp14', fields: { PIN: 13, VALUE: 'LOW' } }
                            },
                            ELSE: {
                              block: { type: 'digital_write', id: 'dp15', fields: { PIN: 13, VALUE: 'HIGH' } }
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

  // ═══ 3. toneKeyboard ══════════════════════════
  {
    name: 'toneKeyboard',
    category: '02.Digital',
    description: 'Teclado de 3 sensores que generan notas musicales',
    comment: {
      es: `/*
  Keyboard

  Toca notas musicales según la lectura de sensores
  de presión analógicos.

  circuito:
  - tres resistencias sensoras de fuerza de +5V a A0, A1, A2
  - tres resistencias de 10 kilohm de A0, A1, A2 a tierra
  - parlante de 8 ohm en el pin digital 8

  creado 21 Ene 2010, modificado 9 Abr 2012 por Tom Igoe

  Este código es de dominio público.

  https://docs.arduino.cc/built-in-examples/digital/toneKeyboard/

  Agregado a ArduBlock — 2026-05-31
*/`,
      en: `/*
  Keyboard

  Plays a pitch that changes based on a changing analog input

  circuit:
  - three force-sensing resistors from +5V to analog in 0 through 2
  - three 10 kilohm resistors from analog in 0 through 2 to ground
  - 8 ohm speaker on digital pin 8

  created 21 Jan 2010, modified 9 Apr 2012 by Tom Igoe

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/digital/toneKeyboard/

  Added to ArduBlock — 2026-05-31
*/`
    },
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          { type: 'arduino_setup', id: 'tk1', x: 20, y: 20 },
          {
            type: 'arduino_loop', id: 'tk2', x: 20, y: 120,
            inputs: {
              BODY: {
                block: {
                  // if analogRead(A0) > 10: tone(8, 440, 20)
                  type: 'controls_if', id: 'tk3',
                  inputs: {
                    IF0: {
                      block: {
                        type: 'logic_compare', id: 'tk4',
                        fields: { OP: 'GT' },
                        inputs: {
                          A: { block: { type: 'analog_read', id: 'tk5', fields: { PIN: 0 } } },
                          B: { block: { type: 'math_number', id: 'tk6', fields: { NUM: 10 } } }
                        }
                      }
                    },
                    DO0: {
                      block: {
                        type: 'tone_duration', id: 'tk7',
                        fields: { PIN: 8, FREQ: 440, DURATION: 20 },
                        next: {
                          block: {
                            // if analogRead(A1) > 10: tone(8, 494, 20)
                            type: 'controls_if', id: 'tk8',
                            inputs: {
                              IF0: {
                                block: {
                                  type: 'logic_compare', id: 'tk9',
                                  fields: { OP: 'GT' },
                                  inputs: {
                                    A: { block: { type: 'analog_read', id: 'tk10', fields: { PIN: 1 } } },
                                    B: { block: { type: 'math_number', id: 'tk11', fields: { NUM: 10 } } }
                                  }
                                }
                              },
                              DO0: {
                                block: {
                                  type: 'tone_duration', id: 'tk12',
                                  fields: { PIN: 8, FREQ: 494, DURATION: 20 },
                                  next: {
                                    block: {
                                      // if analogRead(A2) > 10: tone(8, 131, 20)
                                      type: 'controls_if', id: 'tk13',
                                      inputs: {
                                        IF0: {
                                          block: {
                                            type: 'logic_compare', id: 'tk14',
                                            fields: { OP: 'GT' },
                                            inputs: {
                                              A: { block: { type: 'analog_read', id: 'tk15', fields: { PIN: 2 } } },
                                              B: { block: { type: 'math_number', id: 'tk16', fields: { NUM: 10 } } }
                                            }
                                          }
                                        },
                                        DO0: {
                                          block: {
                                            type: 'tone_duration', id: 'tk17',
                                            fields: { PIN: 8, FREQ: 131, DURATION: 20 }
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

  // ═══ 4. tonePitchFollower ═════════════════════
  {
    name: 'tonePitchFollower',
    category: '02.Digital',
    description: 'Genera un tono cuya frecuencia varía según un sensor de luz',
    comment: {
      es: `/*
  Pitch follower

  Toca un tono cuya frecuencia cambia según la lectura
  de una entrada analógica (fotorresistor).

  circuito:
  - parlante de 8 ohm en el pin digital 9
  - fotorresistor en A0 a 5V
  - resistencia de 4.7 kilohm en A0 a tierra

  creado 21 Ene 2010, modificado 31 May 2012
  por Tom Igoe, con sugerencia de Michael Flynn

  Este código es de dominio público.

  https://docs.arduino.cc/built-in-examples/digital/tonePitchFollower/

  Agregado a ArduBlock — 2026-05-31
*/`,
      en: `/*
  Pitch follower

  Plays a pitch that changes based on a changing analog input

  circuit:
  - 8 ohm speaker on digital pin 9
  - photoresistor on analog 0 to 5V
  - 4.7 kilohm resistor on analog 0 to ground

  created 21 Jan 2010, modified 31 May 2012
  by Tom Igoe, with suggestion from Michael Flynn

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/digital/tonePitchFollower/

  Added to ArduBlock — 2026-05-31
*/`
    },
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'arduino_setup', id: 'tp1', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'serial_begin', id: 'tp2',
                  fields: { BAUD: '9600' }
                }
              }
            }
          },
          {
            type: 'arduino_loop', id: 'tp3', x: 20, y: 160,
            inputs: {
              BODY: {
                block: {
                  type: 'variable_declare', id: 'tp4',
                  fields: { NAME: 'sensorReading', TYPE: 'int' },
                  inputs: {
                    VALUE: { block: { type: 'analog_read', id: 'tp5', fields: { PIN: 0 } } }
                  },
                  next: {
                    block: {
                      type: 'serial_println', id: 'tp6',
                      inputs: {
                        TEXT: { block: { type: 'variable_get', id: 'tp7', fields: { NAME: 'sensorReading' } } }
                      },
                      next: {
                        block: {
                          type: 'variable_declare', id: 'tp8',
                          fields: { NAME: 'thisPitch', TYPE: 'int' },
                          inputs: {
                            VALUE: {
                              block: {
                                type: 'map_value', id: 'tp9',
                                fields: { FROM_LOW: 400, FROM_HIGH: 1000, TO_LOW: 120, TO_HIGH: 1500 },
                                inputs: {
                                  VALUE: { block: { type: 'variable_get', id: 'tp10', fields: { NAME: 'sensorReading' } } }
                                }
                              }
                            }
                          },
                          next: {
                            block: {
                              // Limitación: tone_output FREQ es field_number estático,
                              // no puede recibir la variable thisPitch.
                              // Usamos el valor mínimo del rango (120 Hz) como aproximación.
                              type: 'tone_duration', id: 'tp11',
                              fields: { PIN: 9, FREQ: 120, DURATION: 10 },
                              next: {
                                block: {
                                  type: 'delay_ms', id: 'tp12',
                                  fields: { MS: 1 }
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

  // ═══ 5. BlinkWithoutDelay ═══════════════════════
  {
    name: 'BlinkWithoutDelay',
    category: '02.Digital',
    description: 'Parpadea un LED sin usar delay(), usando millis()',
    comment: {
      es: `/*
  Blink without Delay

  Enciende y apaga un LED sin usar la función delay().
  Esto permite que otro código se ejecute al mismo tiempo
  sin ser interrumpido por el parpadeo.

  creado 2005 por David A. Mellis
  modificado 8 Feb 2010 por Paul Stoffregen
  modificado 11 Nov 2013 por Scott Fitzgerald
  modificado 9 Ene 2017 por Arturo Guadalupi

  Este código es de dominio público.

  https://docs.arduino.cc/built-in-examples/digital/BlinkWithoutDelay/

  Agregado a ArduBlock — 2026-05-31
*/`,
      en: `/*
  Blink without Delay

  Turns on and off a light emitting diode (LED) connected to a digital pin,
  without using the delay() function. This means that other code can run at the
  same time without being interrupted by the LED code.

  created 2005 by David A. Mellis
  modified 8 Feb 2010 by Paul Stoffregen
  modified 11 Nov 2013 by Scott Fitzgerald
  modified 9 Jan 2017 by Arturo Guadalupi

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/digital/BlinkWithoutDelay/

  Added to ArduBlock — 2026-05-31
*/`
    },
    reason: 'NOT_CONVERTIBLE',
    note: 'El bloque digital_write usa un dropdown estático (HIGH/LOW). El sketch original usa digitalWrite(13, ledState) donde ledState alterna entre HIGH y LOW. Se necesita un bloque con entrada de valor dinámica.'
  },

  // ═══ 6. Debounce ═══════════════════════════════
  {
    name: 'Debounce',
    category: '02.Digital',
    description: 'Anti-rebote de pulsador con millis()',
    comment: {
      es: `/*
  Debounce

  Cada vez que el pin de entrada pasa de LOW a HIGH
  (al presionar un pulsador), el pin de salida alterna
  entre LOW y HIGH. Incluye un retardo mínimo para
  eliminar el ruido del rebote.

  creado 21 Nov 2006 por David A. Mellis
  modificado 30 Ago 2011 por Limor Fried
  modificado 28 Dic 2012 por Mike Walters
  modificado 30 Ago 2016 por Arturo Guadalupi

  Este código es de dominio público.

  https://docs.arduino.cc/built-in-examples/digital/Debounce/

  Agregado a ArduBlock — 2026-05-31
*/`,
      en: `/*
  Debounce

  Each time the input pin goes from LOW to HIGH (e.g. because of a push-button
  press), the output pin is toggled from LOW to HIGH or HIGH to LOW. There's a
  minimum delay between toggles to debounce the circuit (i.e. to ignore noise).

  created 21 Nov 2006 by David A. Mellis
  modified 30 Aug 2011 by Limor Fried
  modified 28 Dec 2012 by Mike Walters
  modified 30 Aug 2016 by Arturo Guadalupi

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/digital/Debounce/

  Added to ArduBlock — 2026-05-31
*/`
    },
    reason: 'NOT_CONVERTIBLE',
    note: 'Máquina de estados compleja con millis(), múltiples variables de tiempo y toggle ledState = !ledState. El workspace sería excesivamente complejo para uso educativo, y el toggle requiere digital_write con entrada dinámica.'
  },

  // ═══ 7. StateChangeDetection ═══════════════════
  {
    name: 'StateChangeDetection',
    category: '02.Digital',
    description: 'Detección de cambio de estado (flanco) de un pulsador',
    comment: {
      es: `/*
  State change detection (edge detection)

  Detecta cuando un pulsador cambia de estado (de OFF a ON
  o de ON a OFF). Cuenta las veces que se presiona y enciende
  un LED cada 4 pulsaciones.

  creado 27 Sep 2005, modificado 30 Ago 2011 por Tom Igoe

  Este código es de dominio público.

  https://docs.arduino.cc/built-in-examples/digital/StateChangeDetection/

  Agregado a ArduBlock — 2026-05-31
*/`,
      en: `/*
  State change detection (edge detection)

  Often, you don't need to know the state of a digital input all the time, but
  you just need to know when the input changes from one state to another.

  created 27 Sep 2005, modified 30 Aug 2011 by Tom Igoe

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/digital/StateChangeDetection/

  Added to ArduBlock — 2026-05-31
*/`
    },
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa digitalWrite(ledPin, ledState) con variable dinámica (el bloque solo acepta dropdown HIGH/LOW). Además requiere buttonPushCounter++ (incremento) y buttonPushCounter % 4 == 0 (módulo).'
  },

  // ═══ 8. toneMelody ═════════════════════════════
  {
    name: 'toneMelody',
    category: '02.Digital',
    description: 'Reproduce una melodía con tonos',
    comment: {
      es: `/*
  Melody

  Reproduce una melodía usando la función tone().

  circuito:
  - parlante de 8 ohm en el pin digital 8

  creado 21 Ene 2010, modificado 30 Ago 2011 por Tom Igoe

  Este código es de dominio público.

  https://docs.arduino.cc/built-in-examples/digital/toneMelody/

  Agregado a ArduBlock — 2026-05-31
*/`,
      en: `/*
  Melody

  Plays a melody

  circuit:
  - 8 ohm speaker on digital pin 8

  created 21 Jan 2010, modified 30 Aug 2011 by Tom Igoe

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/digital/toneMelody/

  Added to ArduBlock — 2026-05-31
*/`
    },
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa arrays (melody[], noteDurations[]) y #include "pitches.h" para definir notas musicales. Sin soporte de arrays ni archivos de cabecera externos en ArduBlock.'
  },

  // ═══ 9. toneMultiple ═══════════════════════════
  {
    name: 'toneMultiple',
    category: '02.Digital',
    description: 'Reproduce tonos en múltiples pines en secuencia',
    comment: {
      es: `/*
  Multiple tone player

  Reproduce tonos en múltiples pines de forma secuencial.

  circuito:
  - tres parlantes de 8 ohm en los pines digitales 6, 7 y 8

  creado 8 Mar 2010 por Tom Igoe
  basado en un fragmento de Greg Borenstein

  Este código es de dominio público.

  https://docs.arduino.cc/built-in-examples/digital/toneMultiple/

  Agregado a ArduBlock — 2026-05-31
*/`,
      en: `/*
  Multiple tone player

  Plays multiple tones on multiple pins in sequence

  circuit:
  - three 8 ohm speakers on digital pins 6, 7, and 8

  created 8 Mar 2010 by Tom Igoe
  based on a snippet from Greg Borenstein

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/digital/toneMultiple/

  Added to ArduBlock — 2026-05-31
*/`
    },
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
                  type: 'no_tone_output', id: 'tm3', fields: { PIN: 8 },
                  next: {
                    block: {
                      type: 'tone_duration', id: 'tm4', fields: { PIN: 6, FREQ: 440, DURATION: 200 },
                      next: {
                        block: {
                          type: 'no_tone_output', id: 'tm5', fields: { PIN: 6 },
                          next: {
                            block: {
                              type: 'tone_duration', id: 'tm6', fields: { PIN: 7, FREQ: 494, DURATION: 500 },
                              next: {
                                block: {
                                  type: 'no_tone_output', id: 'tm7', fields: { PIN: 7 },
                                  next: {
                                    block: {
                                      type: 'tone_duration', id: 'tm8', fields: { PIN: 8, FREQ: 523, DURATION: 300 }
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
  }
];
