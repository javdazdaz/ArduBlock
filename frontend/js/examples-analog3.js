/**
 * ArduBlock — Ejemplos 03.Analog: Smoothing + AnalogWriteMega
 */
export const analog3 = [

  // ═══ Smoothing ═════════════════════════════
  {
    name: 'Smoothing',
    category: '03.Analog',
    description: 'Promedio móvil de lecturas analógicas usando un array circular (NO CONVERTIBLE)',
    comment: `/*
  Smoothing

  Reads repeatedly from an analog input, calculating a running average and
  printing it to the computer. Keeps ten readings in an array and continually
  averages them.

  The circuit:
  - analog sensor (potentiometer will do) attached to analog input 0

  created 22 Apr 2007
  by David A. Mellis  <dam@mellis.org>
  modified 9 Apr 2012
  by Tom Igoe

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/analog/Smoothing/

  Agregado a ArduBlock — 2026-05-31
*/`,
state: {
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'variable_declare', id: 'sm_g1',
            fields: { NAME: 'readIndex', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'sm_gn1', fields: { NUM: 0 } } } },
            x: 20, y: 240
          },
          {
            type: 'variable_declare', id: 'sm_g2',
            fields: { NAME: 'total', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'sm_gn2', fields: { NUM: 0 } } } },
            x: 20, y: 280
          },
          {
            type: 'variable_declare', id: 'sm_g3',
            fields: { NAME: 'average', TYPE: 'int' },
            inputs: { VALUE: { block: { type: 'math_number', id: 'sm_gn3', fields: { NUM: 0 } } } },
            x: 20, y: 320
          },
          {
            type: 'array_declare', id: 'sm_arr',
            fields: { TYPE: 'int', NAME: 'readings', VALUES: '0, 0, 0, 0, 0, 0, 0, 0, 0, 0' },
            x: 20, y: 360
          },
          {
            type: 'arduino_setup', id: 'sm_s', x: 20, y: 20,
            inputs: { BODY: { block: {
              type: 'serial_begin', id: 'sm_sb',
              fields: { BAUD: '9600' }
            }}}
          },
          {
            type: 'arduino_loop', id: 'sm_l', x: 20, y: 160,
            inputs: { BODY: { block: {
              type: 'variable_set', id: 'sm_sub',
              fields: { NAME: 'total' },
              inputs: { VALUE: { block: {
                type: 'math_arithmetic', id: 'sm_ar1', fields: { OP: 'MINUS' },
                inputs: {
                  A: { block: { type: 'variable_get', id: 'sm_vg1', fields: { NAME: 'total' } } },
                  B: { block: { type: 'array_get', id: 'sm_ag1', fields: { NAME: 'readings' },
                    inputs: { INDEX: { block: { type: 'variable_get', id: 'sm_vg2', fields: { NAME: 'readIndex' } } } }
                  }}
                }
              }}},
              next: { block: {
                type: 'array_set', id: 'sm_as1',
                fields: { NAME: 'readings' },
                inputs: {
                  INDEX: { block: { type: 'variable_get', id: 'sm_vg3', fields: { NAME: 'readIndex' } } },
                  VALUE: { block: { type: 'analog_read', id: 'sm_ar0', fields: { PIN: 0 } } }
                },
                next: { block: {
                  type: 'variable_set', id: 'sm_add',
                  fields: { NAME: 'total' },
                  inputs: { VALUE: { block: {
                    type: 'math_arithmetic', id: 'sm_ar2', fields: { OP: 'ADD' },
                    inputs: {
                      A: { block: { type: 'variable_get', id: 'sm_vg4', fields: { NAME: 'total' } } },
                      B: { block: { type: 'array_get', id: 'sm_ag2', fields: { NAME: 'readings' },
                        inputs: { INDEX: { block: { type: 'variable_get', id: 'sm_vg5', fields: { NAME: 'readIndex' } } } }
                      }}
                    }
                  }}},
                  next: { block: {
                    type: 'variable_set', id: 'sm_inc',
                    fields: { NAME: 'readIndex' },
                    inputs: { VALUE: { block: {
                      type: 'math_arithmetic', id: 'sm_ar3', fields: { OP: 'ADD' },
                      inputs: {
                        A: { block: { type: 'variable_get', id: 'sm_vg6', fields: { NAME: 'readIndex' } } },
                        B: { block: { type: 'math_number', id: 'sm_n1', fields: { NUM: 1 } } }
                      }
                    }}},
                    next: { block: {
                      type: 'controls_if', id: 'sm_if1',
                      inputs: {
                        IF0: { block: {
                          type: 'logic_compare', id: 'sm_cmp1', fields: { OP: 'GTE' },
                          inputs: {
                            A: { block: { type: 'variable_get', id: 'sm_vg7', fields: { NAME: 'readIndex' } } },
                            B: { block: { type: 'math_number', id: 'sm_n2', fields: { NUM: 10 } } }
                          }
                        }},
                        DO0: { block: {
                          type: 'variable_set', id: 'sm_rst',
                          fields: { NAME: 'readIndex' },
                          inputs: { VALUE: { block: { type: 'math_number', id: 'sm_n3', fields: { NUM: 0 } } } }
                        }}
                      },
                      next: { block: {
                        type: 'variable_set', id: 'sm_avg',
                        fields: { NAME: 'average' },
                        inputs: { VALUE: { block: {
                          type: 'math_arithmetic', id: 'sm_ar4', fields: { OP: 'DIVIDE' },
                          inputs: {
                            A: { block: { type: 'variable_get', id: 'sm_vg8', fields: { NAME: 'total' } } },
                            B: { block: { type: 'math_number', id: 'sm_n4', fields: { NUM: 10 } } }
                          }
                        }}},
                        next: { block: {
                          type: 'serial_println', id: 'sm_sp1',
                          inputs: { TEXT: { block: { type: 'variable_get', id: 'sm_vg9', fields: { NAME: 'average' } } } },
                          next: { block: {
                            type: 'delay_ms', id: 'sm_d1', fields: { MS: 1 }
                          }}
                        }}
                      }}
                    }}
                  }}
                }}
              }}
            }}}
          }
        ]
      }
    },
  },

  // ═══ AnalogWriteMega ═══════════════════════
  {
    name: 'AnalogWriteMega',
    category: '03.Analog',
    description: 'Desvanecimiento de LEDs en pines 2-13 del Arduino Mega (NO CONVERTIBLE para Uno)',
    comment: `/*
  Mega analogWrite() test

  This sketch fades LEDs up and down one at a time on digital pins 2 through 13.
  This sketch was written for the Arduino Mega, and will not work on other boards.

  The circuit:
  - LEDs attached from pins 2 through 13 to ground.

  created 8 Feb 2009
  by Tom Igoe

  This example code is in the public domain.

  https://docs.arduino.cc/built-in-examples/analog/AnalogWriteMega/

  Agregado a ArduBlock — 2026-05-31
*/`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Escrito específicamente para Arduino Mega. Usa analogWrite() en los pines 2-13, pero en Arduino Uno solo los pines 3, 5, 6, 9, 10, 11 tienen PWM. El sketch mismo advierte: "will not work on other boards". ArduBlock apunta a Uno.'
  }
];