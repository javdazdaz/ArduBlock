/**
 * ArduBlock — Configuración de Placas Arduino
 *
 * Centraliza FQBNs, pines disponibles, cores/libs necesarias
 * para las 5 placas soportadas.
 * Expone getBoardConfig(), getBoardList(), getDefaultFqbn().
 */

const BOARDS = {
  'arduino:avr:uno': {
    name: 'Arduino Uno R3',
    digitalPins: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    analogPins: [0, 1, 2, 3, 4, 5],
    pwmPins: [3, 5, 6, 9, 10, 11],
    maxDigital: 13,
    maxAnalog: 5,
    cores: [],
    libs: []
  },
  'arduino:renesas_uno:minima': {
    name: 'Arduino Uno R4 Minima',
    digitalPins: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    analogPins: [0, 1, 2, 3, 4, 5],
    pwmPins: [3, 5, 6, 9, 10, 11],
    maxDigital: 13,
    maxAnalog: 5,
    cores: ['arduino:renesas_uno'],
    libs: []
  },
  'arduino:renesas_uno:wifi': {
    name: 'Arduino Uno R4 WiFi',
    digitalPins: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    analogPins: [0, 1, 2, 3, 4, 5],
    pwmPins: [3, 5, 6, 9, 10, 11],
    maxDigital: 13,
    maxAnalog: 5,
    cores: ['arduino:renesas_uno'],
    libs: []  // WiFiS3 viene incluida en el core renesas_uno
  },
  'arduino:esp32:nano_nora': {
    name: 'Arduino Nano ESP32',
    digitalPins: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    analogPins: [0, 1, 2, 3, 4, 5, 6, 7],
    pwmPins: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21],
    maxDigital: 21,
    maxAnalog: 7,
    cores: ['arduino:esp32'],
    libs: []
  },
  'arduino:avr:mega': {
    name: 'Arduino Mega 2560',
    digitalPins: Array.from({ length: 54 }, (_, i) => i),
    analogPins: Array.from({ length: 16 }, (_, i) => i),
    pwmPins: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 44, 45, 46],
    maxDigital: 53,
    maxAnalog: 15,
    cores: [],
    libs: []
  }
};

/**
 * Devuelve la configuración completa de una placa por su FQBN.
 * Si el FQBN no existe, retorna Arduino Uno R3 por defecto.
 */
export function getBoardConfig(fqbn) {
  return BOARDS[fqbn] || BOARDS['arduino:avr:uno'];
}

/**
 * Lista resumida de placas para poblar <select>.
 */
export function getBoardList() {
  return Object.entries(BOARDS).map(([fqbn, cfg]) => ({
    fqbn,
    name: cfg.name,
    digitalCount: cfg.digitalPins.length,
    analogCount: cfg.analogPins.length
  }));
}

/**
 * Verifica si un pin digital es válido para la placa dada.
 */
export function isValidDigitalPin(fqbn, pin) {
  const cfg = getBoardConfig(fqbn);
  return cfg.digitalPins.includes(pin);
}

/**
 * Verifica si un pin analógico es válido para la placa dada.
 */
export function isValidAnalogPin(fqbn, pin) {
  const cfg = getBoardConfig(fqbn);
  return cfg.analogPins.includes(pin);
}

/**
 * Verifica si un pin soporta PWM en la placa dada.
 */
export function isPwmPin(fqbn, pin) {
  const cfg = getBoardConfig(fqbn);
  return cfg.pwmPins.includes(pin);
}

/**
 * FQBN por defecto (Arduino Uno R3).
 */
export function getDefaultFqbn() {
  return 'arduino:avr:uno';
}
