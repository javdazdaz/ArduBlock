/**
 * ArduBlock — Ejemplos 02.Digital (simples) como workspace states
 * Cada ejemplo tiene: name, description, comment (header .ino), state (Blockly JSON)
 */
export const digitalSimple = [
  // ═══ 1. Button ════════════════════════════════
  {
    name: 'Button',
    category: '02.Digital',
    description: 'Enciende un LED al presionar un pulsador',
    comment: `/*
  Button

  Turns on and off a light emitting diode(LED) connected to digital pin 13,
  when pressing a pushbutton attached to pin 2.

  The circuit:
  - LED attached from pin 13 to ground through 220 ohm resistor
  - pushbutton attached to pin 2 from +5V
  - 10K resistor attached to pin 2 from ground

  - Note: on most Arduinos there is already an LED on the board
    attached to pin 13.

  created 2005
  by DojoDave <http://www.0j0.org>
  modified 30 Aug 2011
  by Tom Igoe

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/digital/Button/
*/
Agregado a ArduBlock — 2026-05-31`,
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
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
                  type: 'variables_set', id: 'bt5',
                  fields: { VAR: { name: 'buttonState' } },
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
                      inputs: {
                        IF0: {
                          block: {
                            type: 'logic_compare', id: 'bt8',
                            fields: { OP: 'EQ' },
                            inputs: {
                              A: {
                                block: {
                                  type: 'variables_get', id: 'bt9',
                                  fields: { VAR: { name: 'buttonState' } }
                                }
                              },
                              B: {
                                block: {
                                  type: 'math_number', id: 'bt10',
                                  fields: { NUM: 1 }
                                }
                              }
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
    comment: `/*
  Input Pull-up Serial

  This example demonstrates the use of pinMode(INPUT_PULLUP). It reads a digital
  input on pin 2 and prints the results to the Serial Monitor.

  The circuit:
  - momentary switch attached from pin 2 to ground
  - built-in LED on pin 13

  Unlike pinMode(INPUT), there is no pull-down resistor necessary. An internal
  20K-ohm resistor is pulled to 5V. This configuration causes the input to read
  HIGH when the switch is open, and LOW when it is closed.

  created 14 Mar 2012
  by Scott Fitzgerald

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/digital/InputPullupSerial/
*/
Agregado a ArduBlock — 2026-05-31`,
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
                  type: 'variables_set', id: 'dp6',
                  fields: { VAR: { name: 'sensorVal' } },
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
                          block: {
                            type: 'variables_get', id: 'dp9',
                            fields: { VAR: { name: 'sensorVal' } }
                          }
                        }
                      },
                      next: {
                        block: {
                          type: 'controls_if', id: 'dp10',
                          inputs: {
                            IF0: {
                              block: {
                                type: 'logic_compare', id: 'dp11',
                                fields: { OP: 'EQ' },
                                inputs: {
                                  A: {
                                    block: {
                                      type: 'variables_get', id: 'dp12',
                                      fields: { VAR: { name: 'sensorVal' } }
                                    }
                                  },
                                  B: {
                                    block: {
                                      type: 'math_number', id: 'dp13',
                                      fields: { NUM: 1 }
                                    }
                                  }
                                }
                              }
                            },
                            DO0: {
                              block: {
                                type: 'digital_write', id: 'dp14',
                                fields: { PIN: 13, VALUE: 'LOW' }
                              }
                            },
                            ELSE: {
                              block: {
                                type: 'digital_write', id: 'dp15',
                                fields: { PIN: 13, VALUE: 'HIGH' }
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

  // ═══ 3. toneKeyboard ══════════════════════════
  {
    name: 'toneKeyboard',
    category: '02.Digital',
    description: 'Teclado de 3 sensores de presión que generan notas musicales',
    comment: `/*
  Keyboard

  Plays a pitch that changes based on a changing analog input

  circuit:
  - three force-sensing resistors from +5V to analog in 0 through 5
  - three 10 kilohm resistors from analog in 0 through 5 to ground
  - 8 ohm speaker on digital pin 8

  created 21 Jan 2010
  modified 9 Apr 2012
  by Tom Igoe

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/digital/toneKeyboard/
*/
Agregado a ArduBlock — 2026-05-31`,
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'arduino_setup', id: 'tk1', x: 20, y: 20
          },
          {
            type: 'arduino_loop', id: 'tk2', x: 20, y: 120,
            inputs: {
              BODY: {
                block: {
                  type: 'variables_set', id: 'tk3',
                  fields: { VAR: { name: 'sensorReading' } },
                  inputs: {
                    VALUE: {
                      block: {
                        type: 'analog_read', id: 'tk4',
                        fields: { PIN: 0 }
                      }
                    }
                  },
                  next: {
                    block: {
                      type: 'controls_if', id: 'tk5',
                      inputs: {
                        IF0: {
                          block: {
                            type: 'logic_compare', id: 'tk6',
                            fields: { OP: 'GT' },
                            inputs: {
                              A: {
                                block: {
                                  type: 'variables_get', id: 'tk7',
                                  fields: { VAR: { name: 'sensorReading' } }
                                }
                              },
                              B: {
                                block: {
                                  type: 'math_number', id: 'tk8',
                                  fields: { NUM: 10 }
                                }
                              }
                            }
                          }
                        },
                        DO0: {
                          block: {
                            type: 'tone_output', id: 'tk9',
                            fields: { PIN: 8, FREQ: 440 }
                          }
                        }
                      },
                      next: {
                        block: {
                          type: 'variables_set', id: 'tk10',
                          fields: { VAR: { name: 'sensorReading' } },
                          inputs: {
                            VALUE: {
                              block: {
                                type: 'analog_read', id: 'tk11',
                                fields: { PIN: 1 }
                              }
                            }
                          },
                          next: {
                            block: {
                              type: 'controls_if', id: 'tk12',
                              inputs: {
                                IF0: {
                                  block: {
                                    type: 'logic_compare', id: 'tk13',
                                    fields: { OP: 'GT' },
                                    inputs: {
                                      A: {
                                        block: {
                                          type: 'variables_get', id: 'tk14',
                                          fields: { VAR: { name: 'sensorReading' } }
                                        }
                                      },
                                      B: {
                                        block: {
                                          type: 'math_number', id: 'tk15',
                                          fields: { NUM: 10 }
                                        }
                                      }
                                    }
                                  }
                                },
                                DO0: {
                                  block: {
                                    type: 'tone_output', id: 'tk16',
                                    fields: { PIN: 8, FREQ: 494 }
                                  }
                                }
                              },
                              next: {
                                block: {
                                  type: 'variables_set', id: 'tk17',
                                  fields: { VAR: { name: 'sensorReading' } },
                                  inputs: {
                                    VALUE: {
                                      block: {
                                        type: 'analog_read', id: 'tk18',
                                        fields: { PIN: 2 }
                                      }
                                    }
                                  },
                                  next: {
                                    block: {
                                      type: 'controls_if', id: 'tk19',
                                      inputs: {
                                        IF0: {
                                          block: {
                                            type: 'logic_compare', id: 'tk20',
                                            fields: { OP: 'GT' },
                                            inputs: {
                                              A: {
                                                block: {
                                                  type: 'variables_get', id: 'tk21',
                                                  fields: { VAR: { name: 'sensorReading' } }
                                                }
                                              },
                                              B: {
                                                block: {
                                                  type: 'math_number', id: 'tk22',
                                                  fields: { NUM: 10 }
                                                }
                                              }
                                            }
                                          }
                                        },
                                        DO0: {
                                          block: {
                                            type: 'tone_output', id: 'tk23',
                                            fields: { PIN: 8, FREQ: 131 }
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
    description: 'Genera un tono cuya frecuencia varía según la luz captada por un fotorresistor',
    comment: `/*
  Pitch follower

  Plays a pitch that changes based on a changing analog input

  circuit:
  - 8 ohm speaker on digital pin 9
  - photoresistor on analog 0 to 5V
  - 4.7 kilohm resistor on analog 0 to ground

  created 21 Jan 2010
  modified 31 May 2012
  by Tom Igoe, with suggestion from Michael Flynn

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/digital/tonePitchFollower/
*/
Agregado a ArduBlock — 2026-05-31`,
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
                  type: 'variables_set', id: 'tp4',
                  fields: { VAR: { name: 'sensorReading' } },
                  inputs: {
                    VALUE: {
                      block: {
                        type: 'analog_read', id: 'tp5',
                        fields: { PIN: 0 }
                      }
                    }
                  },
                  next: {
                    block: {
                      type: 'serial_println', id: 'tp6',
                      inputs: {
                        TEXT: {
                          block: {
                            type: 'variables_get', id: 'tp7',
                            fields: { VAR: { name: 'sensorReading' } }
                          }
                        }
                      },
                      next: {
                        block: {
                          type: 'variables_set', id: 'tp8',
                          fields: { VAR: { name: 'thisPitch' } },
                          inputs: {
                            VALUE: {
                              block: {
                                type: 'map_value', id: 'tp9',
                                fields: {
                                  FROM_LOW: 400,
                                  FROM_HIGH: 1000,
                                  TO_LOW: 120,
                                  TO_HIGH: 1500
                                },
                                inputs: {
                                  VALUE: {
                                    block: {
                                      type: 'variables_get', id: 'tp10',
                                      fields: { VAR: { name: 'sensorReading' } }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          next: {
                            block: {
                              type: 'tone_output', id: 'tp11',
                              fields: { PIN: 9, FREQ: 120 }
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
