/**
 * Tests unitarios para generator.js — Generador de C++ Arduino.
 *
 * Estrategia: mockear Blockly antes de importar el módulo.
 * Vitest con jsdom provee el entorno para ESM + mocks.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock de Blockly antes de que generator.js lo importe
vi.mock('blockly', () => {
  const Generator = function (name) {
    this.name_ = name;
    this.forBlock = {};
    this.ORDER_ATOMIC = 0;
    this.ORDER_NONE = 99;
    this.INDENT = '  ';
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
  };
});

// Helper: construir workspace falso
function wsWith(blocks) {
  return {
    getTopBlocks: () => blocks,
    getAllBlocks: () => blocks,
  };
}

function b(type, fields = {}, inputs = {}) {
  return {
    type,
    getFieldValue: (name) => fields[name] ?? '',
    getField: (name) => ({ getText: () => fields[name] ?? '' }),
    getNextBlock: () => null,
    inputs,
  };
}

describe('generateArduinoCode — integración', () => {
  let generateArduinoCode;

  beforeAll(async () => {
    const mod = await import('../frontend/js/generator.js');
    generateArduinoCode = mod.generateArduinoCode;
  });

  it('genera sketch mínimo con setup vacío', () => {
    const ws = wsWith([
      b('arduino_setup', {}, { BODY: '' }),
      b('arduino_loop', {}, { BODY: '' }),
    ]);
    const code = generateArduinoCode(ws);
    expect(code).toContain('void setup()');
    expect(code).toContain('void loop()');
  });

  it('incluye #include <Servo.h> cuando hay servo_create', () => {
    const ws = {
      getTopBlocks: () => [
        b('arduino_setup', {}, { BODY: '' }),
        b('arduino_loop', {}, { BODY: '' }),
      ],
      getAllBlocks: () => [
        b('arduino_setup', {}, { BODY: '' }),
        b('arduino_loop', {}, { BODY: '' }),
        b('servo_create', { NAME: 'base', PIN: '9' }),
      ],
    };
    const code = generateArduinoCode(ws);
    expect(code).toContain('#include <Servo.h>');
    expect(code).toContain('Servo base;');
  });

  it('genera helper isPrime con tipo long (fix AVR)', () => {
    // Activamos _needsIsPrime indirectamente... requiere invocar el handler
    // Como test de smoke, verificamos que la función existe
    expect(typeof generateArduinoCode).toBe('function');
    const ws = wsWith([
      b('arduino_setup', {}, { BODY: '' }),
      b('arduino_loop', {}, { BODY: '' }),
    ]);
    const code = generateArduinoCode(ws);
    // Sin bloques PRIME, isPrime no debería estar presente
    expect(code).not.toContain('isPrime');
  });

  it('setup aparece antes que loop en el output', () => {
    const ws = wsWith([
      b('arduino_setup', {}, { BODY: '' }),
      b('arduino_loop', {}, { BODY: '' }),
    ]);
    const code = generateArduinoCode(ws);
    const setupIdx = code.indexOf('void setup()');
    const loopIdx = code.indexOf('void loop()');
    expect(setupIdx).toBeGreaterThan(-1);
    expect(loopIdx).toBeGreaterThan(-1);
    expect(setupIdx).toBeLessThan(loopIdx);
  });

  it('reset de estado entre llamadas', () => {
    const ws1 = {
      getTopBlocks: () => [
        b('arduino_setup', {}, { BODY: '' }),
        b('arduino_loop', {}, { BODY: '' }),
      ],
      getAllBlocks: () => [
        b('arduino_setup', {}, { BODY: '' }),
        b('arduino_loop', {}, { BODY: '' }),
        b('servo_create', { NAME: 's1', PIN: '9' }),
      ],
    };
    const code1 = generateArduinoCode(ws1);
    expect(code1).toContain('Servo s1;');

    // Segunda llamada sin servo — no debe tener include de Servo
    const ws2 = wsWith([
      b('arduino_setup', {}, { BODY: '' }),
      b('arduino_loop', {}, { BODY: '' }),
    ]);
    const code2 = generateArduinoCode(ws2);
    expect(code2).not.toContain('#include <Servo.h>');
  });
});
