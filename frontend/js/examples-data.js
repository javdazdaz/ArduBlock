/**
 * ArduBlock — Ejemplos 01.Basics como workspace states.
 * Comentarios bilingües (es/en). Variables usan el sistema custom de ArduBlock.
 */
export const basicsExamples = [

  // ═══ 1. BareMinimum ════════════════════════════
  {
    name: 'BareMinimum',
    category: '01.Basics',
    description: 'Estructura mínima de un sketch Arduino',
    comment: {
      es: `/*
  BareMinimum

  Este ejemplo contiene el código mínimo necesario para que un sketch
  compile en Arduino: el método setup() y el método loop().

  Este código es de dominio público.

  https://docs.arduino.cc/built-in-examples/basics/BareMinimum/

  Agregado a ArduBlock — 2026-05-31
*/`,
      en: `/*
  BareMinimum

  This example contains the bare minimum of code you need for a sketch
  to compile on Arduino: the setup() method and the loop() method.

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/basics/BareMinimum/

  Added to ArduBlock — 2026-05-31
*/`
    },
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
    comment: {
      es: `/*
  Blink

  Enciende un LED por un segundo, luego lo apaga por un segundo,
  de forma repetida.

  La mayoría de los Arduinos tienen un LED integrado en la placa.
  En UNO, MEGA y ZERO está en el pin digital 13.

  modificado 8 May 2014 por Scott Fitzgerald
  modificado 2 Sep 2016 por Arturo Guadalupi
  modificado 8 Sep 2016 por Colby Newman

  Este código es de dominio público.

  https://docs.arduino.cc/built-in-examples/basics/Blink/

  Agregado a ArduBlock — 2026-05-31
*/`,
      en: `/*
  Blink

  Turns an LED on for one second, then off for one second, repeatedly.

  Most Arduinos have an on-board LED you can control. On the UNO, MEGA and ZERO
  it is attached to digital pin 13, on MKR1000 on pin 6. LED_BUILTIN is set to
  the correct LED pin independent of which board is used.

  modified 8 May 2014 by Scott Fitzgerald
  modified 2 Sep 2016 by Arturo Guadalupi
  modified 8 Sep 2016 by Colby Newman

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/basics/Blink/

  Added to ArduBlock — 2026-05-31
*/`
    },
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
    comment: {
      es: `/*
  AnalogReadSerial

  Lee una entrada analógica en el pin 0 e imprime el resultado
  en el Monitor Serial. Se puede usar el Serial Plotter para
  ver una gráfica (Herramientas > Serial Plotter).

  Conectá el pin central de un potenciómetro a A0,
  y los pines externos a +5V y tierra.

  Este código es de dominio público.

  https://docs.arduino.cc/built-in-examples/basics/AnalogReadSerial/

  Agregado a ArduBlock — 2026-05-31
*/`,
      en: `/*
  AnalogReadSerial

  Reads an analog input on pin 0, prints the result to the Serial Monitor.
  Graphical representation is available using Serial Plotter (Tools > Serial Plotter menu).
  Attach the center pin of a potentiometer to pin A0, and the outside pins to +5V and ground.

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/basics/AnalogReadSerial/

  Added to ArduBlock — 2026-05-31
*/`
    },
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'arduino_setup', id: 'ar1', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'pin_mode', id: 'ar_setup1',
                  fields: { PIN: 0, MODE: 'INPUT' },
                  next: {
                    block: {
                      type: 'serial_begin', id: 'ar2',
                      fields: { BAUD: '9600' }
                    }
                  }
                }
              }
            }
          },
          {
            type: 'arduino_loop', id: 'ar3', x: 20, y: 160,
            inputs: {
              BODY: {
                block: {
                  type: 'variable_declare', id: 'ar4',
                  fields: { NAME: 'sensorValue', TYPE: 'int' },
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
                            type: 'variable_get', id: 'ar7',
                            fields: { NAME: 'sensorValue' }
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
    comment: {
      es: `/*
  DigitalReadSerial

  Lee una entrada digital en el pin 2 e imprime el resultado
  en el Monitor Serial.

  Conectá un pulsador al pin 2. Al presionarlo, el pin lee HIGH.
  Al soltarlo, lee LOW.

  Este código es de dominio público.

  https://docs.arduino.cc/built-in-examples/basics/DigitalReadSerial/

  Agregado a ArduBlock — 2026-05-31
*/`,
      en: `/*
  DigitalReadSerial

  Reads a digital input on pin 2, prints the result to the Serial Monitor

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/basics/DigitalReadSerial/

  Added to ArduBlock — 2026-05-31
*/`
    },
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
                      fields: { PIN: 2, MODE: 'INPUT' }
                    }
                  }
                }
              }
            }
          },
          {
            type: 'arduino_loop', id: 'dr4', x: 20, y: 180,
            inputs: {
              BODY: {
                block: {
                  type: 'variable_declare', id: 'dr5',
                  fields: { NAME: 'buttonState', TYPE: 'int' },
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
                            type: 'variable_get', id: 'dr8',
                            fields: { NAME: 'buttonState' }
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
    comment: {
      es: `/*
  Fade

  Este ejemplo muestra cómo hacer un fade (aumento y disminución
  de brillo) en un LED conectado al pin 9 usando analogWrite().

  La función analogWrite() usa PWM. Si querés cambiar de pin,
  asegurate de usar uno con capacidad PWM (~3, ~5, ~6, ~9, ~10, ~11).

  Este código es de dominio público.

  https://docs.arduino.cc/built-in-examples/basics/Fade/

  Agregado a ArduBlock — 2026-05-31
*/`,
      en: `/*
  Fade

  This example shows how to fade an LED on pin 9 using the analogWrite() function.

  The analogWrite() function uses PWM, so if you want to change the pin you're
  using, be sure to use another PWM capable pin. On most Arduino, the PWM pins
  are identified with a "~" sign, like ~3, ~5, ~6, ~9, ~10 and ~11.

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/basics/Fade/

  Added to ArduBlock — 2026-05-31
*/`
    },
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'variable_declare', id: 'fv1', x: 20, y: 310,
            fields: { NAME: 'brightness', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'fv2', fields: { NUM: 0 } } } }
          },
          {
            type: 'variable_declare', id: 'fv3', x: 20, y: 400,
            fields: { NAME: 'fadeAmount', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'fv4', fields: { NUM: 5 } } } }
          },
          {
            type: 'arduino_setup', id: 'f1', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'pin_mode', id: 'f2',
                  fields: { PIN: 9, MODE: 'OUTPUT' }
                }
              }
            }
          },
          {
            type: 'arduino_loop', id: 'f3', x: 20, y: 160,
            inputs: {
              BODY: {
                block: {
                  type: 'analog_write', id: 'f4',
                  fields: { PIN: 9 },
                  inputs: {
                    VALUE: {
                      block: {
                        type: 'variable_get', id: 'f5',
                        fields: { NAME: 'brightness' }
                      }
                    }
                  },
                  next: {
                    block: {
                      type: 'variable_set', id: 'f6',
                      fields: { NAME: 'brightness' },
                      inputs: {
                        VALUE: {
                          block: {
                            type: 'math_arithmetic', id: 'f7',
                            fields: { OP: 'ADD' },
                            inputs: {
                              A: {
                                block: {
                                  type: 'variable_get', id: 'f8',
                                  fields: { NAME: 'brightness' }
                                }
                              },
                              B: {
                                block: {
                                  type: 'variable_get', id: 'f9',
                                  fields: { NAME: 'fadeAmount' }
                                }
                              }
                            }
                          }
                        }
                      },
                      next: {
                        block: {
                          type: 'controls_if', id: 'f10',
                          inputs: {
                            IF0: {
                              block: {
                                type: 'logic_operation', id: 'f11',
                                fields: { OP: 'OR' },
                                inputs: {
                                  A: {
                                    block: {
                                      type: 'logic_compare', id: 'f12',
                                      fields: { OP: 'LTE' },
                                      inputs: {
                                        A: {
                                          block: {
                                            type: 'variable_get', id: 'f13',
                                            fields: { NAME: 'brightness' }
                                          }
                                        },
                                        B: {
                                          block: { type: 'math_number', id: 'f14', fields: { NUM: 0 } }
                                        }
                                      }
                                    }
                                  },
                                  B: {
                                    block: {
                                      type: 'logic_compare', id: 'f15',
                                      fields: { OP: 'GTE' },
                                      inputs: {
                                        A: {
                                          block: {
                                            type: 'variable_get', id: 'f16',
                                            fields: { NAME: 'brightness' }
                                          }
                                        },
                                        B: {
                                          block: { type: 'math_number', id: 'f17', fields: { NUM: 255 } }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            },
                            DO0: {
                              block: {
                                type: 'variable_set', id: 'f18',
                                fields: { NAME: 'fadeAmount' },
                                inputs: {
                                  VALUE: {
                                    block: {
                                      type: 'math_single', id: 'f19',
                                      fields: { OP: 'NEG' },
                                      inputs: {
                                        NUM: {
                                          block: {
                                            type: 'variable_get', id: 'f20',
                                            fields: { NAME: 'fadeAmount' }
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
                              type: 'delay_ms', id: 'f21',
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
        ]
      }
    }
  },

  // ═══ 6. ReadAnalogVoltage ═══════════════════════
  {
    name: 'ReadAnalogVoltage',
    category: '01.Basics',
    description: 'Lee voltaje analógico y lo imprime por Serial',
    comment: {
      es: `/*
  ReadAnalogVoltage

  Lee una entrada analógica en el pin 0, la convierte a voltaje
  e imprime el resultado en el Monitor Serial.

  Conectá el pin central de un potenciómetro a A0,
  y los pines externos a +5V y tierra.

  Este código es de dominio público.

  https://docs.arduino.cc/built-in-examples/basics/ReadAnalogVoltage/

  Agregado a ArduBlock — 2026-05-31
*/`,
      en: `/*
  ReadAnalogVoltage

  Reads an analog input on pin 0, converts it to voltage, and prints the result
  to the Serial Monitor. Graphical representation is available using Serial
  Plotter (Tools > Serial Plotter menu). Attach the center pin of a potentiometer
  to pin A0, and the outside pins to +5V and ground.

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/basics/ReadAnalogVoltage/

  Added to ArduBlock — 2026-05-31
*/`
    },
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'arduino_setup', id: 'rv1', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'pin_mode', id: 'rv_setup1',
                  fields: { PIN: 0, MODE: 'INPUT' },
                  next: {
                    block: {
                      type: 'serial_begin', id: 'rv2',
                      fields: { BAUD: '9600' }
                    }
                  }
                }
              }
            }
          },
          {
            type: 'arduino_loop', id: 'rv3', x: 20, y: 160,
            inputs: {
              BODY: {
                block: {
                  type: 'variable_declare', id: 'rv4',
                  fields: { NAME: 'sensorValue', TYPE: 'int' },
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
                      type: 'variable_declare', id: 'rv6',
                      fields: { NAME: 'voltage', TYPE: 'float' },
                      inputs: {
                        VALUE: {
                          block: {
                            type: 'math_arithmetic', id: 'rv7',
                            fields: { OP: 'MULTIPLY' },
                            inputs: {
                              A: {
                                block: {
                                  type: 'variable_get', id: 'rv8',
                                  fields: { NAME: 'sensorValue' }
                                }
                              },
                              B: {
                                block: {
                                  type: 'math_arithmetic', id: 'rv9',
                                  fields: { OP: 'DIVIDE' },
                                  inputs: {
                                    A: { block: { type: 'math_number', id: 'rv10', fields: { NUM: 5.0 } } },
                                    B: { block: { type: 'math_number', id: 'rv11', fields: { NUM: 1023.0 } } }
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
                                type: 'variable_get', id: 'rv13',
                                fields: { NAME: 'voltage' }
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
