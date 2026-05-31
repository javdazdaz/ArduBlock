/**
 * ArduBlock — Ejemplos Basics como workspace states
 * Cada ejemplo tiene: name, description, comment (header .ino), state (Blockly JSON)
 */
export const basicsExamples = [
  // ═══ 1. BareMinimum ════════════════════════════
  {
    name: 'BareMinimum',
    category: '01.Basics',
    description: 'Estructura mínima de un sketch Arduino',
    comment: `/*
  Arduino BareMinimum — El sketch más simple posible.
  setup() se ejecuta una vez al iniciar.
  loop() se repite indefinidamente.
*/`,
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          { type: 'arduino_setup', id: 'bm1', x: 20, y: 20 },
          { type: 'arduino_loop',  id: 'bm2', x: 20, y: 120 }
        ]
      }
    }
  },

  // ═══ 2. Blink ═════════════════════════════════
  {
    name: 'Blink',
    category: '01.Basics',
    description: 'Enciende y apaga un LED cada 1 segundo',
    comment: `/*
  Blink — Enciende un LED por un segundo, luego lo apaga por un segundo, repetidamente.
  La mayoría de los Arduinos tienen un LED integrado en el pin 13.
*/`,
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'arduino_setup', id: 'b1', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'pin_mode', id: 'b2',
                  fields: { PIN: 13, MODE: 'OUTPUT' }
                }
              }
            }
          },
          {
            type: 'arduino_loop', id: 'b3', x: 20, y: 160,
            inputs: {
              BODY: {
                block: {
                  type: 'digital_write', id: 'b4',
                  fields: { PIN: 13, VALUE: 'HIGH' },
                  next: {
                    block: {
                      type: 'delay_ms', id: 'b5',
                      fields: { MS: 1000 },
                      next: {
                        block: {
                          type: 'digital_write', id: 'b6',
                          fields: { PIN: 13, VALUE: 'LOW' },
                          next: {
                            block: {
                              type: 'delay_ms', id: 'b7',
                              fields: { MS: 1000 }
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

  // ═══ 3. AnalogReadSerial ═══════════════════════
  {
    name: 'AnalogReadSerial',
    category: '01.Basics',
    description: 'Lee un pin analógico y lo imprime por Serial',
    comment: `/*
  AnalogReadSerial — Lee el pin A0 y envía el valor por Serial.
  Conectá un potenciómetro al pin A0: pata central a A0, otras a 5V y GND.
*/`,
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'arduino_setup', id: 'ar1', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'serial_begin', id: 'ar2',
                  fields: { BAUD: '9600' }
                }
              }
            }
          },
          {
            type: 'arduino_loop', id: 'ar3', x: 20, y: 160,
            inputs: {
              BODY: {
                block: {
                  type: 'variables_set', id: 'ar4',
                  fields: { VAR: { name: 'sensorValue' } },
                  inputs: {
                    VALUE: {
                      block: {
                        type: 'analog_read', id: 'ar5',
                        fields: { PIN: 0 }
                      }
                    }
                  },
                  next: {
                    block: {
                      type: 'serial_println', id: 'ar6',
                      inputs: {
                        TEXT: {
                          block: {
                            type: 'variables_get', id: 'ar7',
                            fields: { VAR: { name: 'sensorValue' } }
                          }
                        }
                      },
                      next: {
                        block: {
                          type: 'delay_ms', id: 'ar8',
                          fields: { MS: 1 }
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

  // ═══ 4. DigitalReadSerial ══════════════════════
  {
    name: 'DigitalReadSerial',
    category: '01.Basics',
    description: 'Lee un pin digital y lo imprime por Serial',
    comment: `/*
  DigitalReadSerial — Lee el pin 2 y envía el estado por Serial.
  Conectá un pulsador entre el pin 2 y GND (con INPUT_PULLUP).
*/`,
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'arduino_setup', id: 'dr1', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'serial_begin', id: 'dr2',
                  fields: { BAUD: '9600' },
                  next: {
                    block: {
                      type: 'pin_mode', id: 'dr3',
                      fields: { PIN: 2, MODE: 'INPUT_PULLUP' }
                    }
                  }
                }
              }
            }
          },
          {
            type: 'arduino_loop', id: 'dr4', x: 20, y: 200,
            inputs: {
              BODY: {
                block: {
                  type: 'variables_set', id: 'dr5',
                  fields: { VAR: { name: 'buttonState' } },
                  inputs: {
                    VALUE: {
                      block: {
                        type: 'digital_read', id: 'dr6',
                        fields: { PIN: 2 }
                      }
                    }
                  },
                  next: {
                    block: {
                      type: 'serial_println', id: 'dr7',
                      inputs: {
                        TEXT: {
                          block: {
                            type: 'variables_get', id: 'dr8',
                            fields: { VAR: { name: 'buttonState' } }
                          }
                        }
                      },
                      next: {
                        block: {
                          type: 'delay_ms', id: 'dr9',
                          fields: { MS: 1 }
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

  // ═══ 5. Fade ══════════════════════════════════
  {
    name: 'Fade',
    category: '01.Basics',
    description: 'Aumenta y disminuye el brillo de un LED con PWM',
    comment: `/*
  Fade — Hace un fade-in y fade-out de un LED en el pin 9 usando analogWrite (PWM).
  El pin 9 soporta PWM (~) en Arduino Uno.
*/`,
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          { type: 'arduino_setup', id: 'f1', x: 20, y: 20 },
          {
            type: 'arduino_loop', id: 'f2', x: 20, y: 120,
            inputs: {
              BODY: {
                block: {
                  type: 'controls_repeat_ext', id: 'f3',
                  fields: { TIMES: 51 },
                  inputs: {
                    DO: {
                      block: {
                        type: 'analog_write', id: 'f4',
                        fields: { PIN: 9 },
                        inputs: {
                          VALUE: {
                            block: {
                              type: 'variables_get', id: 'f5',
                              fields: { VAR: { name: 'i' } }
                            }
                          }
                        },
                        next: {
                          block: {
                            type: 'delay_ms', id: 'f6',
                            fields: { MS: 30 }
                          }
                        }
                      }
                    }
                  },
                  next: {
                    block: {
                      type: 'controls_repeat_ext', id: 'f7',
                      fields: { TIMES: 51 },
                      inputs: {
                        DO: {
                          block: {
                            type: 'analog_write', id: 'f8',
                            fields: { PIN: 9 },
                            inputs: {
                              VALUE: {
                                block: {
                                  type: 'math_arithmetic', id: 'f9',
                                  fields: { OP: 'MINUS' },
                                  inputs: {
                                    A: {
                                      block: {
                                        type: 'math_number', id: 'f10',
                                        fields: { NUM: 255 }
                                      }
                                    },
                                    B: {
                                      block: {
                                        type: 'variables_get', id: 'f11',
                                        fields: { VAR: { name: 'i' } }
                                      }
                                    }
                                  }
                                }
                              }
                            },
                            next: {
                              block: {
                                type: 'delay_ms', id: 'f12',
                                fields: { MS: 30 }
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

  // ═══ 6. ReadAnalogVoltage ═══════════════════════
  {
    name: 'ReadAnalogVoltage',
    category: '01.Basics',
    description: 'Lee voltaje analógico y lo imprime por Serial',
    comment: `/*
  ReadAnalogVoltage — Lee el pin A0, convierte a voltaje y lo imprime.
  Conectá el centro de un potenciómetro a A0, extremos a 5V y GND.
  El valor analógico (0-1023) se convierte a voltaje (0-5V).
*/`,
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'arduino_setup', id: 'rv1', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'serial_begin', id: 'rv2',
                  fields: { BAUD: '9600' }
                }
              }
            }
          },
          {
            type: 'arduino_loop', id: 'rv3', x: 20, y: 160,
            inputs: {
              BODY: {
                block: {
                  type: 'variables_set', id: 'rv4',
                  fields: { VAR: { name: 'sensorValue' } },
                  inputs: {
                    VALUE: {
                      block: {
                        type: 'analog_read', id: 'rv5',
                        fields: { PIN: 0 }
                      }
                    }
                  },
                  next: {
                    block: {
                      type: 'variables_set', id: 'rv6',
                      fields: { VAR: { name: 'voltage' } },
                      inputs: {
                        VALUE: {
                          block: {
                            type: 'math_arithmetic', id: 'rv7',
                            fields: { OP: 'MULTIPLY' },
                            inputs: {
                              A: {
                                block: {
                                  type: 'variables_get', id: 'rv8',
                                  fields: { VAR: { name: 'sensorValue' } }
                                }
                              },
                              B: {
                                block: {
                                  type: 'math_arithmetic', id: 'rv9',
                                  fields: { OP: 'DIVIDE' },
                                  inputs: {
                                    A: {
                                      block: {
                                        type: 'math_number', id: 'rv10',
                                        fields: { NUM: 5.0 }
                                      }
                                    },
                                    B: {
                                      block: {
                                        type: 'math_number', id: 'rv11',
                                        fields: { NUM: 1023.0 }
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
                          type: 'serial_println', id: 'rv12',
                          inputs: {
                            TEXT: {
                              block: {
                                type: 'variables_get', id: 'rv13',
                                fields: { VAR: { name: 'voltage' } }
                              }
                            }
                          },
                          next: {
                            block: {
                              type: 'delay_ms', id: 'rv14',
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
