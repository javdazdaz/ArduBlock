import { describe, expect, it, afterAll } from 'vitest';
import { rmSync } from 'node:fs';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { generateArduinoCode } from '../frontend/js/generator.js';
import { installIncludeDetach } from '../frontend/js/include-blocks.js';

/** Orden del sketch: los includes van antes que cualquier declaración. */

const incl = { type: 'library_include', id: 'LIB', fields: { LIB: 'AFMotor_R4.h' } };

function sketchDe(estado) {
  installIncludeDetach();
  const ws = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(estado, ws);
    return generateArduinoCode(ws);
  } finally {
    ws.dispose();
  }
}

afterAll(() => {
  rmSync('/tmp/sketch-sonda.txt', { force: true });
});

describe('orden del sketch', () => {
  it('el include va antes de la declaración del motor', () => {
    const sketch = sketchDe({
      blocks: { languageVersion: 0, blocks: [
        { type: 'arduino_setup', id: 'S1', x: 20, y: 20, inputs: { BODY: { block: { ...incl, next: { block: { type: 'afmotor_dc_create', id: 'C1', fields: { NAME: 'motor1', CHANNEL: '1' } } } } } } },
        { type: 'arduino_loop', id: 'L1', x: 20, y: 300 },
      ] },
    });

    expect(sketch.indexOf('#include "AFMotor_R4.h"')).toBe(0);
    expect(sketch.indexOf('#include "AFMotor_R4.h"')).toBeLessThan(sketch.indexOf('AF_DCMotor motor1(1);'));
  });

  it('el include es la primera línea aunque haya varias librerías', () => {
    const sketch = sketchDe({
      blocks: { languageVersion: 0, blocks: [
        incl,
        { type: 'servo_create', id: 'SV', x: 300, y: 20, fields: { NAME: 'servo1', PIN: '9' } },
        { type: 'arduino_setup', id: 'S1', x: 20, y: 20 },
        { type: 'arduino_loop', id: 'L1', x: 20, y: 200 },
      ] },
    });

    const lineas = sketch.split('\n');
    expect(lineas[0]).toBe('#include "AFMotor_R4.h"');
    expect(sketch.indexOf('#include "AFMotor_R4.h"')).toBeLessThan(sketch.indexOf('#include <Servo.h>'));
  });
});

describe('bloques sueltos', () => {
  it('el create suelto inicializa dentro de setup', () => {
    const sketch = sketchDe({
      blocks: { languageVersion: 0, blocks: [
        incl,
        { type: 'afmotor_dc_create', id: 'C1', x: 400, y: 20, fields: { NAME: 'motor1', CHANNEL: '1' } },
        { type: 'arduino_setup', id: 'S1', x: 20, y: 20 },
        { type: 'arduino_loop', id: 'L1', x: 20, y: 200 },
      ] },
    });

    const setup = sketch.slice(sketch.indexOf('void setup()'), sketch.indexOf('void loop()'));
    expect(setup).toContain('motor1.setSpeed(200);');
    expect(sketch.slice(0, sketch.indexOf('void setup()'))).not.toContain('setSpeed');
  });

  it('el speed suelto queda dentro de setup e indentado', () => {
    const sketch = sketchDe({
      blocks: { languageVersion: 0, blocks: [
        incl,
        { type: 'afmotor_dc_create', id: 'C1', x: 400, y: 20, fields: { NAME: 'motor1', CHANNEL: '1' } },
        { type: 'afmotor_dc_speed', id: 'V1', x: 400, y: 120, fields: { NAME: 'motor1', SPEED: '150' } },
        { type: 'arduino_setup', id: 'S1', x: 20, y: 20 },
        { type: 'arduino_loop', id: 'L1', x: 20, y: 200 },
      ] },
    });

    expect(sketch).toContain('  motor1.setSpeed(150);');
    expect(sketch.slice(0, sketch.indexOf('void setup()'))).not.toContain('setSpeed(150)');
  });

  it('un bloque de valor suelto no ensucia el sketch', () => {
    const sketch = sketchDe({
      blocks: { languageVersion: 0, blocks: [
        { type: 'arduino_setup', id: 'S1', x: 20, y: 20 },
        { type: 'arduino_loop', id: 'L1', x: 20, y: 200 },
        { type: 'math_number', id: 'N1', x: 400, y: 20, fields: { NUM: '42' } },
      ] },
    });

    expect(sketch).not.toContain('42');
  });
});

describe('los create del shield se conectan', () => {
  for (const tipo of ['afmotor_dc_create', 'afmotor_stepper_create', 'afmotor_servo_create']) {
    it(`${tipo} acepta bloque anterior y siguiente`, () => {
      const ws = new Blockly.Workspace();
      try {
        const bloque = ws.newBlock(tipo);
        expect(bloque.previousConnection).toBeTruthy();
        expect(bloque.nextConnection).toBeTruthy();
      } finally {
        ws.dispose();
      }
    });
  }
});
