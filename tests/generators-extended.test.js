/**
 * Tests unitarios para generadores C++ de bloques Arduino.
 *
 * Cubre ~42 tests: Digital, Time, Serial, Analog, Math, Control,
 * Logic, Text, Servo, LCD, Arrays, Sensors, Motor, Advanced,
 * + integración (includes, helpers, reset de estado).
 */

import { describe, it, expect, vi } from 'vitest';

// Mock de Blockly
vi.mock('blockly', () => {
  const Generator = function (name) {
    this.name_ = name;
    this.forBlock = {};
    this.ORDER_ATOMIC = 0;
    this.ORDER_NONE = 99;
    this.ORDER_ASSIGNMENT = 1;
    this.ORDER_FUNCTION_CALL = 2;
    this.ORDER_UNARY_PREFIX = 4;
    this.INDENT = '  ';
    this.nameDB_ = {
      getDistinctName: (base, _cat) => '_' + base,
      getName: (n) => n,
    };
    this.init = () => {};
    this.scrub_ = () => {};
    this.statementToCode = (_block, _name) => '';
    this.valueToCode = (_block, _name, _order) => '0';
    this.blockToCode = () => '';
    this.getFieldValue = () => '';
  };
  Generator.prototype = {};

  return {
    Generator,
    Names: function () {
      this.getName = (n) => n;
      this.safeName_ = (n) => n;
    },
    Msg: {},
  };
});

// ═══ Helpers ═════════════════════════════════════

function wsWith(blocks) {
  return { getTopBlocks: () => blocks, getAllBlocks: () => blocks };
}

function b(type, fields = {}, extras = {}) {
  return {
    type,
    getFieldValue: (name) => fields[name] ?? '',
    getField: (name) => ({ getText: () => fields[name] ?? '' }),
    getNextBlock: () => null,
    getInput: (_name) => null,
    ...extras,
  };
}

function withValueToCode(generator, values, fn) {
  const orig = generator.valueToCode;
  let idx = 0;
  generator.valueToCode = (_b, _n, _o) => {
    const v = values[idx] ?? values[values.length - 1] ?? '0';
    idx++;
    return v;
  };
  try { return fn(); }
  finally { generator.valueToCode = orig; }
}

// ═══ Digital I/O ══════════════════════════════════

describe('generadores C++ — Digital I/O', () => {
  let cppGenerator;

  beforeAll(async () => {
    const mod = await import('../frontend/js/generator.js');
    cppGenerator = mod.cppGenerator;
    await import('../frontend/js/blocks/digital.js');
  });

  it('pin_mode OUTPUT', () => {
    const code = cppGenerator.forBlock['pin_mode'](b('pin_mode', { PIN: '13', MODE: 'OUTPUT' }));
    expect(code).toBe('pinMode(13, OUTPUT);\n');
  });

  it('pin_mode INPUT_PULLUP', () => {
    const code = cppGenerator.forBlock['pin_mode'](b('pin_mode', { PIN: '7', MODE: 'INPUT_PULLUP' }));
    expect(code).toBe('pinMode(7, INPUT_PULLUP);\n');
  });

  it('pin_mode_advanced con expresión en pin', () => {
    const block = b('pin_mode_advanced', { MODE: 'OUTPUT' });
    const code = withValueToCode(cppGenerator, ['A0'], () => {
      return cppGenerator.forBlock['pin_mode_advanced'](block);
    });
    expect(code).toBe('pinMode(A0, OUTPUT);\n');
  });

  it('digital_write HIGH', () => {
    const code = cppGenerator.forBlock['digital_write'](b('digital_write', { PIN: '13', VALUE: 'HIGH' }));
    expect(code).toBe('digitalWrite(13, HIGH);\n');
  });

  it('digital_write LOW', () => {
    const code = cppGenerator.forBlock['digital_write'](b('digital_write', { PIN: '8', VALUE: 'LOW' }));
    expect(code).toBe('digitalWrite(8, LOW);\n');
  });

  it('digital_read devuelve digitalRead(pin)', () => {
    const [code, order] = cppGenerator.forBlock['digital_read'](b('digital_read', { PIN: '2' }));
    expect(code).toBe('digitalRead(2)');
    expect(order).toBe(cppGenerator.ORDER_ATOMIC);
  });
});

// ═══ Tiempo ═══════════════════════════════════════

describe('generadores C++ — Tiempo', () => {
  let cppGenerator;

  beforeAll(async () => {
    const mod = await import('../frontend/js/generator.js');
    cppGenerator = mod.cppGenerator;
    await import('../frontend/js/blocks/tiempo.js');
  });

  it('delay_ms genera delay(ms)', () => {
    const code = cppGenerator.forBlock['delay_ms'](b('delay_ms', { MS: '1000' }));
    expect(code).toBe('delay(1000);\n');
  });

  it('delay_ms_advanced con variable', () => {
    const code = withValueToCode(cppGenerator, ['tiempo'], () => {
      return cppGenerator.forBlock['delay_ms_advanced'](b('delay_ms_advanced'));
    });
    expect(code).toBe('delay(tiempo);\n');
  });

  it('millis devuelve millis()', () => {
    const [code, order] = cppGenerator.forBlock['millis'](b('millis'));
    expect(code).toBe('millis()');
    expect(order).toBe(cppGenerator.ORDER_ATOMIC);
  });
});

// ═══ Serial ═══════════════════════════════════════

describe('generadores C++ — Serial', () => {
  let cppGenerator;

  beforeAll(async () => {
    const mod = await import('../frontend/js/generator.js');
    cppGenerator = mod.cppGenerator;
    await import('../frontend/js/blocks/serial.js');
  });

  it('serial_begin con baud rate', () => {
    const code = cppGenerator.forBlock['serial_begin'](b('serial_begin', { BAUD: '9600' }));
    expect(code).toBe('Serial.begin(9600);\n');
  });

  it('serial_print usa valueToCode para TEXT', () => {
    const block = b('serial_print');
    const code = withValueToCode(cppGenerator, ['"Hola"'], () => {
      return cppGenerator.forBlock['serial_print'](block);
    });
    expect(code).toBe('Serial.print("Hola");\n');
  });

  it('serial_println con salto de línea', () => {
    const block = b('serial_println');
    const code = withValueToCode(cppGenerator, ['"Valor"'], () => {
      return cppGenerator.forBlock['serial_println'](block);
    });
    expect(code).toBe('Serial.println("Valor");\n');
  });

  it('serial_available devuelve Serial.available()', () => {
    const [code] = cppGenerator.forBlock['serial_available'](b('serial_available'));
    expect(code).toBe('Serial.available()');
  });
});

// ═══ Analógico ════════════════════════════════════

describe('generadores C++ — Analógico', () => {
  let cppGenerator;

  beforeAll(async () => {
    const mod = await import('../frontend/js/generator.js');
    cppGenerator = mod.cppGenerator;
    await import('../frontend/js/blocks/analoga.js');
  });

  it('analog_write: VALUE viene de valueToCode', () => {
    const block = b('analog_write', { PIN: '9' });
    const code = withValueToCode(cppGenerator, ['128'], () => {
      return cppGenerator.forBlock['analog_write'](block);
    });
    expect(code).toBe('analogWrite(9, 128);\n');
  });

  it('analog_read: el generador agrega prefijo A al pin numérico', () => {
    const [code, order] = cppGenerator.forBlock['analog_read'](b('analog_read', { PIN: '0' }));
    expect(code).toBe('analogRead(A0)');
    expect(order).toBe(cppGenerator.ORDER_ATOMIC);
  });
});

// ═══ Matemáticas ══════════════════════════════════

describe('generadores C++ — Matemáticas', () => {
  let cppGenerator;

  beforeAll(async () => {
    const mod = await import('../frontend/js/generator.js');
    cppGenerator = mod.cppGenerator;
  });

  it('math_number devuelve el número', () => {
    const [code, order] = cppGenerator.forBlock['math_number'](b('math_number', { NUM: '42' }));
    expect(code).toBe('42');
    expect(order).toBe(cppGenerator.ORDER_ATOMIC);
  });

  it('math_arithmetic ADD', () => {
    const code = withValueToCode(cppGenerator, ['3', '5'], () => {
      return cppGenerator.forBlock['math_arithmetic'](b('math_arithmetic', { OP: 'ADD' }));
    });
    expect(code[0]).toBe('3 + 5');
  });

  it('math_arithmetic MULTIPLY', () => {
    const code = withValueToCode(cppGenerator, ['4', '7'], () => {
      return cppGenerator.forBlock['math_arithmetic'](b('math_arithmetic', { OP: 'MULTIPLY' }));
    });
    expect(code[0]).toBe('4 * 7');
  });

  it('math_single SQRT', () => {
    const code = withValueToCode(cppGenerator, ['16'], () => {
      return cppGenerator.forBlock['math_single'](b('math_single', { OP: 'ROOT' }));
    });
    expect(code[0]).toBe('sqrt(16)');
  });

  it('math_single POW10 — usa pow(10.0, x) para compatibilidad AVR', () => {
    const code = withValueToCode(cppGenerator, ['3'], () => {
      return cppGenerator.forBlock['math_single'](b('math_single', { OP: 'POW10' }));
    });
    expect(code[0]).toBe('pow(10.0, 3)');
  });
});

// ═══ Control ══════════════════════════════════════

describe('generadores C++ — Control', () => {
  let cppGenerator;

  beforeAll(async () => {
    const mod = await import('../frontend/js/generator.js');
    cppGenerator = mod.cppGenerator;
  });

  it('controls_if genera if simple (sin else)', () => {
    const block = {
      type: 'controls_if',
      getFieldValue: () => '',
      getField: () => ({ getText: () => '' }),
      getNextBlock: () => null,
      getInput: (name) => name === 'IF0' ? {} : null,
      elseifCount_: 0,
      elseCount_: 0,
    };
    const origS = cppGenerator.statementToCode;
    const origV = cppGenerator.valueToCode;
    cppGenerator.statementToCode = (_b, name) => name === 'DO0' ? '  accion;\n' : '';
    cppGenerator.valueToCode = (_b, _n, _o) => 'cond';
    try {
      const code = cppGenerator.forBlock['controls_if'](block);
      expect(code).toContain('if (cond) {');
      expect(code).toContain('accion;');
      expect(code).toContain('}');
    } finally {
      cppGenerator.statementToCode = origS;
      cppGenerator.valueToCode = origV;
    }
  });

  it('controls_repeat_ext: TIMES se lee vía valueToCode', () => {
    const block = b('controls_repeat_ext');
    const origS = cppGenerator.statementToCode;
    const origV = cppGenerator.valueToCode;
    // Mock nameDB_ con getDistinctName
    const origDB = cppGenerator.nameDB_;
    cppGenerator.nameDB_ = { getDistinctName: (_base, _cat) => '_i', getName: (n) => n };
    cppGenerator.statementToCode = () => '  accion;\n';
    cppGenerator.valueToCode = (_b, _n, _o) => '10';
    try {
      const code = cppGenerator.forBlock['controls_repeat_ext'](block);
      expect(code).toContain('for (int _i = 0; _i < 10');
      expect(code).toContain('accion;');
    } finally {
      cppGenerator.statementToCode = origS;
      cppGenerator.valueToCode = origV;
      cppGenerator.nameDB_ = origDB;
    }
  });
});

// ═══ Lógica ═══════════════════════════════════════

describe('generadores C++ — Lógica', () => {
  let cppGenerator;

  beforeAll(async () => {
    const mod = await import('../frontend/js/generator.js');
    cppGenerator = mod.cppGenerator;
  });

  it('logic_compare EQ', () => {
    const code = withValueToCode(cppGenerator, ['a', 'b'], () => {
      return cppGenerator.forBlock['logic_compare'](b('logic_compare', { OP: 'EQ' }));
    });
    expect(code[0]).toBe('a == b');
  });

  it('logic_compare LT', () => {
    const code = withValueToCode(cppGenerator, ['x', '10'], () => {
      return cppGenerator.forBlock['logic_compare'](b('logic_compare', { OP: 'LT' }));
    });
    expect(code[0]).toBe('x < 10');
  });

  it('logic_operation AND', () => {
    const code = withValueToCode(cppGenerator, ['true', 'false'], () => {
      return cppGenerator.forBlock['logic_operation'](b('logic_operation', { OP: 'AND' }));
    });
    expect(code[0]).toBe('true && false');
  });

  it('logic_boolean TRUE → true', () => {
    expect(cppGenerator.forBlock['logic_boolean'](b('logic_boolean', { BOOL: 'TRUE' }))[0]).toBe('true');
  });

  it('logic_boolean FALSE → false', () => {
    expect(cppGenerator.forBlock['logic_boolean'](b('logic_boolean', { BOOL: 'FALSE' }))[0]).toBe('false');
  });
});

// ═══ Texto ════════════════════════════════════════

describe('generadores C++ — Texto', () => {
  let cppGenerator;

  beforeAll(async () => {
    const mod = await import('../frontend/js/generator.js');
    cppGenerator = mod.cppGenerator;
  });

  it('text string literal', () => {
    expect(cppGenerator.forBlock['text'](b('text', { TEXT: 'hola' }))[0]).toBe('"hola"');
  });

  it('text_print usa Serial.println con valueToCode', () => {
    const block = b('text_print');
    const code = withValueToCode(cppGenerator, ['"Hola"'], () => {
      return cppGenerator.forBlock['text_print'](block);
    });
    expect(code).toBe('Serial.println("Hola");\n');
  });

  it('text_join concatena con String()', () => {
    const block = { type: 'text_join', itemCount_: 2, getFieldValue: () => '', getField: () => ({ getText: () => '' }), getNextBlock: () => null };
    const code = withValueToCode(cppGenerator, ['"Hola "', 'nombre'], () => {
      return cppGenerator.forBlock['text_join'](block);
    });
    expect(code[0]).toContain('String(');
  });
});

// ═══ Servo ════════════════════════════════════════

describe('generadores C++ — Servo', () => {
  let cppGenerator;

  beforeAll(async () => {
    const mod = await import('../frontend/js/generator.js');
    cppGenerator = mod.cppGenerator;
    await import('../frontend/js/blocks/servo.js');
  });

  it('servo_create genera name.attach(pin)', () => {
    const code = cppGenerator.forBlock['servo_create'](b('servo_create', { NAME: 'base', PIN: '9' }));
    expect(code).toBe('base.attach(9);\n');
  });

  it('servo_write genera name.write(angle)', () => {
    const code = cppGenerator.forBlock['servo_write'](b('servo_write', { NAME: 'base', ANGLE: '90' }));
    expect(code).toBe('base.write(90);\n');
  });

  it('servo_create usa nombre por defecto "servo"', () => {
    const code = cppGenerator.forBlock['servo_create'](b('servo_create', { NAME: '', PIN: '9' }));
    expect(code).toContain('servo.attach(9)');
  });
});

// ═══ LCD ══════════════════════════════════════════

describe('generadores C++ — LCD', () => {
  let cppGenerator;

  beforeAll(async () => {
    const mod = await import('../frontend/js/generator.js');
    cppGenerator = mod.cppGenerator;
    await import('../frontend/js/blocks/lcd.js');
  });

  it('lcd_create genera name.begin(cols, rows)', () => {
    const code = cppGenerator.forBlock['lcd_create'](b('lcd_create', {
      NAME: 'lcd', RS: '12', EN: '11',
      D4: '5', D5: '4', D6: '3', D7: '2',
      COLS: '16', ROWS: '2'
    }));
    expect(code).toContain('lcd.begin(16, 2)');
  });

  it('lcd_print genera name.print(text) vía valueToCode', () => {
    const block = b('lcd_print', { NAME: 'lcd' });
    const code = withValueToCode(cppGenerator, ['"Hola"'], () => {
      return cppGenerator.forBlock['lcd_print'](block);
    });
    expect(code).toBe('lcd.print("Hola");\n');
  });
});

// ═══ Arrays ═══════════════════════════════════════

describe('generadores C++ — Arrays', () => {
  let cppGenerator;

  beforeAll(async () => {
    const mod = await import('../frontend/js/generator.js');
    cppGenerator = mod.cppGenerator;
    await import('../frontend/js/blocks/arrays.js');
  });

  it('array_declare int con valores', () => {
    const code = cppGenerator.forBlock['array_declare'](b('array_declare', { NAME: 'datos', TYPE: 'int', VALUES: '1,2,3' }));
    expect(code).toContain('int datos[] = {');
    expect(code).toContain('1');
    expect(code).toContain('2');
    expect(code).toContain('3');
  });

  it('array_get genera acceso por índice', () => {
    const code = withValueToCode(cppGenerator, ['i'], () => {
      return cppGenerator.forBlock['array_get'](b('array_get', { NAME: 'datos' }));
    });
    expect(code[0]).toBe('datos[i]');
  });

  it('array_set genera asignación con valueToCode', () => {
    const block = b('array_set', { NAME: 'datos' });
    const code = withValueToCode(cppGenerator, ['0', '42'], () => {
      return cppGenerator.forBlock['array_set'](block);
    });
    expect(code).toBe('datos[0] = 42;\n');
  });
});

// ═══ Sensores ═════════════════════════════════════

describe('generadores C++ — Sensores', () => {
  let cppGenerator;

  beforeAll(async () => {
    const mod = await import('../frontend/js/generator.js');
    cppGenerator = mod.cppGenerator;
    await import('../frontend/js/blocks/sensores.js');
  });

  it('dht_create genera name.begin() + registra instancia', () => {
    cppGenerator._dhtInstances = [];
    const code = cppGenerator.forBlock['dht_create'](b('dht_create', { NAME: 'dht', PIN: '2', TYPE: 'DHT11' }));
    expect(code).toContain('dht.begin()');
    expect(cppGenerator._dhtInstances.length).toBe(1);
    expect(cppGenerator._dhtInstances[0]).toEqual({ name: 'dht', pin: '2', type: 'DHT11' });
  });

  it('ultrasonic_create genera pinMode + registra instancia', () => {
    cppGenerator._usInstances = [];
    const code = cppGenerator.forBlock['ultrasonic_create'](b('ultrasonic_create', { NAME: 'us', TRIG: '9', ECHO: '10' }));
    expect(code).toContain('pinMode(9, OUTPUT)');
    expect(code).toContain('pinMode(10, INPUT)');
    expect(cppGenerator._usInstances.length).toBe(1);
  });

  it('dht_temp devuelve name.readTemperature()', () => {
    const [code] = cppGenerator.forBlock['dht_temp'](b('dht_temp', { NAME: 'dht' }));
    expect(code).toBe('dht.readTemperature()');
  });

  it('ultrasonic_read devuelve name_read()', () => {
    const [code] = cppGenerator.forBlock['ultrasonic_read'](b('ultrasonic_read', { NAME: 'us' }));
    expect(code).toBe('us_read()');
  });
});

// ═══ Motor (Stepper) ══════════════════════════════

describe('generadores C++ — Motor (Stepper)', () => {
  let cppGenerator;

  beforeAll(async () => {
    const mod = await import('../frontend/js/generator.js');
    cppGenerator = mod.cppGenerator;
    await import('../frontend/js/blocks/motor.js');
  });

  it('stepper_create registra instancia (declaración global en generateArduinoCode)', () => {
    cppGenerator._stepperInstances = [];
    const code = cppGenerator.forBlock['stepper_create'](b('stepper_create', {
      NAME: 'motor', STEPS: '200', P1: '8', P2: '9', P3: '10', P4: '11'
    }));
    expect(code).toBe(''); // la declaración va en generateArduinoCode
    expect(cppGenerator._stepperInstances.length).toBe(1);
    expect(cppGenerator._stepperInstances[0].name).toBe('motor');
  });

  it('stepper_speed genera name.setSpeed(rpm)', () => {
    const code = cppGenerator.forBlock['stepper_speed'](b('stepper_speed', { NAME: 'motor', RPM: '120' }));
    expect(code).toBe('motor.setSpeed(120);\n');
  });

  it('stepper_step lee COUNT como field (no valueToCode)', () => {
    const code = cppGenerator.forBlock['stepper_step'](b('stepper_step', { NAME: 'motor', COUNT: '100' }));
    expect(code).toBe('motor.step(100);\n');
  });
});

// ═══ Avanzado (tone) ══════════════════════════════

describe('generadores C++ — Avanzado (tone)', () => {
  let cppGenerator;

  beforeAll(async () => {
    const mod = await import('../frontend/js/generator.js');
    cppGenerator = mod.cppGenerator;
    await import('../frontend/js/blocks/avanzada.js');
  });

  it('tone_output genera tone(pin, freq)', () => {
    const code = cppGenerator.forBlock['tone_output'](b('tone_output', { PIN: '8', FREQ: '440' }));
    expect(code).toBe('tone(8, 440);\n');
  });

  it('no_tone_output genera noTone(pin)', () => {
    const code = cppGenerator.forBlock['no_tone_output'](b('no_tone_output', { PIN: '8' }));
    expect(code).toBe('noTone(8);\n');
  });
});

// ═══ Integración: generateArduinoCode ═════════════

describe('generateArduinoCode — includes y helpers', () => {
  let generateArduinoCode, cppGenerator;

  beforeAll(async () => {
    const mod = await import('../frontend/js/generator.js');
    generateArduinoCode = mod.generateArduinoCode;
    cppGenerator = mod.cppGenerator;
    await import('../frontend/js/blocks/servo.js');
    await import('../frontend/js/blocks/lcd.js');
    await import('../frontend/js/blocks/sensores.js');
    await import('../frontend/js/blocks/motor.js');
    await import('../frontend/js/blocks/estructura.js');
  });

  it('include_header genera #include en el sketch', () => {
    const ws = {
      getTopBlocks: () => [b('arduino_setup'), b('arduino_loop')],
      getAllBlocks: () => [b('arduino_setup'), b('arduino_loop'), b('include_header', { FILE: 'config.h' })],
    };
    expect(generateArduinoCode(ws)).toContain('#include "config.h"');
  });

  it('incluye #include <Servo.h> con servo_create', () => {
    const ws = {
      getTopBlocks: () => [b('arduino_setup'), b('arduino_loop')],
      getAllBlocks: () => [b('arduino_setup'), b('arduino_loop'), b('servo_create', { NAME: 'base', PIN: '9' })],
    };
    const code = generateArduinoCode(ws);
    expect(code).toContain('#include <Servo.h>');
    expect(code).toContain('Servo base;');
  });

  it('incluye #include <LiquidCrystal.h> con lcd_create', () => {
    const ws = {
      getTopBlocks: () => [b('arduino_setup'), b('arduino_loop')],
      getAllBlocks: () => [b('arduino_setup'), b('arduino_loop'),
        b('lcd_create', { NAME: 'lcd', RS: '12', EN: '11', D4: '5', D5: '4', D6: '3', D7: '2', COLS: '16', ROWS: '2' })],
    };
    expect(generateArduinoCode(ws)).toContain('#include <LiquidCrystal.h>');
  });

  it('incluye #include <DHT.h> con dht_create', () => {
    const ws = {
      getTopBlocks: () => [b('arduino_setup'), b('arduino_loop')],
      getAllBlocks: () => [b('arduino_setup'), b('arduino_loop'), b('dht_create', { NAME: 'dht', PIN: '2', TYPE: 'DHT11' })],
    };
    expect(generateArduinoCode(ws)).toContain('#include <DHT.h>');
  });

  it('incluye #include <Stepper.h> con stepper_create', () => {
    const ws = {
      getTopBlocks: () => [b('arduino_setup'), b('arduino_loop')],
      getAllBlocks: () => [b('arduino_setup'), b('arduino_loop'),
        b('stepper_create', { NAME: 'm', STEPS: '200', P1: '8', P2: '9', P3: '10', P4: '11' })],
    };
    expect(generateArduinoCode(ws)).toContain('#include <Stepper.h>');
  });

  it('orden canónico: #include → globales → setup → loop', () => {
    const ws = {
      getTopBlocks: () => [b('arduino_setup'), b('arduino_loop')],
      getAllBlocks: () => [b('arduino_setup'), b('arduino_loop'), b('servo_create', { NAME: 's', PIN: '9' })],
    };
    const code = generateArduinoCode(ws);
    const incIdx = code.indexOf('#include');
    const servoIdx = code.indexOf('Servo s;');
    const setupIdx = code.indexOf('void setup()');
    const loopIdx = code.indexOf('void loop()');
    expect(incIdx).toBeLessThan(servoIdx);
    expect(servoIdx).toBeLessThan(setupIdx);
    expect(setupIdx).toBeLessThan(loopIdx);
  });
});
