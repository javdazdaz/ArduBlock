/**
 * ArduBlock — Ejemplos 05.Control como workspace states
 * Cada ejemplo tiene: name, description, comment (header .ino), state (Blockly JSON)
 */
export const controlExamples = [
  // ═══ 1. ForLoopIteration ══════════════════════
  {
    name: 'ForLoopIteration',
    category: '05.Control',
    description: 'Enciende LEDs en secuencia (pines 2-7) de ida y vuelta, repitiendo el patrón',
    comment: `/*
  For Loop Iteration

  Demonstrates the use of a for() loop.
  Lights multiple LEDs in sequence, then in reverse.

  The circuit:
  - LEDs from pins 2 through 7 to ground

  created 2006
  by David A. Mellis
  modified 30 Aug 2011
  by Tom Igoe

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/control-structures/ForLoopIteration/

  Agregado a ArduBlock — 2026-05-31
*/`,
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'arduino_setup', id: 'fl1', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'pin_mode', id: 'fl2',
                  fields: { PIN: 2, MODE: 'OUTPUT' },
                  next: {
                    block: {
                      type: 'pin_mode', id: 'fl3',
                      fields: { PIN: 3, MODE: 'OUTPUT' },
                      next: {
                        block: {
                          type: 'pin_mode', id: 'fl4',
                          fields: { PIN: 4, MODE: 'OUTPUT' },
                          next: {
                            block: {
                              type: 'pin_mode', id: 'fl5',
                              fields: { PIN: 5, MODE: 'OUTPUT' },
                              next: {
                                block: {
                                  type: 'pin_mode', id: 'fl6',
                                  fields: { PIN: 6, MODE: 'OUTPUT' },
                                  next: {
                                    block: {
                                      type: 'pin_mode', id: 'fl7',
                                      fields: { PIN: 7, MODE: 'OUTPUT' }
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
          },
          {
            type: 'arduino_loop', id: 'fl8', x: 20, y: 200,
            inputs: {
              BODY: {
                block: {
                  // ══ for (thisPin=2; thisPin<8; thisPin++) — UNROLLED ══
                  type: 'digital_write', id: 'fl9',
                  fields: { PIN: 2, VALUE: 'HIGH' },
                  next: {
                    block: {
                      type: 'delay_ms', id: 'fl10',
                      fields: { DELAY: 100 },
                      next: {
                        block: {
                          type: 'digital_write', id: 'fl11',
                          fields: { PIN: 2, VALUE: 'LOW' },
                          next: {
                            block: {
                              type: 'digital_write', id: 'fl12',
                              fields: { PIN: 3, VALUE: 'HIGH' },
                              next: {
                                block: {
                                  type: 'delay_ms', id: 'fl13',
                                  fields: { DELAY: 100 },
                                  next: {
                                    block: {
                                      type: 'digital_write', id: 'fl14',
                                      fields: { PIN: 3, VALUE: 'LOW' },
                                      next: {
                                        block: {
                                          type: 'digital_write', id: 'fl15',
                                          fields: { PIN: 4, VALUE: 'HIGH' },
                                          next: {
                                            block: {
                                              type: 'delay_ms', id: 'fl16',
                                              fields: { DELAY: 100 },
                                              next: {
                                                block: {
                                                  type: 'digital_write', id: 'fl17',
                                                  fields: { PIN: 4, VALUE: 'LOW' },
                                                  next: {
                                                    block: {
                                                      type: 'digital_write', id: 'fl18',
                                                      fields: { PIN: 5, VALUE: 'HIGH' },
                                                      next: {
                                                        block: {
                                                          type: 'delay_ms', id: 'fl19',
                                                          fields: { DELAY: 100 },
                                                          next: {
                                                            block: {
                                                              type: 'digital_write', id: 'fl20',
                                                              fields: { PIN: 5, VALUE: 'LOW' },
                                                              next: {
                                                                block: {
                                                                  type: 'digital_write', id: 'fl21',
                                                                  fields: { PIN: 6, VALUE: 'HIGH' },
                                                                  next: {
                                                                    block: {
                                                                      type: 'delay_ms', id: 'fl22',
                                                                      fields: { DELAY: 100 },
                                                                      next: {
                                                                        block: {
                                                                          type: 'digital_write', id: 'fl23',
                                                                          fields: { PIN: 6, VALUE: 'LOW' },
                                                                          next: {
                                                                            block: {
                                                                              type: 'digital_write', id: 'fl24',
                                                                              fields: { PIN: 7, VALUE: 'HIGH' },
                                                                              next: {
                                                                                block: {
                                                                                  type: 'delay_ms', id: 'fl25',
                                                                                  fields: { DELAY: 100 },
                                                                                  next: {
                                                                                    block: {
                                                                                      type: 'digital_write', id: 'fl26',
                                                                                      fields: { PIN: 7, VALUE: 'LOW' },
                                                                                      next: {
                                                                                        // ══ for (thisPin=7; thisPin>=2; thisPin--) — UNROLLED ══
                                                                                        block: {
                                                                                          type: 'digital_write', id: 'fl27',
                                                                                          fields: { PIN: 7, VALUE: 'HIGH' },
                                                                                          next: {
                                                                                            block: {
                                                                                              type: 'delay_ms', id: 'fl28',
                                                                                              fields: { DELAY: 100 },
                                                                                              next: {
                                                                                                block: {
                                                                                                  type: 'digital_write', id: 'fl29',
                                                                                                  fields: { PIN: 7, VALUE: 'LOW' },
                                                                                                  next: {
                                                                                                    block: {
                                                                                                      type: 'digital_write', id: 'fl30',
                                                                                                      fields: { PIN: 6, VALUE: 'HIGH' },
                                                                                                      next: {
                                                                                                        block: {
                                                                                                          type: 'delay_ms', id: 'fl31',
                                                                                                          fields: { DELAY: 100 },
                                                                                                          next: {
                                                                                                            block: {
                                                                                                              type: 'digital_write', id: 'fl32',
                                                                                                              fields: { PIN: 6, VALUE: 'LOW' },
                                                                                                              next: {
                                                                                                                block: {
                                                                                                                  type: 'digital_write', id: 'fl33',
                                                                                                                  fields: { PIN: 5, VALUE: 'HIGH' },
                                                                                                                  next: {
                                                                                                                    block: {
                                                                                                                      type: 'delay_ms', id: 'fl34',
                                                                                                                      fields: { DELAY: 100 },
                                                                                                                      next: {
                                                                                                                        block: {
                                                                                                                          type: 'digital_write', id: 'fl35',
                                                                                                                          fields: { PIN: 5, VALUE: 'LOW' },
                                                                                                                          next: {
                                                                                                                            block: {
                                                                                                                              type: 'digital_write', id: 'fl36',
                                                                                                                              fields: { PIN: 4, VALUE: 'HIGH' },
                                                                                                                              next: {
                                                                                                                                block: {
                                                                                                                                  type: 'delay_ms', id: 'fl37',
                                                                                                                                  fields: { DELAY: 100 },
                                                                                                                                  next: {
                                                                                                                                    block: {
                                                                                                                                      type: 'digital_write', id: 'fl38',
                                                                                                                                      fields: { PIN: 4, VALUE: 'LOW' },
                                                                                                                                      next: {
                                                                                                                                        block: {
                                                                                                                                          type: 'digital_write', id: 'fl39',
                                                                                                                                          fields: { PIN: 3, VALUE: 'HIGH' },
                                                                                                                                          next: {
                                                                                                                                            block: {
                                                                                                                                              type: 'delay_ms', id: 'fl40',
                                                                                                                                              fields: { DELAY: 100 },
                                                                                                                                              next: {
                                                                                                                                                block: {
                                                                                                                                                  type: 'digital_write', id: 'fl41',
                                                                                                                                                  fields: { PIN: 3, VALUE: 'LOW' },
                                                                                                                                                  next: {
                                                                                                                                                    block: {
                                                                                                                                                      type: 'digital_write', id: 'fl42',
                                                                                                                                                      fields: { PIN: 2, VALUE: 'HIGH' },
                                                                                                                                                      next: {
                                                                                                                                                        block: {
                                                                                                                                                          type: 'delay_ms', id: 'fl43',
                                                                                                                                                          fields: { DELAY: 100 },
                                                                                                                                                          next: {
                                                                                                                                                            block: {
                                                                                                                                                              type: 'digital_write', id: 'fl44',
                                                                                                                                                              fields: { PIN: 2, VALUE: 'LOW' }
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

  // ═══ 2. switchCase ═════════════════════════════
  {
    name: 'switchCase',
    category: '05.Control',
    description: 'Clasifica lecturas de un fotorresistor en 4 rangos (dark/dim/medium/bright)',
    comment: `/*
  Switch statement

  Demonstrates the use of a switch statement. The switch statement allows you
  to choose from among a set of discrete values of a variable. It's like a
  series of if statements.

  To see this sketch in action, put the board and sensor in a well-lit room,
  open the Serial Monitor, and move your hand gradually down over the sensor.

  The circuit:
  - photoresistor from analog in 0 to +5V
  - 10K resistor from analog in 0 to ground

  created 1 Jul 2009
  modified 9 Apr 2012
  by Tom Igoe

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/control-structures/SwitchCase/

  Agregado a ArduBlock — 2026-05-31
*/`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa switch/case con 4 ramas (0-3). No existe bloque switch en ArduBlock. Podría aproximarse con controls_if anidados, pero el propósito del ejemplo es demostrar switch, no if/else.'
  },

  // ═══ 3. WhileStatementConditional ══════════════
  {
    name: 'WhileStatementConditional',
    category: '05.Control',
    description: 'Calibra un fotorresistor mientras se mantiene presionado un pulsador (while con condición)',
    comment: `/*
  Conditionals - while statement

  This example demonstrates the use of  while() statements.

  While the pushbutton is pressed, the sketch runs the calibration routine.
  The sensor readings during the while loop define the minimum and maximum of
  expected values from the photoresistor.

  This is a variation on the calibrate example.

  The circuit:
  - photoresistor connected from +5V to analog in pin 0
  - 10 kilohm resistor connected from ground to analog in pin 0
  - LED connected from digital pin 9 to ground through 220 ohm resistor
  - pushbutton attached from pin 2 to +5V
  - 10 kilohm resistor attached from pin 2 to ground

  created 17 Jan 2009
  modified 30 Aug 2011
  by Tom Igoe
  modified 20 Jan 2017
  by Arturo Guadalupi

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/control-structures/WhileStatementConditional/

  Agregado a ArduBlock — 2026-05-31
*/`,
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'arduino_setup', id: 'ws1', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'pin_mode', id: 'ws_setup0',
                  fields: { PIN: 0, MODE: 'INPUT' },
                  next: {
                    block: {
                      type: 'pin_mode', id: 'ws2',
                      fields: { PIN: 13, MODE: 'OUTPUT' },
                      next: {
                        block: {
                          type: 'pin_mode', id: 'ws3',
                          fields: { PIN: 9, MODE: 'OUTPUT' },
                          next: {
                            block: {
                              type: 'pin_mode', id: 'ws4',
                              fields: { PIN: 2, MODE: 'INPUT' },
                              next: {
                                block: {
                                  type: 'variables_set', id: 'ws5',
                                  fields: { VAR: { name: 'sensorMin' } },
                                  inputs: {
                                    VALUE: {
                                      block: {
                                        type: 'math_number', id: 'ws6',
                                        fields: { NUM: 1023 }
                                      }
                                    }
                                  },
                                  next: {
                                    block: {
                                      type: 'variables_set', id: 'ws7',
                                      fields: { VAR: { name: 'sensorMax' } },
                                      inputs: {
                                        VALUE: {
                                          block: {
                                            type: 'math_number', id: 'ws8',
                                            fields: { NUM: 0 }
                                          }
                                        }
                                      },
                                      next: {
                                        block: {
                                          type: 'variables_set', id: 'ws9',
                                          fields: { VAR: { name: 'sensorValue' } },
                                          inputs: {
                                            VALUE: {
                                              block: {
                                                type: 'math_number', id: 'ws10',
                                                fields: { NUM: 0 }
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
          },
          {
            type: 'arduino_loop', id: 'ws11', x: 20, y: 260,
            inputs: {
              BODY: {
                block: {
                  // while (digitalRead(buttonPin) == HIGH) { calibrate(); }
                  type: 'controls_whileUntil', id: 'ws12',
                  fields: { MODE: 'WHILE' },
                  inputs: {
                    BOOL: {
                      block: {
                        type: 'logic_compare', id: 'ws13',
                        fields: { OP: 'EQ' },
                        inputs: {
                          A: {
                            block: {
                              type: 'digital_read', id: 'ws14',
                              fields: { PIN: 2 }
                            }
                          },
                          B: {
                            block: {
                              type: 'math_number', id: 'ws15',
                              fields: { NUM: 1 }
                            }
                          }
                        }
                      }
                    },
                    DO: {
                      block: {
                        // calibrate() inline:
                        //   digitalWrite(indicatorLedPin, HIGH);
                        //   sensorValue = analogRead(sensorPin);
                        //   if (sensorValue > sensorMax) sensorMax = sensorValue;
                        //   if (sensorValue < sensorMin) sensorMin = sensorValue;
                        type: 'digital_write', id: 'ws16',
                        fields: { PIN: 13, VALUE: 'HIGH' },
                        next: {
                          block: {
                            type: 'variables_set', id: 'ws17',
                            fields: { VAR: { name: 'sensorValue' } },
                            inputs: {
                              VALUE: {
                                block: {
                                  type: 'analog_read', id: 'ws18',
                                  fields: { PIN: 0 }
                                }
                              }
                            },
                            next: {
                              block: {
                                type: 'controls_if', id: 'ws19',
                                inputs: {
                                  IF0: {
                                    block: {
                                      type: 'logic_compare', id: 'ws20',
                                      fields: { OP: 'GT' },
                                      inputs: {
                                        A: {
                                          block: {
                                            type: 'variables_get', id: 'ws21',
                                            fields: { VAR: { name: 'sensorValue' } }
                                          }
                                        },
                                        B: {
                                          block: {
                                            type: 'variables_get', id: 'ws22',
                                            fields: { VAR: { name: 'sensorMax' } }
                                          }
                                        }
                                      }
                                    }
                                  },
                                  DO0: {
                                    block: {
                                      type: 'variables_set', id: 'ws23',
                                      fields: { VAR: { name: 'sensorMax' } },
                                      inputs: {
                                        VALUE: {
                                          block: {
                                            type: 'variables_get', id: 'ws24',
                                            fields: { VAR: { name: 'sensorValue' } }
                                          }
                                        }
                                      }
                                    }
                                  }
                                },
                                next: {
                                  block: {
                                    type: 'controls_if', id: 'ws25',
                                    inputs: {
                                      IF0: {
                                        block: {
                                          type: 'logic_compare', id: 'ws26',
                                          fields: { OP: 'LT' },
                                          inputs: {
                                            A: {
                                              block: {
                                                type: 'variables_get', id: 'ws27',
                                                fields: { VAR: { name: 'sensorValue' } }
                                              }
                                            },
                                            B: {
                                              block: {
                                                type: 'variables_get', id: 'ws28',
                                                fields: { VAR: { name: 'sensorMin' } }
                                              }
                                            }
                                          }
                                        }
                                      },
                                      DO0: {
                                        block: {
                                          type: 'variables_set', id: 'ws29',
                                          fields: { VAR: { name: 'sensorMin' } },
                                          inputs: {
                                            VALUE: {
                                              block: {
                                                type: 'variables_get', id: 'ws30',
                                                fields: { VAR: { name: 'sensorValue' } }
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
                  },
                  next: {
                    block: {
                      // digitalWrite(indicatorLedPin, LOW)
                      type: 'digital_write', id: 'ws31',
                      fields: { PIN: 13, VALUE: 'LOW' },
                      next: {
                        block: {
                          // sensorValue = analogRead(sensorPin)
                          type: 'variables_set', id: 'ws32',
                          fields: { VAR: { name: 'sensorValue' } },
                          inputs: {
                            VALUE: {
                              block: {
                                type: 'analog_read', id: 'ws33',
                                fields: { PIN: 0 }
                              }
                            }
                          },
                          next: {
                            block: {
                              // analogWrite(ledPin, sensorValue)
                              // Nota: map() y constrain() omitidos — no existen bloques equivalentes
                              type: 'analog_write', id: 'ws34',
                              fields: { PIN: 9 },
                              inputs: {
                                VALUE: {
                                  block: {
                                    type: 'variables_get', id: 'ws35',
                                    fields: { VAR: { name: 'sensorValue' } }
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