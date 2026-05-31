/**
 * ArduBlock — Ejemplos 03.Analog + 05.Control como workspace states
 */
export const analogControlExamples = [

  // ═══ AnalogInput ═════════════════════════════
  {
    name: 'AnalogInput',
    category: '03.Analog',
    description: 'Controla el brillo de un LED con un potenciómetro',
    comment: `/*
  Analog Input

  Demonstrates analog input by reading an analog sensor on analog pin 0 and
  turning on and off a light emitting diode(LED) connected to digital pin 13.
  The amount of time the LED will be on and off depends on the value obtained
  by analogRead().

  The circuit:
  - potentiometer
    center pin of the potentiometer to the analog input 0
    one side pin (either one) to ground
    the other side pin to +5V
  - LED
    anode (long leg) attached to digital output 13 through 220 ohm resistor
    cathode (short leg) attached to ground

  - Note: because most Arduinos have a built-in LED attached to pin 13 on the
    board, the LED is optional.

  created by David Cuartielles
  modified 30 Aug 2011
  By Tom Igoe

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/analog/AnalogInput/
*/
Agregado a ArduBlock — 2026-05-31`,
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'arduino_setup', id: 'ai1', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'pin_mode', id: 'ai2',
                  fields: { PIN: 13, MODE: 'OUTPUT' }
                }
              }
            }
          },
          {
            type: 'arduino_loop', id: 'ai3', x: 20, y: 160,
            inputs: {
              BODY: {
                block: {
                  type: 'variable_set', id: 'ai4',
                  fields: { NAME: 'sensorValue' },
                  inputs: {
                    VALUE: {
                      block: {
                        type: 'analog_read', id: 'ai5',
                        fields: { PIN: 0 }
                      }
                    }
                  },
                  next: {
                    block: {
                      type: 'digital_write', id: 'ai6',
                      fields: { PIN: 13, VALUE: 'HIGH' },
                      next: {
                        block: {
                          type: 'delay_ms', id: 'ai7',
                          fields: { MS: 500 },
                          next: {
                            block: {
                              type: 'digital_write', id: 'ai8',
                              fields: { PIN: 13, VALUE: 'LOW' },
                              next: {
                                block: {
                                  type: 'delay_ms', id: 'ai9',
                                  fields: { MS: 500 }
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

  // ═══ Fading ═════════════════════════════
  {
    name: 'Fading',
    category: '03.Analog',
    description: 'Aumenta y disminuye el brillo de un LED con PWM (for con paso variable)',
    comment: `/*
  Fading

  This example shows how to fade an LED using the analogWrite() function.

  The circuit:
  - LED attached from digital pin 9 to ground through 220 ohm resistor.

  created 1 Nov 2008
  by David A. Mellis
  modified 30 Aug 2011
  by Tom Igoe

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/analog/Fading/
*/
Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa for (int fadeValue = 0; fadeValue <= 255; fadeValue += 5). controls_repeat_ext no soporta paso variable (step 5), solo repetición N veces. Requiere bloque for con inicio/fin/paso.'
  },

  // ═══ IfStatementConditional ═════════════
  {
    name: 'IfStatementConditional',
    category: '05.Control',
    description: 'Enciende un LED si el potenciómetro supera un umbral',
    comment: `/*
  Conditionals - If statement

  This example demonstrates the use of if() statements.
  It reads the state of a potentiometer (an analog input) and turns on an LED
  only if the potentiometer goes above a certain threshold level. It prints the
  analog value regardless of the level.

  The circuit:
  - potentiometer
    Center pin of the potentiometer goes to analog pin 0.
    Side pins of the potentiometer go to +5V and ground.
  - LED connected from digital pin 13 to ground through 220 ohm resistor

  - Note: On most Arduino boards, there is already an LED on the board connected
    to pin 13, so you don't need any extra components for this example.

  created 17 Jan 2009
  modified 9 Apr 2012
  by Tom Igoe

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/control-structures/ifStatementConditional/
*/
Agregado a ArduBlock — 2026-05-31`,
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'arduino_setup', id: 'if1', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'pin_mode', id: 'if2',
                  fields: { PIN: 13, MODE: 'OUTPUT' },
                  next: {
                    block: {
                      type: 'serial_begin', id: 'if3',
                      fields: { BAUD: '9600' }
                    }
                  }
                }
              }
            }
          },
          {
            type: 'arduino_loop', id: 'if4', x: 20, y: 180,
            inputs: {
              BODY: {
                block: {
                  type: 'variable_declare', id: 'if5',
                  fields: { NAME: 'analogValue', TYPE: 'int' },
                  inputs: {
                    VALUE: {
                      block: {
                        type: 'analog_read', id: 'if6',
                        fields: { PIN: 0 }
                      }
                    }
                  },
                  next: {
                    block: {
                      type: 'serial_println', id: 'if7',
                      inputs: {
                        TEXT: {
                          block: {
                            type: 'variable_get', id: 'if8',
                            fields: { NAME: 'analogValue' }
                          }
                        }
                      },
                      next: {
                        block: {
                          type: 'controls_if', id: 'if9',
                          inputs: {
                            IF0: {
                              block: {
                                type: 'logic_compare', id: 'if10',
                                fields: { OP: 'GT' },
                                inputs: {
                                  A: {
                                    block: {
                                      type: 'variable_get', id: 'if11',
                                      fields: { NAME: 'analogValue' }
                                    }
                                  },
                                  B: {
                                    block: {
                                      type: 'math_number', id: 'if12',
                                      fields: { NUM: 400 }
                                    }
                                  }
                                }
                              }
                            },
                            DO0: {
                              block: {
                                type: 'digital_write', id: 'if13',
                                fields: { PIN: 13, VALUE: 'HIGH' }
                              }
                            },
                            ELSE: {
                              block: {
                                type: 'digital_write', id: 'if14',
                                fields: { PIN: 13, VALUE: 'LOW' }
                              }
                            }
                          },
                          next: {
                            block: {
                              type: 'delay_ms', id: 'if15',
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
        ]
      }
    }
  }
];
