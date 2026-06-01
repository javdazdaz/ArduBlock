/**
 * ArduBlock — Ejemplos 03.Analog (AnalogInOutSerial, Calibration)
 */
export const analog2 = [

  // ═══ AnalogInOutSerial ═════════════════════════════
  {
    name: 'AnalogInOutSerial',
    category: '03.Analog',
    description: 'Lee un potenciómetro, mapea el valor a PWM y controla el brillo de un LED',
    comment: `/*
  Analog input, analog output, serial output

  Reads an analog input pin, maps the result to a range from 0 to 255 and uses
  the result to set the pulse width modulation (PWM) of an output pin.
  Also prints the results to the Serial Monitor.

  The circuit:
  - potentiometer connected to analog pin 0.
    Center pin of the potentiometer goes to the analog pin.
    side pins of the potentiometer go to +5V and ground
  - LED connected from digital pin 9 to ground through 220 ohm resistor

  created 29 Dec. 2008
  modified 9 Apr 2012
  by Tom Igoe

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/analog/AnalogInOutSerial/

  Agregado a ArduBlock — 2026-05-31
*/`,
    state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'arduino_setup', id: 'aos1', x: 20, y: 20,
            inputs: {
              BODY: {
                block: {
                  type: 'pin_mode', id: 'aos_setup1',
                  fields: { PIN: 0, MODE: 'INPUT' },
                  next: {
                    block: {
                      type: 'pin_mode', id: 'aos_setup2',
                      fields: { PIN: 9, MODE: 'OUTPUT' },
                      next: {
                        block: {
                          type: 'serial_begin', id: 'aos2',
                          fields: { BAUD: '9600' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          {
            type: 'arduino_loop', id: 'aos3', x: 20, y: 160,
            inputs: {
              BODY: {
                block: {
                  type: 'variable_set', id: 'aos4',
                  fields: { NAME: 'sensorValue' },
                  inputs: {
                    VALUE: {
                      block: {
                        type: 'analog_read', id: 'aos5',
                        fields: { PIN: 0 }
                      }
                    }
                  },
                  next: {
                    block: {
                      type: 'variable_set', id: 'aos6',
                      fields: { NAME: 'outputValue' },
                      inputs: {
                        VALUE: {
                          block: {
                            type: 'map_value', id: 'aos7',
                            fields: { FROM_LOW: 0, FROM_HIGH: 1023, TO_LOW: 0, TO_HIGH: 255 },
                            inputs: {
                              VALUE: {
                                block: {
                                  type: 'variable_get', id: 'aos8',
                                  fields: { NAME: 'sensorValue' }
                                }
                              }
                            }
                          }
                        }
                      },
                      next: {
                        block: {
                          type: 'analog_write', id: 'aos9',
                          fields: { PIN: 9 },
                          inputs: {
                            VALUE: {
                              block: {
                                type: 'variable_get', id: 'aos10',
                                fields: { NAME: 'outputValue' }
                              }
                            }
                          },
                          next: {
                            block: {
                              type: 'serial_println', id: 'aos11',
                              inputs: {
                                TEXT: {
                                  block: {
                                    type: 'variable_get', id: 'aos12',
                                    fields: { NAME: 'sensorValue' }
                                  }
                                }
                              },
                              next: {
                                block: {
                                  type: 'serial_println', id: 'aos13',
                                  inputs: {
                                    TEXT: {
                                      block: {
                                        type: 'variable_get', id: 'aos14',
                                        fields: { NAME: 'outputValue' }
                                      }
                                    }
                                  },
                                  next: {
                                    block: {
                                      type: 'delay_ms', id: 'aos15',
                                      fields: { MS: 2 }
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

  // ═══ Calibration ═════════════════════════════
  {
    name: 'Calibration',
    category: '03.Analog',
    description: 'Calibra un sensor analógico durante los primeros 5 segundos y ajusta el rango',
    comment: `/*
  Calibration

  Demonstrates one technique for calibrating sensor input. The sensor readings
  during the first five seconds of the sketch execution define the minimum and
  maximum of expected values attached to the sensor pin.

  The sensor minimum and maximum initial values may seem backwards. Initially,
  you set the minimum high and listen for anything lower, saving it as the new
  minimum. Likewise, you set the maximum low and listen for anything higher as
  the new maximum.

  The circuit:
  - analog sensor (potentiometer will do) attached to analog input 0
  - LED attached from digital pin 9 to ground through 220 ohm resistor

  created 29 Oct 2008
  by David A Mellis
  modified 30 Aug 2011
  by Tom Igoe
  modified 07 Apr 2017
  by Zachary J. Fields

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/analog/Calibration/

  Agregado a ArduBlock — 2026-05-31
*/`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa while(millis() < 5000) sin bloque while ni función millis() disponible; constrain() no disponible; digitalWrite no está en los bloques; map() usa sensorMin/sensorMax dinámicos (los campos FROM_LOW/FROM_HIGH de map_value son fijos). Requiere bloque de calibración especializado.'
  }
];
