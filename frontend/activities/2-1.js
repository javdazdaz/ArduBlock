/**
 * Actividad 2.1 — Probar sensor ultrasónico
 *
 * Configura los pines del sensor, mide distancia y muestrala en Serial
 */

export const activity = {
  "name": "2.1 \u2014 Probar sensor ultras\u00f3nico",
  "description": "Configura los pines del sensor, mide distancia y muestrala en Serial",
  "state": {
    "blocks": {
      "languageVersion": 0,
      "blocks": [
        {
          "type": "arduino_setup",
          "id": "S1",
          "x": 20,
          "y": 20,
          "inputs": {
            "BODY": {
              "block": {
                "type": "library_include",
                "id": "S1_LIB",
                "fields": {
                  "LIB": "AFMotor_R4.h"
                },
                "next": {
                  "block": {
                    "type": "serial_begin",
                    "id": "S1_SERIAL",
                    "fields": {
                      "BAUD": "9600"
                    },
                    "next": {
                      "block": {
                        "type": "delay_ms",
                        "id": "S1_WAIT",
                        "fields": {
                          "MS": "2000"
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
          "type": "arduino_loop",
          "id": "L1",
          "x": 20,
          "y": 180
        },
        {
          "type": "procedures_defnoreturn",
          "id": "P1",
          "x": 20,
          "y": 280,
          "extraState": {
            "procedureId": "proc_avanzar"
          },
          "fields": {
            "NAME": "avanzar"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "afmotor_dc_run",
                "id": "P1B1",
                "fields": {
                  "NAME": "motorIzquierdo",
                  "DIR": "FORWARD"
                },
                "next": {
                  "block": {
                    "type": "afmotor_dc_run",
                    "id": "P1B2",
                    "fields": {
                      "NAME": "motorDerecho",
                      "DIR": "FORWARD"
                    },
                    "next": {
                      "block": {
                        "type": "delay_ms",
                        "id": "P1B3",
                        "fields": {
                          "MS": "1000"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "collapsed": true
        },
        {
          "type": "procedures_defnoreturn",
          "id": "P2",
          "x": 20,
          "y": 420,
          "extraState": {
            "procedureId": "proc_retroceder"
          },
          "fields": {
            "NAME": "retroceder"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "afmotor_dc_run",
                "id": "P2B1",
                "fields": {
                  "NAME": "motorIzquierdo",
                  "DIR": "BACKWARD"
                },
                "next": {
                  "block": {
                    "type": "afmotor_dc_run",
                    "id": "P2B2",
                    "fields": {
                      "NAME": "motorDerecho",
                      "DIR": "BACKWARD"
                    },
                    "next": {
                      "block": {
                        "type": "delay_ms",
                        "id": "P2B3",
                        "fields": {
                          "MS": "1000"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "collapsed": true
        },
        {
          "type": "procedures_defnoreturn",
          "id": "P3",
          "x": 20,
          "y": 560,
          "extraState": {
            "procedureId": "proc_girar_izquierda"
          },
          "fields": {
            "NAME": "girarIzquierda"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "afmotor_dc_run",
                "id": "P3B1",
                "fields": {
                  "NAME": "motorIzquierdo",
                  "DIR": "BACKWARD"
                },
                "next": {
                  "block": {
                    "type": "afmotor_dc_run",
                    "id": "P3B2",
                    "fields": {
                      "NAME": "motorDerecho",
                      "DIR": "FORWARD"
                    },
                    "next": {
                      "block": {
                        "type": "delay_ms",
                        "id": "P3B3",
                        "fields": {
                          "MS": "1000"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "collapsed": true
        },
        {
          "type": "procedures_defnoreturn",
          "id": "P4",
          "x": 20,
          "y": 700,
          "extraState": {
            "procedureId": "proc_girar_derecha"
          },
          "fields": {
            "NAME": "girarDerecha"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "afmotor_dc_run",
                "id": "P4B1",
                "fields": {
                  "NAME": "motorIzquierdo",
                  "DIR": "FORWARD"
                },
                "next": {
                  "block": {
                    "type": "afmotor_dc_run",
                    "id": "P4B2",
                    "fields": {
                      "NAME": "motorDerecho",
                      "DIR": "BACKWARD"
                    },
                    "next": {
                      "block": {
                        "type": "delay_ms",
                        "id": "P4B3",
                        "fields": {
                          "MS": "1000"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "collapsed": true
        },
        {
          "type": "procedures_defnoreturn",
          "id": "P5",
          "x": 20,
          "y": 840,
          "extraState": {
            "procedureId": "proc_detener"
          },
          "fields": {
            "NAME": "detener"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "afmotor_dc_run",
                "id": "P5B1",
                "fields": {
                  "NAME": "motorIzquierdo",
                  "DIR": "RELEASE"
                },
                "next": {
                  "block": {
                    "type": "afmotor_dc_run",
                    "id": "P5B2",
                    "fields": {
                      "NAME": "motorDerecho",
                      "DIR": "RELEASE"
                    },
                    "next": {
                      "block": {
                        "type": "delay_ms",
                        "id": "P5B3",
                        "fields": {
                          "MS": "1000"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "collapsed": true
        },
        {
          "type": "procedures_defreturn",
          "id": "P6",
          "x": 20,
          "y": 980,
          "extraState": {
            "procedureId": "proc_medir_distancia"
          },
          "fields": {
            "NAME": "medirDistancia"
          },
          "inputs": {
            "STACK": {
              "block": {
                "type": "digital_write",
                "id": "P6B1",
                "fields": {
                  "PIN": "A5",
                  "VALUE": "LOW"
                },
                "next": {
                  "block": {
                    "type": "delay_microseconds",
                    "id": "P6B2",
                    "fields": {
                      "US": "2"
                    },
                    "next": {
                      "block": {
                        "type": "digital_write",
                        "id": "P6B3",
                        "fields": {
                          "PIN": "A5",
                          "VALUE": "HIGH"
                        },
                        "next": {
                          "block": {
                            "type": "delay_microseconds",
                            "id": "P6B4",
                            "fields": {
                              "US": "10"
                            },
                            "next": {
                              "block": {
                                "type": "digital_write",
                                "id": "P6B5",
                                "fields": {
                                  "PIN": "A5",
                                  "VALUE": "LOW"
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
          "collapsed": true
        }
      ]
    },
    "procedureModels": [
      {
        "id": "proc_avanzar",
        "name": "avanzar"
      },
      {
        "id": "proc_retroceder",
        "name": "retroceder"
      },
      {
        "id": "proc_girar_izquierda",
        "name": "girarIzquierda"
      },
      {
        "id": "proc_girar_derecha",
        "name": "girarDerecha"
      },
      {
        "id": "proc_detener",
        "name": "detener"
      },
      {
        "id": "proc_medir_distancia",
        "name": "medirDistancia"
      }
    ]
  },
  "activityMeta": {
    "title": "2.1 \u2014 Probar sensor ultras\u00f3nico",
    "protected": [
      "S1",
      "L1",
      "S1_LIB",
      "S1_WAIT",
      "P1",
      "P2",
      "P3",
      "P4",
      "P5",
      "S1_SERIAL",
      "P6",
      "P1B1",
      "P1B2",
      "P1B3",
      "P2B1",
      "P2B2",
      "P2B3",
      "P3B1",
      "P3B2",
      "P3B3",
      "P4B1",
      "P4B2",
      "P4B3",
      "P5B1",
      "P5B2",
      "P5B3",
      "P6B1",
      "P6B2",
      "P6B3",
      "P6B4",
      "P6B5"
    ]
  }
};
