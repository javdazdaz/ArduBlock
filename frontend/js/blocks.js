/**
 * ArduBlock — Definición de Bloques Arduino
 *
 * Define los bloques visuales específicos de Arduino:
 * setup/loop, pines digitales/analógicos, Serial, delays.
 */

import * as Blockly from 'blockly';
import { registerFieldAngle } from '@blockly/field-angle';

// Registrar field_angle antes de definir bloques que lo usan
registerFieldAngle();

// ═══ Nombres de categorías + Registro de bloques ═══

// ── Nombres de categorías en español ──────────
Blockly.Msg.CAT_ARDUINO = "Arduino";
Blockly.Msg.CAT_PINES   = "Pines";
Blockly.Msg.CAT_TIEMPO  = "Tiempo";
Blockly.Msg.CAT_SERIAL  = "Serial";

Blockly.Msg.ARD_SETUP   = "al iniciar (setup)";
Blockly.Msg.ARD_LOOP    = "repetir siempre (loop)";

Blockly.Msg.PINMODE_PIN  = "pin";
Blockly.Msg.PINMODE_MODE = "modo";
Blockly.Msg.INPUT        = "ENTRADA";
Blockly.Msg.OUTPUT       = "SALIDA";
Blockly.Msg.INPUT_PULLUP = "ENTRADA_PULLUP";

Blockly.Msg.DWRITE_PIN   = "pin";
Blockly.Msg.DWRITE_VAL   = "valor";
Blockly.Msg.HIGH         = "HIGH";
Blockly.Msg.LOW          = "LOW";

Blockly.Msg.AREAD_PIN    = "pin";
Blockly.Msg.AWRITE_PIN   = "pin";
Blockly.Msg.AWRITE_VAL   = "valor";

Blockly.Msg.DELAY_MS     = "esperar";
Blockly.Msg.DELAY_UNIT   = "milisegundos";

Blockly.Msg.SERIAL_BEGIN = "iniciar Serial a";
Blockly.Msg.SERIAL_PRINT = "enviar por Serial";
Blockly.Msg.SERIAL_PRINTLN = "enviar por Serial (con salto)";
Blockly.Msg.SERIAL_BAUD  = "baudios";

// ── Definición de bloques ──────────────────────
Blockly.common.defineBlocksWithJsonArray([

  // ═══ setup () ═══════════════════════════════
  {
    "type": "arduino_setup",
    "message0": "al iniciar %1 %2",
    "args0": [
      { "type": "input_dummy" },
      { "type": "input_statement", "name": "BODY" }
    ],
    "colour": 230,   // amarillo/naranja
    "tooltip": "Código que se ejecuta una sola vez al iniciar el Arduino",
    "helpUrl": ""
  },

  // ═══ loop () ════════════════════════════════
  {
    "type": "arduino_loop",
    "message0": "repetir siempre %1 %2",
    "args0": [
      { "type": "input_dummy" },
      { "type": "input_statement", "name": "BODY" }
    ],
    "colour": 230,
    "tooltip": "Código que se ejecuta en bucle infinito",
    "helpUrl": ""
  },

  // ═══ pinMode ═══════════════════════════════
  {
    "type": "pin_mode",
    "message0": "configurar pin %1 como %2",
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 13, "min": 0, "max": 54 },
      { "type": "field_dropdown", "name": "MODE",
        "options": [
          ["ENTRADA", "INPUT"],
          ["SALIDA", "OUTPUT"],
          ["ENTRADA_PULLUP", "INPUT_PULLUP"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 190,
    "tooltip": "Configura el modo de un pin (ENTRADA, SALIDA, ENTRADA_PULLUP)",
    "helpUrl": ""
  },

  // ═══ digitalWrite ═══════════════════════════
  {
    "type": "digital_write",
    "message0": "escribir digital pin %1 → %2",
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 13, "min": 0, "max": 54 },
      { "type": "field_dropdown", "name": "VALUE",
        "options": [
          ["HIGH", "HIGH"],
          ["LOW", "LOW"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 190,
    "tooltip": "Escribe HIGH o LOW en un pin digital",
    "helpUrl": ""
  },

  // ═══ digitalRead ════════════════════════════
  {
    "type": "digital_read",
    "message0": "leer pin digital %1",
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 2, "min": 0, "max": 54 }
    ],
    "output": "Number",
    "colour": 190,
    "tooltip": "Lee el valor de un pin digital (HIGH o LOW)",
    "helpUrl": ""
  },

  // ═══ analogWrite ════════════════════════════
  {
    "type": "analog_write",
    "message0": "escribir analógico pin %1 ~ %2",
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 9, "min": 0, "max": 54 },
      { "type": "field_number", "name": "VALUE", "value": 128, "min": 0, "max": 255 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 160,
    "tooltip": "Escribe un valor PWM (0-255) en un pin analógico (~)",
    "helpUrl": ""
  },

  // ═══ analogRead ═════════════════════════════
  {
    "type": "analog_read",
    "message0": "leer pin analógico A%1",
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 0, "min": 0, "max": 15 }
    ],
    "output": "Number",
    "colour": 160,
    "tooltip": "Lee el valor analógico (0-1023) del pin A0-A15",
    "helpUrl": ""
  },

  // ═══ delay ══════════════════════════════════
  {
    "type": "delay_ms",
    "message0": "esperar %1 ms",
    "args0": [
      { "type": "field_number", "name": "MS", "value": 1000, "min": 0 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 290,
    "tooltip": "Espera una cantidad de milisegundos",
    "helpUrl": ""
  },

  // ═══ Serial.begin ════════════════════════════
  {
    "type": "serial_begin",
    "message0": "iniciar comunicación Serial a %1 baudios",
    "args0": [
      { "type": "field_dropdown", "name": "BAUD",
        "options": [
          ["9600", "9600"],
          ["19200", "19200"],
          ["38400", "38400"],
          ["57600", "57600"],
          ["115200", "115200"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 120,
    "tooltip": "Inicia la comunicación serial a la velocidad especificada. Se usa dentro de setup().",
    "helpUrl": ""
  },

  // ═══ Serial.print ════════════════════════════
  {
    "type": "serial_print",
    "message0": "enviar por Serial %1",
    "args0": [
      { "type": "input_value", "name": "TEXT", "check": ["String", "Number"] }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 120,
    "tooltip": "Envía texto o número por el puerto Serial",
    "helpUrl": ""
  },

  // ═══ Serial.println ══════════════════════════
  {
    "type": "serial_println",
    "message0": "enviar por Serial (con salto) %1",
    "args0": [
      { "type": "input_value", "name": "TEXT", "check": ["String", "Number"] }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 120,
    "tooltip": "Envía texto o número por el puerto Serial y añade un salto de línea",
    "helpUrl": ""
  },

  // ═══ Servo: crear (declara + attach) ════════
  {
    "type": "servo_create",
    "message0": "crear servo %1 en pin %2",
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "servo" },
      { "type": "field_number", "name": "PIN", "value": 9, "min": 0, "max": 54 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 40,
    "tooltip": "Declara un servo con el nombre indicado y lo conecta al pin. El nombre debe ser único para cada servo.",
    "helpUrl": ""
  },

  // ═══ Servo: write (usa nombre, field-angle) ══
  {
    "type": "servo_write",
    "message0": "mover servo %1 a %2",
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "servo" },
      { "type": "field_angle", "name": "ANGLE", "value": 90 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 40,
    "tooltip": "Gira el servo indicado al ángulo elegido (0-180°). Usá el mismo nombre que al crear el servo.",
    "helpUrl": ""
  },

  // ═══ Servo: write microseconds (avanzado) ════
  {
    "type": "servo_write_us",
    "message0": "mover servo %1 a %2 μs",
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "servo" },
      { "type": "field_number", "name": "US", "value": 1500, "min": 500, "max": 2500 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 40,
    "tooltip": "Gira el servo usando microsegundos (500-2500). Para ajustes finos de posición.",
    "helpUrl": ""
  },

  // ═══ Sonido: tone(pin, freq) ═════════════════
  {
    "type": "tone_output",
    "message0": "generar tono pin %1 frecuencia %2 Hz",
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 8, "min": 0, "max": 54 },
      { "type": "field_number", "name": "FREQ", "value": 440, "min": 31, "max": 65535 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 260,
    "tooltip": "Genera un tono de la frecuencia indicada en el pin. Usá un buzzer o speaker piezoeléctrico.",
    "helpUrl": ""
  },

  // ═══ Sonido: tone(pin, freq, duration) ═══════
  {
    "type": "tone_duration",
    "message0": "generar tono pin %1 frecuencia %2 Hz durante %3 ms",
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 8, "min": 0, "max": 54 },
      { "type": "field_number", "name": "FREQ", "value": 440, "min": 31, "max": 65535 },
      { "type": "field_number", "name": "DURATION", "value": 500, "min": 1 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 260,
    "tooltip": "Genera un tono durante el tiempo indicado y se apaga solo. No necesitás llamar a noTone().",
    "helpUrl": ""
  },

  // ═══ Sonido: noTone(pin) ═════════════════════
  {
    "type": "no_tone_output",
    "message0": "detener tono en pin %1",
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 8, "min": 0, "max": 54 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 260,
    "tooltip": "Detiene el tono que se está generando en el pin indicado.",
    "helpUrl": ""
  },

  // ═══ Matemáticas: map() ═══════════════════════
  {
    "type": "map_value",
    "message0": "mapear %1 de [ %2 … %3 ] a [ %4 … %5 ]",
    "args0": [
      { "type": "input_value", "name": "VALUE", "check": "Number" },
      { "type": "field_number", "name": "FROM_LOW", "value": 0 },
      { "type": "field_number", "name": "FROM_HIGH", "value": 1023 },
      { "type": "field_number", "name": "TO_LOW", "value": 0 },
      { "type": "field_number", "name": "TO_HIGH", "value": 255 }
    ],
    "output": "Number",
    "colour": 230,
    "tooltip": "Re-mapea un número de un rango a otro. Ej: valor de sensor (0-1023) → PWM (0-255).",
    "helpUrl": ""
  },

  // ═══ Pines: pulseIn() ═════════════════════════
  {
    "type": "pulse_in",
    "message0": "medir pulso en pin %1 nivel %2 timeout %3 μs",
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 7, "min": 0, "max": 54 },
      { "type": "field_dropdown", "name": "VALUE", "options": [["HIGH", "HIGH"], ["LOW", "LOW"]] },
      { "type": "field_number", "name": "TIMEOUT", "value": 1000000, "min": 1 }
    ],
    "output": "Number",
    "colour": 190,
    "tooltip": "Mide la duración de un pulso en el pin (en microsegundos). Útil para sensores ultrasónicos.",
    "helpUrl": ""
  },

  // ═══ Pines: attachInterrupt() ═════════════════
  {
    "type": "attach_interrupt",
    "message0": "interrupción en pin %1 modo %2 ejecutar %3 %4",
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 2, "min": 0, "max": 54 },
      { "type": "field_dropdown", "name": "MODE", "options": [
        ["LOW", "LOW"], ["CHANGE", "CHANGE"], ["RISING", "RISING"], ["FALLING", "FALLING"]
      ]},
      { "type": "input_dummy" },
      { "type": "input_statement", "name": "BODY" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 190,
    "tooltip": "Ejecuta los bloques internos cuando ocurre un cambio en el pin. La ISR debe ser rápida (sin delays ni Serial).",
    "helpUrl": ""
  },

  // ═══ LCD: LiquidCrystal ═══════════════════════
  {
    "type": "lcd_create",
    "message0": "crear LCD %1 RS %2 EN %3 D4 %4 D5 %5 D6 %6 D7 %7 %8 cols %9 filas %10",
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "lcd" },
      { "type": "field_number", "name": "RS", "value": 12, "min": 0, "max": 54 },
      { "type": "field_number", "name": "EN", "value": 11, "min": 0, "max": 54 },
      { "type": "field_number", "name": "D4", "value": 5, "min": 0, "max": 54 },
      { "type": "field_number", "name": "D5", "value": 4, "min": 0, "max": 54 },
      { "type": "field_number", "name": "D6", "value": 3, "min": 0, "max": 54 },
      { "type": "field_number", "name": "D7", "value": 2, "min": 0, "max": 54 },
      { "type": "input_dummy" },
      { "type": "field_number", "name": "COLS", "value": 16, "min": 8, "max": 40 },
      { "type": "field_number", "name": "ROWS", "value": 2, "min": 1, "max": 4 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": "Crea un LCD con pines RS, EN, D4-D7. Debe ir dentro de setup().",
    "helpUrl": ""
  },
  {
    "type": "lcd_print",
    "message0": "LCD %1 imprimir %2",
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "lcd" },
      { "type": "input_value", "name": "TEXT", "check": ["String", "Number"] }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": "Imprime texto o número en la posición actual del cursor.",
    "helpUrl": ""
  },
  {
    "type": "lcd_set_cursor",
    "message0": "LCD %1 cursor col %2 fila %3",
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "lcd" },
      { "type": "field_number", "name": "COL", "value": 0, "min": 0 },
      { "type": "field_number", "name": "ROW", "value": 0, "min": 0 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": "Posiciona el cursor en la columna y fila indicadas (empiezan en 0).",
    "helpUrl": ""
  },
  {
    "type": "lcd_clear",
    "message0": "LCD %1 limpiar pantalla",
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "lcd" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": "Borra todo el contenido del LCD.",
    "helpUrl": ""
  },

  // ═══ LCD I2C ══════════════════════════════════
  {
    "type": "lcd_i2c_create",
    "message0": "crear LCD I2C %1 dirección %2 cols %3 filas %4",
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "lcd" },
      { "type": "field_dropdown", "name": "ADDR", "options": [["0x27", "0x27"], ["0x3F", "0x3F"]] },
      { "type": "field_number", "name": "COLS", "value": 16, "min": 8, "max": 40 },
      { "type": "field_number", "name": "ROWS", "value": 2, "min": 1, "max": 4 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": "Crea un LCD con interfaz I2C (solo 2 pines: SDA/A4 y SCL/A5). Debe ir dentro de setup().",
    "helpUrl": ""
  },

  // ═══ DHT: Sensor temperatura/humedad ═════════
  {
    "type": "dht_create",
    "message0": "crear sensor DHT %1 pin %2 tipo %3",
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "dht" },
      { "type": "field_number", "name": "PIN", "value": 7, "min": 0, "max": 54 },
      { "type": "field_dropdown", "name": "TYPE", "options": [["DHT11", "DHT11"], ["DHT22", "DHT22"]] }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 100,
    "tooltip": "Crea un sensor DHT11 o DHT22. Debe ir dentro de setup(). Requiere librería DHT de Adafruit.",
    "helpUrl": ""
  },
  {
    "type": "dht_temp",
    "message0": "temperatura de %1",
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "dht" }
    ],
    "output": "Number",
    "colour": 100,
    "tooltip": "Lee la temperatura en °C del sensor DHT.",
    "helpUrl": ""
  },
  {
    "type": "dht_humidity",
    "message0": "humedad de %1",
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "dht" }
    ],
    "output": "Number",
    "colour": 100,
    "tooltip": "Lee la humedad relativa (0-100%) del sensor DHT.",
    "helpUrl": ""
  },

  // ═══ Ultrasonic: Sensor distancia HC-SR04 ════
  {
    "type": "ultrasonic_create",
    "message0": "crear ultrasónico %1 trig %2 echo %3",
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "us" },
      { "type": "field_number", "name": "TRIG", "value": 9, "min": 0, "max": 54 },
      { "type": "field_number", "name": "ECHO", "value": 10, "min": 0, "max": 54 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 80,
    "tooltip": "Crea un sensor ultrasónico HC-SR04. Debe ir dentro de setup(). No requiere librería.",
    "helpUrl": ""
  },
  {
    "type": "ultrasonic_read",
    "message0": "distancia de %1 (cm)",
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "us" }
    ],
    "output": "Number",
    "colour": 80,
    "tooltip": "Mide la distancia en centímetros usando el sensor ultrasónico.",
    "helpUrl": ""
  },

  // ═══ Stepper: Motor paso a paso ══════════════
  {
    "type": "stepper_create",
    "message0": "crear motor paso a paso %1 pasos/vuelta %2 IN1 %3 IN2 %4 IN3 %5 IN4 %6",
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "motor" },
      { "type": "field_number", "name": "STEPS", "value": 2048, "min": 1 },
      { "type": "field_number", "name": "P1", "value": 8, "min": 0, "max": 54 },
      { "type": "field_number", "name": "P2", "value": 9, "min": 0, "max": 54 },
      { "type": "field_number", "name": "P3", "value": 10, "min": 0, "max": 54 },
      { "type": "field_number", "name": "P4", "value": 11, "min": 0, "max": 54 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 310,
    "tooltip": "Crea un motor paso a paso. Puede ir en scope global (fuera de setup/loop).",
    "helpUrl": ""
  },
  {
    "type": "stepper_speed",
    "message0": "motor %1 velocidad %2 RPM",
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "motor" },
      { "type": "field_number", "name": "RPM", "value": 10, "min": 1 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 310,
    "tooltip": "Configura la velocidad del motor en revoluciones por minuto. Debe ir dentro de setup().",
    "helpUrl": ""
  },
  {
    "type": "stepper_step",
    "message0": "motor %1 girar %2 pasos",
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "motor" },
      { "type": "field_number", "name": "COUNT", "value": 100, "min": -32768 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 310,
    "tooltip": "Gira el motor la cantidad de pasos indicada. Negativo = sentido contrario.",
    "helpUrl": ""
  }

]);

// Dummy export para evitar que Vite haga tree-shaking del side-effect
export const _arduinoBlocksDefined = true;
