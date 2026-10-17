import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { cppGenerator, generateArduinoCode } from '../frontend/js/generator.js';

/**
 * AFMotor_R4 (shield para R4): AF_DCMotor y AF_Stepper. La librería no trae
 * clase de servo; el servo del shield no forma parte de esta categoría.
 */

function workspaceWith(build) {
  const ws = new Blockly.Workspace();
  const include = ws.newBlock('library_include');
  include.setFieldValue('AFMotor_R4.h', 'LIB');
  const setup = ws.newBlock('arduino_setup');
  const loop = ws.newBlock('arduino_loop');
  build(ws, { include, setup, loop });
  const sketch = generateArduinoCode(ws);
  ws.dispose();
  return sketch;
}

describe('AFMotor: motor DC', () => {
  it('declara el motor con el canal y su include', () => {
    const sketch = workspaceWith((ws, ctx) => {
      const create = ws.newBlock('afmotor_dc_create');
      create.setFieldValue('motor1', 'NAME');
      create.setFieldValue('3', 'CHANNEL');
      const speed = ws.newBlock('afmotor_dc_speed');
      speed.setFieldValue('motor1', 'NAME');
      speed.setFieldValue('180', 'SPEED');
      ctx.loop.getInput('BODY').connection.connect(speed.previousConnection);
    });

    expect(sketch).toContain('#include "AFMotor_R4.h"');
    expect(sketch).toContain('AF_DCMotor motor1(3);');
    expect(sketch).toContain('motor1.setSpeed(180);');
  });

  it('permite adelante, atrás, frenar y detener', () => {
    for (const [dir, esperado] of [
      ['FORWARD', 'motor1.run(FORWARD);'],
      ['BACKWARD', 'motor1.run(BACKWARD);'],
      ['BRAKE', 'motor1.run(BRAKE);'],
      ['RELEASE', 'motor1.run(RELEASE);'],
    ]) {
      const sketch = workspaceWith((ws, ctx) => {
        ws.newBlock('afmotor_dc_create').setFieldValue('motor1', 'NAME');
        const run = ws.newBlock('afmotor_dc_run');
        run.setFieldValue('motor1', 'NAME');
        run.setFieldValue(dir, 'DIR');
        ctx.loop.getInput('BODY').connection.connect(run.previousConnection);
      });
      expect(sketch).toContain(esperado);
    }
  });
});

describe('AFMotor: motor paso a paso', () => {
  it('declara el stepper con pasos y canal', () => {
    const sketch = workspaceWith((ws) => {
      const create = ws.newBlock('afmotor_stepper_create');
      create.setFieldValue('stepper1', 'NAME');
      create.setFieldValue('48', 'STEPS');
      create.setFieldValue('2', 'CHANNEL');
    });

    expect(sketch).toContain('AF_Stepper stepper1(48, 2);');
    expect(sketch).toContain('stepper1.setSpeed(');
  });

  it('gira con cantidad, dirección y estilo', () => {
    const sketch = workspaceWith((ws, ctx) => {
      ws.newBlock('afmotor_stepper_create').setFieldValue('stepper1', 'NAME');
      const step = ws.newBlock('afmotor_stepper_step');
      step.setFieldValue('stepper1', 'NAME');
      step.setFieldValue('400', 'COUNT');
      step.setFieldValue('BACKWARD', 'DIR');
      step.setFieldValue('MICROSTEP', 'STYLE');
      ctx.loop.getInput('BODY').connection.connect(step.previousConnection);
    });

    expect(sketch).toContain('stepper1.step(400, BACKWARD, MICROSTEP);');
  });

  it('onestep devuelve la posición como expresión', () => {
    const ws = new Blockly.Workspace();
    const block = ws.newBlock('afmotor_stepper_onestep');
    block.setFieldValue('stepper1', 'NAME');
    block.setFieldValue('FORWARD', 'DIR');
    block.setFieldValue('DOUBLE', 'STYLE');

    const out = cppGenerator.blockToCode(block);
    const code = Array.isArray(out) ? out[0] : out;

    expect(code).toBe('stepper1.onestep(FORWARD, DOUBLE)');
    ws.dispose();
  });

  it('libera el motor', () => {
    const sketch = workspaceWith((ws, ctx) => {
      ws.newBlock('afmotor_stepper_create').setFieldValue('stepper1', 'NAME');
      const release = ws.newBlock('afmotor_stepper_release');
      release.setFieldValue('stepper1', 'NAME');
      ctx.loop.getInput('BODY').connection.connect(release.previousConnection);
    });

    expect(sketch).toContain('stepper1.release();');
  });
});

describe('AFMotor: catálogo y textos', () => {
  it('los ocho bloques existen y tienen generador', () => {
    const tipos = [
      'afmotor_dc_create', 'afmotor_dc_speed', 'afmotor_dc_run',
      'afmotor_stepper_create', 'afmotor_stepper_speed', 'afmotor_stepper_step',
      'afmotor_stepper_onestep', 'afmotor_stepper_release',
    ];
    for (const tipo of tipos) {
      expect(Blockly.Blocks[tipo], tipo).toBeTruthy();
      expect(typeof cppGenerator.forBlock[tipo], tipo).toBe('function');
    }
  });
});
