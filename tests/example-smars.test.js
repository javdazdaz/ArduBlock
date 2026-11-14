import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { generateArduinoCode } from '../frontend/js/generator.js';
import { robotExamples } from '../frontend/js/examples-robots.js';

/**
 * El ejemplo SMARS viene del sketch `~/Arduino/Smars_Ultrasonico`: cuatro
 * motores DC en el shield, HC-SR04 en A1/A0 y una maniobra de esquiva.
 */

const ejemplo = robotExamples.find(e => e.name === 'SMARS con ultrasónico');

describe('ejemplo SMARS con ultrasónico', () => {
  let ws;

  beforeEach(() => {
    ws = new Blockly.Workspace();
  });

  afterEach(() => {
    ws.dispose();
  });

  it('declara la fuente, la categoría, la placa y el comentario', () => {
    expect(ejemplo).toBeTruthy();
    expect(ejemplo.source).toBe('ardublock-examples');
    expect(ejemplo.category).toBe('robots');
    expect(ejemplo.board).toBe('arduino:renesas_uno:unor4wifi');
    expect(ejemplo.comment.es).toContain('SMARS');
    expect(ejemplo.comment.en).toContain('SMARS');
  });

  it('el estado carga con los 57 bloques', () => {
    Blockly.serialization.workspaces.load(ejemplo.state, ws);
    expect(ws.getAllBlocks(false).length).toBe(57);
  });

  it('el sketch incluye el shield y los cuatro motores', () => {
    Blockly.serialization.workspaces.load(ejemplo.state, ws);
    const sketch = generateArduinoCode(ws);

    expect(sketch).toContain('#include "AFMotor_R4.h"');
    for (const [nombre, canal] of [
      ['motorDerecho', 1], ['motorIzquierdo', 2],
      ['motorIzquierdo1', 3], ['motorDerecho1', 4],
    ]) {
      expect(sketch).toContain(`AF_DCMotor ${nombre}(${canal});`);
    }
    expect(sketch).toContain('motorDerecho.setSpeed(180);');
    expect(sketch).toContain('motorDerecho.setSpeed(170);');
  });

  it('el ultrasónico queda en los pines de A1 y A0', () => {
    Blockly.serialization.workspaces.load(ejemplo.state, ws);
    const sketch = generateArduinoCode(ws);

    expect(sketch).toContain('pinMode(15, OUTPUT);');
    expect(sketch).toContain('pinMode(14, INPUT);');
    expect(sketch).toContain('digitalWrite(15, HIGH);');
    expect(sketch).toContain('pulseIn(14, HIGH)');
  });

  it('esquiva por debajo de 20 cm y avanza si el camino está libre', () => {
    Blockly.serialization.workspaces.load(ejemplo.state, ws);
    const sketch = generateArduinoCode(ws);

    expect(sketch).toContain('long distancia = us_read();');
    expect(sketch).toContain('if (distancia <= 20) {');
    expect(sketch).toContain('motorDerecho.run(BACKWARD);');
    expect(sketch).toContain('motorDerecho.run(RELEASE);');
    expect(sketch).toContain('delay(300);');
    expect(sketch).toContain('delay(400);');
  });
});
