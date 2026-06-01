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
    comment: {
      es: `/*
  Dimmer

  Demuestra cómo enviar datos de la computadora a la placa Arduino,
  en este caso para controlar el brillo de un LED. Los datos se envían
  en bytes individuales, cada uno entre 0 y 255. Arduino lee estos bytes
  y los usa para ajustar el brillo del LED.

  El circuito:
  - LED conectado del pin digital 9 a tierra con resistencia de 220 ohm.

  creado 2006 por David A. Mellis
  modificado 30 Ago 2011 por Tom Igoe y Scott Fitzgerald

  Este código es de dominio público.

  https://docs.arduino.cc/built-in-examples/communication/Dimmer/

  Agregado a ArduBlock — 2026-06-01
*/`,
      en: `/*
  Dimmer

  Demonstrates sending data from the computer to the Arduino board, in this case
  to control the brightness of an LED. The data is sent in individual bytes,
  each of which ranges from 0 to 255. Arduino reads these bytes and uses them to
  set the brightness of the LED.

  The circuit:
  - LED attached from digital pin 9 to ground through 220 ohm resistor.

  created 2006
  by David A. Mellis
  modified 30 Aug 2011
  by Tom Igoe and Scott Fitzgerald

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/communication/Dimmer/

  Added to ArduBlock — 2026-06-01
*/`
    },
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'variable_declare', id: 'dm_g1', x: 20, y: 240,
            fields: { NAME: 'ledPin', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'dm_gn1', fields: { NUM: 9 } } } }
          },
          {
            type: 'arduino_setup', id: 'dm_s', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'serial_begin', id: 'dm_sb',
                  fields: { BAUD: '9600' },
                  next: {
                    block: {
                      type: 'pin_mode', id: 'dm_pm',
                      fields: { PIN: 9, MODE: 'OUTPUT' }
                    }
                  }
                }
              }
            }
          },
          {
            type: 'arduino_loop', id: 'dm_l', x: 20, y: 140,
            inputs: {
              BODY: {
                block: {
                  type: 'controls_if', id: 'dm_if',
                  inputs: {
                    IF0: {
                      block: {
                        type: 'logic_compare', id: 'dm_cmp',
                        fields: { OP: 'GT' },
                        inputs: {
                          A: { block: { type: 'serial_available', id: 'dm_av' } },
                          B: { block: { type: 'math_number', id: 'dm_n0', fields: { NUM: 0 } } }
                        }
                      }
                    },
                    DO0: {
                      block: {
                        type: 'variable_set', id: 'dm_set',
                        fields: { NAME: 'ledPin' },
                        inputs: {
                          VALUE: {
                            block: { type: 'serial_read', id: 'dm_rd' }
                          }
                        },
                        next: {
                          block: {
                            type: 'analog_write', id: 'dm_aw',
                            fields: { PIN: 9 },
                            inputs: {
                              VALUE: {
                                block: { type: 'variable_get', id: 'dm_vg', fields: { NAME: 'ledPin' } }
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

  // ═══ 2. Graph ═════════════════════════════════
  {
    name: 'Graph',
    category: '04.Communication',
    description: 'Envía el valor del pin analógico A0 por Serial para graficarlo en la PC',
    comment: {
      es: `/*
  Graph

  Un ejemplo simple de comunicación desde la placa Arduino a la computadora:
  se envía por el puerto serial el valor de la entrada analógica 0.

  Podés usar el Monitor Serial de Arduino para ver los datos, o leerlos
  con Processing, PD, Max/MSP, u otro programa capaz de leer del puerto serial.

  El circuito:
  - cualquier sensor analógico conectado al pin A0

  creado 2006 por David A. Mellis
  modificado 9 Abr 2012 por Tom Igoe y Scott Fitzgerald

  Este código es de dominio público.

  https://docs.arduino.cc/built-in-examples/communication/Graph/

  Agregado a ArduBlock — 2026-05-31
*/`,
      en: `/*
  Graph

  A simple example of communication from the Arduino board to the computer: The
  value of analog input 0 is sent out the serial port.

  You can use the Arduino Serial Monitor to view the sent data, or it can be
  read by Processing, PD, Max/MSP, or any other program capable of reading data
  from a serial port.

  The circuit:
  - any analog input sensor attached to analog in pin 0

  created 2006
  by David A. Mellis
  modified 9 Apr 2012
  by Tom Igoe and Scott Fitzgerald

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/communication/Graph/

  Added to ArduBlock — 2026-05-31
*/`
    },
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'arduino_setup', id: 'g1', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'pin_mode', id: 'g_setup1',
                  fields: { PIN: 0, MODE: 'INPUT' },
                  next: {
                    block: {
                      type: 'serial_begin', id: 'g2',
                      fields: { BAUD: '9600' }
                    }
                  }
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
                      fields: { MS: 2 }
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
    comment: {
      es: `/*
  Physical Pixel

  Un ejemplo de cómo usar la placa Arduino para recibir datos de la
  computadora. En este caso, Arduino enciende un LED cuando recibe el
  carácter 'H' y lo apaga cuando recibe 'L'.

  Los datos se pueden enviar desde el Monitor Serial de Arduino, o desde
  otro programa como Processing, Flash, PD o Max/MSP.

  El circuito:
  - LED conectado del pin digital 13 a tierra con resistencia de 220 ohm

  creado 2006 por David A. Mellis
  modificado 30 Ago 2011 por Tom Igoe y Scott Fitzgerald

  Este código es de dominio público.

  https://docs.arduino.cc/built-in-examples/communication/PhysicalPixel/

  Agregado a ArduBlock — 2026-06-01
*/`,
      en: `/*
  Physical Pixel

  An example of using the Arduino board to receive data from the computer. In
  this case, the Arduino boards turns on an LED when it receives the character
  'H', and turns off the LED when it receives the character 'L'.

  The data can be sent from the Arduino Serial Monitor, or another program like
  Processing, Flash, PD, or Max/MSP.

  The circuit:
  - LED connected from digital pin 13 to ground through 220 ohm resistor

  created 2006
  by David A. Mellis
  modified 30 Aug 2011
  by Tom Igoe and Scott Fitzgerald

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/communication/PhysicalPixel/

  Added to ArduBlock — 2026-06-01
*/`
    },
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'variable_declare', id: 'pp_g1', x: 20, y: 240,
            fields: { NAME: 'ledPin', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'pp_gn1', fields: { NUM: 13 } } } }
          },
          {
            type: 'variable_declare', id: 'pp_g2', x: 20, y: 280,
            fields: { NAME: 'incomingByte', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'pp_gn2', fields: { NUM: 0 } } } }
          },
          {
            type: 'arduino_setup', id: 'pp_s', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'serial_begin', id: 'pp_sb',
                  fields: { BAUD: '9600' },
                  next: {
                    block: {
                      type: 'pin_mode', id: 'pp_pm',
                      fields: { PIN: 13, MODE: 'OUTPUT' }
                    }
                  }
                }
              }
            }
          },
          {
            type: 'arduino_loop', id: 'pp_l', x: 20, y: 160,
            inputs: {
              BODY: {
                block: {
                  type: 'controls_if', id: 'pp_if1',
                  inputs: {
                    IF0: {
                      block: {
                        type: 'logic_compare', id: 'pp_cmp1',
                        fields: { OP: 'GT' },
                        inputs: {
                          A: { block: { type: 'serial_available', id: 'pp_av' } },
                          B: { block: { type: 'math_number', id: 'pp_n0', fields: { NUM: 0 } } }
                        }
                      }
                    },
                    DO0: {
                      block: {
                        type: 'variable_set', id: 'pp_set',
                        fields: { NAME: 'incomingByte' },
                        inputs: {
                          VALUE: { block: { type: 'serial_read', id: 'pp_rd' } }
                        },
                        next: {
                          block: {
                            type: 'controls_if', id: 'pp_if2',
                            inputs: {
                              IF0: {
                                block: {
                                  type: 'logic_compare', id: 'pp_cmp2',
                                  fields: { OP: 'EQ' },
                                  inputs: {
                                    A: { block: { type: 'variable_get', id: 'pp_vg1', fields: { NAME: 'incomingByte' } } },
                                    B: { block: { type: 'math_number', id: 'pp_nH', fields: { NUM: 72 } } }
                                  }
                                }
                              },
                              DO0: {
                                block: {
                                  type: 'digital_write', id: 'pp_dw1',
                                  fields: { PIN: 13, VALUE: 'HIGH' }
                                }
                              }
                            },
                            next: {
                              block: {
                                type: 'controls_if', id: 'pp_if3',
                                inputs: {
                                  IF0: {
                                    block: {
                                      type: 'logic_compare', id: 'pp_cmp3',
                                      fields: { OP: 'EQ' },
                                      inputs: {
                                        A: { block: { type: 'variable_get', id: 'pp_vg2', fields: { NAME: 'incomingByte' } } },
                                        B: { block: { type: 'math_number', id: 'pp_nL', fields: { NUM: 76 } } }
                                      }
                                    }
                                  },
                                  DO0: {
                                    block: {
                                      type: 'digital_write', id: 'pp_dw2',
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
                  }
                }
              }
            }
          }
        ]
      }
    }
  },

  // ═══ 4. ReadASCIIString ═══════════════════════
  {
    name: 'ReadASCIIString',
    category: '04.Communication',
    description: 'Recibe valores RGB por Serial (parseInt) y los muestra en un LED RGB',
    comment: {
      es: `/*
  Leyendo un string ASCII por Serial

  Este sketch demuestra la funcion Serial.parseInt().
  Busca un string ASCII de valores separados por coma,
  los convierte a int y los usa para controlar un LED RGB.

  Circuito: LED RGB catodo comun:
  - anodo rojo:  pin digital 3 con resistencia 220 ohm
  - anodo verde: pin digital 5 con resistencia 220 ohm
  - anodo azul:  pin digital 6 con resistencia 220 ohm
  - catodo: GND

  creado 13 Abr 2012 por Tom Igoe
  modificado 14 Mar 2016 por Arturo Guadalupi

  Este codigo es de dominio publico.

  https://docs.arduino.cc/built-in-examples/communication/ReadASCIIString/

  Agregado a ArduBlock — 2026-06-01
*/`,
      en: `/*
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

  Added to ArduBlock — 2026-06-01
*/`
    },
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'variable_declare', id: 'ras_p1', x: 20, y: 240,
            fields: { NAME: 'redPin', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'ras_np1', fields: { NUM: 3 } } } }
          },
          {
            type: 'variable_declare', id: 'ras_p2', x: 20, y: 280,
            fields: { NAME: 'greenPin', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'ras_np2', fields: { NUM: 5 } } } }
          },
          {
            type: 'variable_declare', id: 'ras_p3', x: 20, y: 320,
            fields: { NAME: 'bluePin', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'ras_np3', fields: { NUM: 6 } } } }
          },
          {
            type: 'arduino_setup', id: 'ras_s', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'serial_begin', id: 'ras_sb',
                  fields: { BAUD: '9600' },
                  next: {
                    block: {
                      type: 'pin_mode', id: 'ras_pm1',
                      fields: { PIN: 3, MODE: 'OUTPUT' },
                      next: {
                        block: {
                          type: 'pin_mode', id: 'ras_pm2',
                          fields: { PIN: 5, MODE: 'OUTPUT' },
                          next: {
                            block: {
                              type: 'pin_mode', id: 'ras_pm3',
                              fields: { PIN: 6, MODE: 'OUTPUT' }
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
            type: 'arduino_loop', id: 'ras_l', x: 20, y: 160,
            inputs: {
              BODY: {
                block: {
                  type: 'controls_whileUntil', id: 'ras_wh',
                  fields: { MODE: 'WHILE' },
                  inputs: {
                    BOOL: {
                      block: {
                        type: 'logic_compare', id: 'ras_c0',
                        fields: { OP: 'GT' },
                        inputs: {
                          A: { block: { type: 'serial_available', id: 'ras_av' } },
                          B: { block: { type: 'math_number', id: 'ras_n0', fields: { NUM: 0 } } }
                        }
                      }
                    },
                    DO: {
                      block: {
                        type: 'variable_declare', id: 'ras_vr',
                        fields: { NAME: 'red', TYPE: 'int' },
                        inputs: { VALUE: { block: { type: 'serial_parse_int', id: 'ras_pi1' } } },
                        next: {
                          block: {
                            type: 'variable_declare', id: 'ras_vg',
                            fields: { NAME: 'green', TYPE: 'int' },
                            inputs: { VALUE: { block: { type: 'serial_parse_int', id: 'ras_pi2' } } },
                            next: {
                              block: {
                                type: 'variable_declare', id: 'ras_vb',
                                fields: { NAME: 'blue', TYPE: 'int' },
                                inputs: { VALUE: { block: { type: 'serial_parse_int', id: 'ras_pi3' } } },
                                next: {
                                  block: {
                                    type: 'controls_if', id: 'ras_if',
                                    inputs: {
                                      IF0: {
                                        block: {
                                          type: 'logic_compare', id: 'ras_c1',
                                          fields: { OP: 'EQ' },
                                          inputs: {
                                            A: { block: { type: 'serial_read', id: 'ras_rd' } },
                                            B: { block: { type: 'math_number', id: 'ras_nl', fields: { NUM: 10 } } }
                                          }
                                        }
                                      },
                                      DO0: {
                                        block: {
                                          type: 'analog_write', id: 'ras_aw1',
                                          fields: { PIN: 3 },
                                          inputs: {
                                            VALUE: {
                                              block: {
                                                type: 'math_constrain', id: 'ras_ct1',
                                                inputs: {
                                                  VALUE: { block: { type: 'variable_get', id: 'ras_g1', fields: { NAME: 'red' } } },
                                                  LOW: { block: { type: 'math_number', id: 'ras_lo1', fields: { NUM: 0 } } },
                                                  HIGH: { block: { type: 'math_number', id: 'ras_hi1', fields: { NUM: 255 } } }
                                                }
                                              }
                                            }
                                          },
                                          next: {
                                            block: {
                                              type: 'analog_write', id: 'ras_aw2',
                                              fields: { PIN: 5 },
                                              inputs: {
                                                VALUE: {
                                                  block: {
                                                    type: 'math_constrain', id: 'ras_ct2',
                                                    inputs: {
                                                      VALUE: { block: { type: 'variable_get', id: 'ras_g2', fields: { NAME: 'green' } } },
                                                      LOW: { block: { type: 'math_number', id: 'ras_lo2', fields: { NUM: 0 } } },
                                                      HIGH: { block: { type: 'math_number', id: 'ras_hi2', fields: { NUM: 255 } } }
                                                    }
                                                  }
                                                }
                                              },
                                              next: {
                                                block: {
                                                  type: 'analog_write', id: 'ras_aw3',
                                                  fields: { PIN: 6 },
                                                  inputs: {
                                                    VALUE: {
                                                      block: {
                                                        type: 'math_constrain', id: 'ras_ct3',
                                                        inputs: {
                                                          VALUE: { block: { type: 'variable_get', id: 'ras_g3', fields: { NAME: 'blue' } } },
                                                          LOW: { block: { type: 'math_number', id: 'ras_lo3', fields: { NUM: 0 } } },
                                                          HIGH: { block: { type: 'math_number', id: 'ras_hi3', fields: { NUM: 255 } } }
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
  // ═══ 5. SerialCallResponse ════════════════════
  {
    name: 'SerialCallResponse',
    category: '04.Communication',
    description: 'Protocolo de handshake Serial: responde con 3 valores de sensores al recibir un byte',
    comment: {
      es: `/*
  Serial Call and Response

  Este programa envia una 'A' ASCII (byte 65) al iniciar
  y la repite hasta recibir datos. Luego espera un byte
  en el puerto serial y envia tres valores de sensores.

  El circuito:
  - potenciometros en entradas analogicas A0 y A1
  - pulsador en pin digital 2

  creado 26 Sep 2005 por Tom Igoe
  modificado 24 Abr 2012 por Tom Igoe y Scott Fitzgerald

  Este codigo es de dominio publico.

  https://docs.arduino.cc/built-in-examples/communication/SerialCallResponse/

  Agregado a ArduBlock — 2026-06-01
*/`,
      en: `/*
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

  Added to ArduBlock — 2026-06-01
*/`
    },
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'variable_declare', id: 'scr_g1', x: 20, y: 240,
            fields: { NAME: 'firstSensor', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'scr_n1', fields: { NUM: 0 } } } }
          },
          {
            type: 'variable_declare', id: 'scr_g2', x: 20, y: 280,
            fields: { NAME: 'secondSensor', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'scr_n2', fields: { NUM: 0 } } } }
          },
          {
            type: 'variable_declare', id: 'scr_g3', x: 20, y: 320,
            fields: { NAME: 'thirdSensor', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'scr_n3', fields: { NUM: 0 } } } }
          },
          {
            type: 'variable_declare', id: 'scr_g4', x: 20, y: 360,
            fields: { NAME: 'inByte', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'scr_n4', fields: { NUM: 0 } } } }
          },
          {
            type: 'arduino_setup', id: 'scr_s', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'serial_begin', id: 'scr_sb',
                  fields: { BAUD: '9600' },
                  next: {
                    block: {
                      type: 'pin_mode', id: 'scr_pm',
                      fields: { PIN: 2, MODE: 'INPUT' },
                      next: {
                        block: {
                          type: 'controls_whileUntil', id: 'scr_ec',
                          fields: { MODE: 'WHILE' },
                          inputs: {
                            BOOL: {
                              block: {
                                type: 'logic_compare', id: 'scr_c0',
                                fields: { OP: 'LTE' },
                                inputs: {
                                  A: { block: { type: 'serial_available', id: 'scr_av1' } },
                                  B: { block: { type: 'math_number', id: 'scr_n0', fields: { NUM: 0 } } }
                                }
                              }
                            },
                            DO: {
                              block: {
                                type: 'serial_write', id: 'scr_sw',
                                inputs: {
                                  VALUE: { block: { type: 'math_number', id: 'scr_nA', fields: { NUM: 65 } } }
                                },
                                next: {
                                  block: {
                                    type: 'delay_ms', id: 'scr_d3',
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
          },
          {
            type: 'arduino_loop', id: 'scr_l', x: 20, y: 200,
            inputs: {
              BODY: {
                block: {
                  type: 'controls_if', id: 'scr_if',
                  inputs: {
                    IF0: {
                      block: {
                        type: 'logic_compare', id: 'scr_c1',
                        fields: { OP: 'GT' },
                        inputs: {
                          A: { block: { type: 'serial_available', id: 'scr_av2' } },
                          B: { block: { type: 'math_number', id: 'scr_n01', fields: { NUM: 0 } } }
                        }
                      }
                    },
                    DO0: {
                      block: {
                        type: 'variable_set', id: 'scr_si',
                        fields: { NAME: 'inByte' },
                        inputs: { VALUE: { block: { type: 'serial_read', id: 'scr_rd' } } },
                        next: {
                          block: {
                            type: 'variable_set', id: 'scr_s1',
                            fields: { NAME: 'firstSensor' },
                            inputs: {
                              VALUE: {
                                block: {
                                  type: 'math_arithmetic', id: 'scr_dv1',
                                  fields: { OP: 'DIVIDE' },
                                  inputs: {
                                    A: { block: { type: 'analog_read', id: 'scr_ar1', fields: { PIN: 0 } } },
                                    B: { block: { type: 'math_number', id: 'scr_n4d', fields: { NUM: 4 } } }
                                  }
                                }
                              }
                            },
                            next: {
                              block: {
                                type: 'delay_ms', id: 'scr_d10',
                                fields: { MS: 10 },
                                next: {
                                  block: {
                                    type: 'variable_set', id: 'scr_s2',
                                    fields: { NAME: 'secondSensor' },
                                    inputs: {
                                      VALUE: {
                                        block: {
                                          type: 'math_arithmetic', id: 'scr_dv2',
                                          fields: { OP: 'DIVIDE' },
                                          inputs: {
                                            A: { block: { type: 'analog_read', id: 'scr_ar2', fields: { PIN: 1 } } },
                                            B: { block: { type: 'math_number', id: 'scr_n4d2', fields: { NUM: 4 } } }
                                          }
                                        }
                                      }
                                    },
                                    next: {
                                      block: {
                                        type: 'variable_set', id: 'scr_s3',
                                        fields: { NAME: 'thirdSensor' },
                                        inputs: {
                                          VALUE: {
                                            block: {
                                              type: 'map_value', id: 'scr_mp',
                                              fields: { FROM_LOW: 0, FROM_HIGH: 1, TO_LOW: 0, TO_HIGH: 255 },
                                              inputs: {
                                                VALUE: { block: { type: 'digital_read', id: 'scr_dr', fields: { PIN: 2 } } }
                                              }
                                            }
                                          }
                                        },
                                        next: {
                                          block: {
                                            type: 'serial_write', id: 'scr_sw1',
                                            inputs: {
                                              VALUE: { block: { type: 'variable_get', id: 'scr_v1', fields: { NAME: 'firstSensor' } } }
                                            },
                                            next: {
                                              block: {
                                                type: 'serial_write', id: 'scr_sw2',
                                                inputs: {
                                                  VALUE: { block: { type: 'variable_get', id: 'scr_v2', fields: { NAME: 'secondSensor' } } }
                                                },
                                                next: {
                                                  block: {
                                                    type: 'serial_write', id: 'scr_sw3',
                                                    inputs: {
                                                      VALUE: { block: { type: 'variable_get', id: 'scr_v3', fields: { NAME: 'thirdSensor' } } }
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
  // ═══ 6. SerialCallResponseASCII ═══════════════
  {
    name: 'SerialCallResponseASCII',
    category: '04.Communication',
    description: 'Handshake Serial ASCII: envía 3 valores de sensores separados por coma al recibir un byte',
    comment: {
      es: `/*
  Serial Call and Response en ASCII

  Este programa envia "0,0,0" al iniciar y lo repite
  hasta recibir datos. Luego espera un byte en Serial y
  responde con los tres valores de sensores separados por
  coma con salto de linea.

  El circuito:
  - potenciometros en entradas analogicas A0 y A1
  - pulsador en pin digital 2

  creado 26 Sep 2005 por Tom Igoe
  modificado 24 Abr 2012 por Tom Igoe y Scott Fitzgerald

  Este codigo es de dominio publico.

  https://docs.arduino.cc/built-in-examples/communication/SerialCallResponseASCII/

  Agregado a ArduBlock — 2026-06-01
*/`,
      en: `/*
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

  Added to ArduBlock — 2026-06-01
*/`
    },
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'variable_declare', id: 'sca_g1', x: 20, y: 240,
            fields: { NAME: 'firstSensor', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'sca_n1', fields: { NUM: 0 } } } }
          },
          {
            type: 'variable_declare', id: 'sca_g2', x: 20, y: 280,
            fields: { NAME: 'secondSensor', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'sca_n2', fields: { NUM: 0 } } } }
          },
          {
            type: 'variable_declare', id: 'sca_g3', x: 20, y: 320,
            fields: { NAME: 'thirdSensor', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'sca_n3', fields: { NUM: 0 } } } }
          },
          {
            type: 'variable_declare', id: 'sca_g4', x: 20, y: 360,
            fields: { NAME: 'inByte', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'sca_n4', fields: { NUM: 0 } } } }
          },
          {
            type: 'arduino_setup', id: 'sca_s', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'serial_begin', id: 'sca_sb',
                  fields: { BAUD: '9600' },
                  next: {
                    block: {
                      type: 'pin_mode', id: 'sca_pm',
                      fields: { PIN: 2, MODE: 'INPUT' },
                      next: {
                        block: {
                          type: 'controls_whileUntil', id: 'sca_ec',
                          fields: { MODE: 'WHILE' },
                          inputs: {
                            BOOL: {
                              block: {
                                type: 'logic_compare', id: 'sca_c0',
                                fields: { OP: 'LTE' },
                                inputs: {
                                  A: { block: { type: 'serial_available', id: 'sca_av1' } },
                                  B: { block: { type: 'math_number', id: 'sca_n0', fields: { NUM: 0 } } }
                                }
                              }
                            },
                            DO: {
                              block: {
                                type: 'serial_println', id: 'sca_pl',
                                inputs: {
                                  TEXT: { block: { type: 'text', id: 'sca_t1', fields: { TEXT: '0,0,0' } } }
                                },
                                next: {
                                  block: {
                                    type: 'delay_ms', id: 'sca_d3',
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
          },
          {
            type: 'arduino_loop', id: 'sca_l', x: 20, y: 200,
            inputs: {
              BODY: {
                block: {
                  type: 'controls_if', id: 'sca_if',
                  inputs: {
                    IF0: {
                      block: {
                        type: 'logic_compare', id: 'sca_c1',
                        fields: { OP: 'GT' },
                        inputs: {
                          A: { block: { type: 'serial_available', id: 'sca_av2' } },
                          B: { block: { type: 'math_number', id: 'sca_n01', fields: { NUM: 0 } } }
                        }
                      }
                    },
                    DO0: {
                      block: {
                        type: 'variable_set', id: 'sca_si',
                        fields: { NAME: 'inByte' },
                        inputs: { VALUE: { block: { type: 'serial_read', id: 'sca_rd' } } },
                        next: {
                          block: {
                            type: 'variable_set', id: 'sca_s1',
                            fields: { NAME: 'firstSensor' },
                            inputs: { VALUE: { block: { type: 'analog_read', id: 'sca_ar1', fields: { PIN: 0 } } } },
                            next: {
                              block: {
                                type: 'variable_set', id: 'sca_s2',
                                fields: { NAME: 'secondSensor' },
                                inputs: { VALUE: { block: { type: 'analog_read', id: 'sca_ar2', fields: { PIN: 1 } } } },
                                next: {
                                  block: {
                                    type: 'variable_set', id: 'sca_s3',
                                    fields: { NAME: 'thirdSensor' },
                                    inputs: {
                                      VALUE: {
                                        block: {
                                          type: 'map_value', id: 'sca_mp',
                                          fields: { FROM_LOW: 0, FROM_HIGH: 1, TO_LOW: 0, TO_HIGH: 255 },
                                          inputs: {
                                            VALUE: { block: { type: 'digital_read', id: 'sca_dr', fields: { PIN: 2 } } }
                                          }
                                        }
                                      }
                                    },
                                    next: {
                                      block: {
                                        type: 'serial_print', id: 'sca_sp1',
                                        inputs: {
                                          TEXT: { block: { type: 'variable_get', id: 'sca_v1', fields: { NAME: 'firstSensor' } } }
                                        },
                                        next: {
                                          block: {
                                            type: 'serial_print', id: 'sca_spc1',
                                            inputs: {
                                              TEXT: { block: { type: 'text', id: 'sca_t2', fields: { TEXT: ',' } } }
                                            },
                                            next: {
                                              block: {
                                                type: 'serial_print', id: 'sca_sp2',
                                                inputs: {
                                                  TEXT: { block: { type: 'variable_get', id: 'sca_v2', fields: { NAME: 'secondSensor' } } }
                                                },
                                                next: {
                                                  block: {
                                                    type: 'serial_print', id: 'sca_spc2',
                                                    inputs: {
                                                      TEXT: { block: { type: 'text', id: 'sca_t3', fields: { TEXT: ',' } } }
                                                    },
                                                    next: {
                                                      block: {
                                                        type: 'serial_println', id: 'sca_sp3',
                                                        inputs: {
                                                          TEXT: { block: { type: 'variable_get', id: 'sca_v3', fields: { NAME: 'thirdSensor' } } }
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

  Added to ArduBlock — 2026-05-31
*/`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere hardware MIDI (jack, sintetizador), baud rate 31250 y función custom noteOn(). No representable en bloques.'
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

  Added to ArduBlock — 2026-05-31
*/`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa Serial1 que solo existe en Arduino Mega/Due/Zero. No compatible con Arduino Uno.'
  },
  // ═══ 9. VirtualColorMixer ══════════════════════
  // ═══ 9. ASCIITable ═════════════════════════
  {
    name: 'ASCIITable',
    category: '04.Communication',
    description: 'Imprime la tabla ASCII completa con sus representaciones decimal, hex, octal y binario',
    comment: `/*
  ASCII table

  Prints out byte values in all possible formats:
  - as raw binary values
  - as ASCII-encoded decimal, hex, octal, and binary values

  For more on ASCII, see http://www.asciitable.com and http://en.wikipedia.org/wiki/ASCII

  The circuit: No external hardware needed.

  created 2006
  by Nicholas Zambetti <http://www.zambetti.com>
  modified 9 Apr 2012
  by Tom Igoe

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/communication/ASCIITable/

  Added to ArduBlock — 2026-06-01
*/`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa Serial.print(n, HEX), Serial.print(n, OCT) y Serial.print(n, BIN) para mostrar valores en distintas bases numéricas. ArduBlock no tiene bloques con formato de salida (DEC/HEX/OCT/BIN). También usa Serial.write() para enviar el byte crudo y un bucle infinito al final.'
  },

  // ═══ 10. SerialEvent ═══════════════════════════
  {
    name: 'SerialEvent',
    category: '04.Communication',
    description: 'Acumula caracteres recibidos por Serial usando el callback serialEvent()',
    comment: `/*
  Serial Event example

  When new serial data arrives, this sketch adds it to a String.
  When a newline is received, the loop prints the string and clears it.

  A good test for this is to try it with a GPS receiver that sends out
  NMEA 0183 sentences.

  NOTE: The serialEvent() feature is not available on the Leonardo, Micro, or
  other ATmega32U4 based boards.

  created 9 May 2011
  by Tom Igoe

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/communication/SerialEvent/

  Added to ArduBlock — 2026-06-01
*/`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Define la funcion custom serialEvent() que Arduino llama automaticamente entre iteraciones de loop() cuando llegan datos por Serial. ArduBlock no puede definir funciones con nombre reservado ni callbacks. Tambien usa el tipo String (objeto) y concatenacion con +=.'
  },

  // ═══ 11. SerialPassthrough ═════════════════════
  {
    name: 'SerialPassthrough',
    category: '04.Communication',
    description: 'Puente Serial entre el puerto USB y los pines 0-1 (emula passthrough en placas con USB nativo)',
    comment: `/*
  SerialPassthrough sketch

  Some boards, like the Arduino 101, the MKR1000, Zero, or the Micro, have one
  hardware serial port attached to Digital pins 0-1, and a separate USB serial
  port attached to the IDE Serial Monitor. This means that the "serial
  passthrough" which is possible with the Arduino UNO (commonly used to interact
  with devices/shields that require configuration via serial AT commands) will
  not work by default.

  This sketch allows you to emulate the serial passthrough behaviour. Any text
  you type in the IDE Serial monitor will be written out to the serial port on
  Digital pins 0 and 1, and vice-versa.

  On the 101, MKR1000, Zero, and Micro, "Serial" refers to the USB Serial port
  attached to the Serial Monitor, and "Serial1" refers to the hardware serial
  port attached to pins 0 and 1. This sketch will emulate Serial passthrough
  using those two Serial ports on the boards mentioned above, but you can change
  these names to connect any two serial ports on a board that has multiple ports.

  created 23 May 2016
  by Erik Nyquist

  https://docs.arduino.cc/built-in-examples/communication/SerialPassthrough/

  Added to ArduBlock — 2026-06-01
*/`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa Serial1 (segundo puerto hardware) que solo existe en placas con USB nativo (Zero, MKR1000, Micro, 101). ArduBlock apunta a Arduino Uno que no tiene Serial1. Ademas usa Serial.available() y Serial.read() encadenados directamente como argumento de Serial1.write().'
  },
  {
    name: 'VirtualColorMixer',
    category: '04.Communication',
    description: 'Mezclador RGB virtual: recibe 3 valores por Serial y los aplica a un LED RGB',
    comment: {
      es: `/*
  Mezclador de color virtual

  Este ejemplo lee tres valores enteros del puerto Serial
  (para rojo, verde y azul) y los usa para controlar
  un LED RGB mediante PWM.

  Envia valores como "255,128,0" desde el Monitor Serial
  o desde Processing.

  Circuito: LED RGB catodo comun:
  - anodo rojo:  pin 9 con resistencia 220 ohm
  - anodo verde: pin 10 con resistencia 220 ohm
  - anodo azul:  pin 11 con resistencia 220 ohm
  - catodo: GND

  creado 2007 por David A. Mellis
  modificado 30 Ago 2011 por Tom Igoe

  Este codigo es de dominio publico.

  https://docs.arduino.cc/built-in-examples/communication/VirtualColorMixer/

  Agregado a ArduBlock — 2026-06-01
*/`,
      en: `/*
  Virtual Color Mixer

  This example reads three integer values from the serial port
  (for red, green, and blue) and uses them to drive an RGB LED
  via PWM.

  Send values like "255,128,0" from the Serial Monitor or Processing.

  Circuit: Common-Cathode RGB LED:
  - red anode:   pin 9 through 220 ohm resistor
  - green anode: pin 10 through 220 ohm resistor
  - blue anode:  pin 11 through 220 ohm resistor
  - cathode: GND

  created 2007
  by David A. Mellis
  modified 30 Aug 2011
  by Tom Igoe

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/communication/VirtualColorMixer/

  Added to ArduBlock — 2026-06-01
*/`
    },
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'variable_declare', id: 'vcm_g1', x: 20, y: 240,
            fields: { NAME: 'redPin', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'vcm_np1', fields: { NUM: 9 } } } }
          },
          {
            type: 'variable_declare', id: 'vcm_g2', x: 20, y: 280,
            fields: { NAME: 'greenPin', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'vcm_np2', fields: { NUM: 10 } } } }
          },
          {
            type: 'variable_declare', id: 'vcm_g3', x: 20, y: 320,
            fields: { NAME: 'bluePin', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'vcm_np3', fields: { NUM: 11 } } } }
          },
          {
            type: 'arduino_setup', id: 'vcm_s', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'serial_begin', id: 'vcm_sb',
                  fields: { BAUD: '9600' },
                  next: {
                    block: {
                      type: 'pin_mode', id: 'vcm_pm1',
                      fields: { PIN: 9, MODE: 'OUTPUT' },
                      next: {
                        block: {
                          type: 'pin_mode', id: 'vcm_pm2',
                          fields: { PIN: 10, MODE: 'OUTPUT' },
                          next: {
                            block: {
                              type: 'pin_mode', id: 'vcm_pm3',
                              fields: { PIN: 11, MODE: 'OUTPUT' }
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
            type: 'arduino_loop', id: 'vcm_l', x: 20, y: 160,
            inputs: {
              BODY: {
                block: {
                  type: 'controls_whileUntil', id: 'vcm_wh',
                  fields: { MODE: 'WHILE' },
                  inputs: {
                    BOOL: {
                      block: {
                        type: 'logic_compare', id: 'vcm_c0',
                        fields: { OP: 'GT' },
                        inputs: {
                          A: { block: { type: 'serial_available', id: 'vcm_av' } },
                          B: { block: { type: 'math_number', id: 'vcm_n0', fields: { NUM: 0 } } }
                        }
                      }
                    },
                    DO: {
                      block: {
                        type: 'variable_declare', id: 'vcm_vr',
                        fields: { NAME: 'red', TYPE: 'int' },
                        inputs: { VALUE: { block: { type: 'serial_parse_int', id: 'vcm_pi1' } } },
                        next: {
                          block: {
                            type: 'variable_declare', id: 'vcm_vg',
                            fields: { NAME: 'green', TYPE: 'int' },
                            inputs: { VALUE: { block: { type: 'serial_parse_int', id: 'vcm_pi2' } } },
                            next: {
                              block: {
                                type: 'variable_declare', id: 'vcm_vb',
                                fields: { NAME: 'blue', TYPE: 'int' },
                                inputs: { VALUE: { block: { type: 'serial_parse_int', id: 'vcm_pi3' } } },
                                next: {
                                  block: {
                                    type: 'controls_if', id: 'vcm_if',
                                    inputs: {
                                      IF0: {
                                        block: {
                                          type: 'logic_compare', id: 'vcm_c1',
                                          fields: { OP: 'EQ' },
                                          inputs: {
                                            A: { block: { type: 'serial_read', id: 'vcm_rd' } },
                                            B: { block: { type: 'math_number', id: 'vcm_nl', fields: { NUM: 10 } } }
                                          }
                                        }
                                      },
                                      DO0: {
                                        block: {
                                          type: 'analog_write', id: 'vcm_aw1',
                                          fields: { PIN: 9 },
                                          inputs: {
                                            VALUE: {
                                              block: {
                                                type: 'math_constrain', id: 'vcm_ct1',
                                                inputs: {
                                                  VALUE: { block: { type: 'variable_get', id: 'vcm_g1b', fields: { NAME: 'red' } } },
                                                  LOW: { block: { type: 'math_number', id: 'vcm_lo1', fields: { NUM: 0 } } },
                                                  HIGH: { block: { type: 'math_number', id: 'vcm_hi1', fields: { NUM: 255 } } }
                                                }
                                              }
                                            }
                                          },
                                          next: {
                                            block: {
                                              type: 'analog_write', id: 'vcm_aw2',
                                              fields: { PIN: 10 },
                                              inputs: {
                                                VALUE: {
                                                  block: {
                                                    type: 'math_constrain', id: 'vcm_ct2',
                                                    inputs: {
                                                      VALUE: { block: { type: 'variable_get', id: 'vcm_g2b', fields: { NAME: 'green' } } },
                                                      LOW: { block: { type: 'math_number', id: 'vcm_lo2', fields: { NUM: 0 } } },
                                                      HIGH: { block: { type: 'math_number', id: 'vcm_hi2', fields: { NUM: 255 } } }
                                                    }
                                                  }
                                                }
                                              },
                                              next: {
                                                block: {
                                                  type: 'analog_write', id: 'vcm_aw3',
                                                  fields: { PIN: 11 },
                                                  inputs: {
                                                    VALUE: {
                                                      block: {
                                                        type: 'math_constrain', id: 'vcm_ct3',
                                                        inputs: {
                                                          VALUE: { block: { type: 'variable_get', id: 'vcm_g3b', fields: { NAME: 'blue' } } },
                                                          LOW: { block: { type: 'math_number', id: 'vcm_lo3', fields: { NUM: 0 } } },
                                                          HIGH: { block: { type: 'math_number', id: 'vcm_hi3', fields: { NUM: 255 } } }
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
];