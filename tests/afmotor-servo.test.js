import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { cppGenerator, generateArduinoCode } from '../frontend/js/generator.js';

/**
 * Servo del shield AFMotor. La librería AFMotor_R4 no incluye clase de servo:
 * la señal de SERVO_1 va al pin 9 y la de SERVO_2 al pin 10, y el control es
 * de la librería Servo.
 *
 * Desde que la familia separa declaración y ajuste, `afmotor_servo_create`
 * solo declara y `afmotor_servo_attach` conecta el pin.
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

function declarar(ws, name) {
  const block = ws.newBlock('afmotor_servo_create');
  block.setFieldValue(name, 'NAME');
  return block;
}

function conectar(ws, name, output) {
  const block = ws.newBlock('afmotor_servo_attach');
  block.setFieldValue(name, 'NAME');
  block.setFieldValue(output, 'SERVO');
  return block;
}

describe('servo del shield: declaración', () => {
  it('el create declara la instancia y no emite ninguna llamada', () => {
    const ws = new Blockly.Workspace();
    const create = declarar(ws, 'servo1');
    expect(cppGenerator.blockToCode(create)).toBe('');
    ws.dispose();
  });

  it('la salida 1 conecta el pin 9 dentro de setup', () => {
    const sketch = sketchWith((ws, ctx) => {
      declarar(ws, 'servo1');
      const attach = conectar(ws, 'servo1', '1');
      ctx.setup.getInput('BODY').connection.connect(attach.previousConnection);
    });

    expect(sketch).toContain('#include <Servo.h>');
    expect(sketch).toContain('Servo servo1;');
    expect(sketch).toContain('servo1.attach(9);');
  });

  it('la salida 2 conecta el pin 10', () => {
    const ws = new Blockly.Workspace();
    const out = cppGenerator.blockToCode(conectar(ws, 'servo2', '2'));
    ws.dispose();

    expect(out).toBe('servo2.attach(10);\n');
  });

  it('el attach admite cualquier nombre declarado antes', () => {
    const sketch = sketchWith((ws, ctx) => {
      declarar(ws, 'brazo');
      const attach = conectar(ws, 'brazo', '1');
      ctx.setup.getInput('BODY').connection.connect(attach.previousConnection);
    });

    expect(sketch).toContain('Servo brazo;');
    expect(sketch).toContain('brazo.attach(9);');
  });
});

describe('servo del shield: movimiento', () => {
  it('escribe el ángulo', () => {
    const sketch = sketchWith((ws, ctx) => {
      declarar(ws, 'servo1');
      const write = ws.newBlock('afmotor_servo_write');
      write.setFieldValue('servo1', 'NAME');
      write.setFieldValue('45', 'ANGLE');
      ctx.loop.getInput('BODY').connection.connect(write.previousConnection);
    });

    expect(sketch).toContain('servo1.write(45);');
  });

  it('escribe el ancho de pulso en microsegundos', () => {
    const sketch = sketchWith((ws, ctx) => {
      declarar(ws, 'servo1');
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
      declarar(ws, 'servo1');
      const detach = ws.newBlock('afmotor_servo_detach');
      detach.setFieldValue('servo1', 'NAME');
      ctx.loop.getInput('BODY').connection.connect(detach.previousConnection);
    });

    expect(sketch).toContain('servo1.detach();');
  });
});

describe('servo del shield: catálogo y estados viejos', () => {
  it('los seis bloques existen y tienen generador', () => {
    const tipos = [
      'afmotor_servo_create', 'afmotor_servo_attach', 'afmotor_servo_write',
      'afmotor_servo_write_us', 'afmotor_servo_read', 'afmotor_servo_detach',
    ];
    for (const tipo of tipos) {
      expect(Blockly.Blocks[tipo], tipo).toBeTruthy();
      expect(typeof cppGenerator.forBlock[tipo], tipo).toBe('function');
    }
  });

  it('un estado guardado con el campo SERVO en el create todavía carga', () => {
    const estado = {
      blocks: { languageVersion: 0, blocks: [
        { type: 'afmotor_servo_create', id: 'c1', x: 20, y: 20, fields: { NAME: 'servo1', SERVO: '2' } },
      ] },
    };
    const ws = new Blockly.Workspace();
    try {
      Blockly.serialization.workspaces.load(estado, ws);
      expect(ws.getAllBlocks(false).length).toBe(1);
    } finally {
      ws.dispose();
    }
  });
});
