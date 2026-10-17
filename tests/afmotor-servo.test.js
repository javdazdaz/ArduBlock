import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { cppGenerator, generateArduinoCode } from '../frontend/js/generator.js';

/**
 * Servo del shield AFMotor. La librería AFMotor_R4 no incluye clase de servo:
 * la señal de SERVO_1 va al pin 9 y la de SERVO_2 al pin 10, y el control es
 * de la librería Servo.
 */

function sketchWith(build) {
  const ws = new Blockly.Workspace();
  ws.newBlock('library_include').setFieldValue('AFMotor_R4.h', 'LIB');
  const setup = ws.newBlock('arduino_setup');
  const loop = ws.newBlock('arduino_loop');
  build(ws, { setup, loop });
  const sketch = generateArduinoCode(ws);
  ws.dispose();
  return sketch;
}

function servoCreate(ws, name, output) {
  const block = ws.newBlock('afmotor_servo_create');
  block.setFieldValue(name, 'NAME');
  block.setFieldValue(output, 'SERVO');
  return block;
}

describe('servo del shield: declaración', () => {
  it('usa el pin 9 para la salida 1 y declara la instancia', () => {
    const sketch = sketchWith((ws, ctx) => {
      const create = servoCreate(ws, 'servo1', '1');
      // attach debe ir en setup
      const first = ctx.setup.getInput('BODY');
      first.connection.connect(create.previousConnection ?? create.nextConnection);
    });

    expect(sketch).toContain('#include <Servo.h>');
    expect(sketch).toContain('Servo servo1;');
    expect(sketch).toContain('servo1.attach(9);');
  });

  it('usa el pin 10 para la salida 2', () => {
    const ws = new Blockly.Workspace();
    const create = servoCreate(ws, 'servo2', '2');
    const out = cppGenerator.blockToCode(create);
    ws.dispose();

    expect(out).toContain('servo2.attach(10);');
  });
});

describe('servo del shield: movimiento', () => {
  it('escribe el ángulo', () => {
    const sketch = sketchWith((ws, ctx) => {
      ws.newBlock('afmotor_servo_create').setFieldValue('servo1', 'NAME');
      const write = ws.newBlock('afmotor_servo_write');
      write.setFieldValue('servo1', 'NAME');
      write.setFieldValue('45', 'ANGLE');
      ctx.loop.getInput('BODY').connection.connect(write.previousConnection);
    });

    expect(sketch).toContain('servo1.write(45);');
  });

  it('escribe el ancho de pulso en microsegundos', () => {
    const sketch = sketchWith((ws, ctx) => {
      ws.newBlock('afmotor_servo_create').setFieldValue('servo1', 'NAME');
      const us = ws.newBlock('afmotor_servo_write_us');
      us.setFieldValue('servo1', 'NAME');
      us.setFieldValue('1750', 'US');
      ctx.loop.getInput('BODY').connection.connect(us.previousConnection);
    });

    expect(sketch).toContain('servo1.writeMicroseconds(1750);');
  });

  it('lee el último ángulo escrito como expresión', () => {
    const ws = new Blockly.Workspace();
    const read = ws.newBlock('afmotor_servo_read');
    read.setFieldValue('servo1', 'NAME');
    const out = cppGenerator.blockToCode(read);
    ws.dispose();

    expect(Array.isArray(out) ? out[0] : out).toBe('servo1.read()');
  });

  it('suelta el servo', () => {
    const sketch = sketchWith((ws, ctx) => {
      ws.newBlock('afmotor_servo_create').setFieldValue('servo1', 'NAME');
      const detach = ws.newBlock('afmotor_servo_detach');
      detach.setFieldValue('servo1', 'NAME');
      ctx.loop.getInput('BODY').connection.connect(detach.previousConnection);
    });

    expect(sketch).toContain('servo1.detach();');
  });
});

describe('servo del shield: catálogo', () => {
  it('los cinco bloques existen y tienen generador', () => {
    const tipos = [
      'afmotor_servo_create', 'afmotor_servo_write', 'afmotor_servo_write_us',
      'afmotor_servo_read', 'afmotor_servo_detach',
    ];
    for (const tipo of tipos) {
      expect(Blockly.Blocks[tipo], tipo).toBeTruthy();
      expect(typeof cppGenerator.forBlock[tipo], tipo).toBe('function');
    }
  });
});
