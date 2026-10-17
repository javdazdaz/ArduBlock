import { beforeEach, describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { cppGenerator, generateArduinoCode } from '../frontend/js/generator.js';

/**
 * Contenido del código que producen las variantes _advanced y los nombres
 * anteriores al split basic/advanced. El barrido de block-toolbox-coverage
 * comprueba que ningún bloque lanza; aquí se fija qué emite cada familia.
 */

function sketchWith(type, configure = () => {}) {
  const ws = new Blockly.Workspace();
  const loop = ws.newBlock('arduino_loop');
  const block = ws.newBlock(type);
  configure(block, ws);
  if (block.previousConnection) {
    loop.getInput('BODY').connection.connect(block.previousConnection);
  }
  const sketch = generateArduinoCode(ws);
  ws.dispose();
  return sketch;
}

function value(ws, parent, inputName, n) {
  const num = ws.newBlock('math_number');
  num.setFieldValue(String(n), 'NUM');
  parent.getInput(inputName).connection.connect(num.outputConnection);
}

describe('variantes _advanced: instancia y biblioteca', () => {
  beforeEach(() => {
    cppGenerator._procedureDefs = [];
  });

  it('servo_create_advanced declara la instancia y el include', () => {
    const sketch = sketchWith('servo_create_advanced');

    expect(sketch).toContain('#include <Servo.h>');
    expect(sketch).toMatch(/Servo\s+\w+;/);
    expect(sketch).toContain('.attach(');
  });

  it('dht_create_advanced declara la instancia y el include', () => {
    const sketch = sketchWith('dht_create_advanced');

    expect(sketch).toContain('#include <DHT.h>');
    expect(sketch).toMatch(/DHT\s+\w+\(\d+, DHT\d+\);/);
    expect(sketch).toContain('.begin();');
  });

  it('lcd_create_advanced declara la instancia y el include', () => {
    const sketch = sketchWith('lcd_create_advanced');

    expect(sketch).toContain('#include <LiquidCrystal.h>');
    expect(sketch).toMatch(/LiquidCrystal\s+\w+\(/);
    expect(sketch).toContain('.begin(16, 2);');
  });

  it('lcd_i2c_create_advanced declara la instancia y el include', () => {
    const sketch = sketchWith('lcd_i2c_create_advanced');

    expect(sketch).toContain('#include <LiquidCrystal_I2C.h>');
    expect(sketch).toMatch(/LiquidCrystal_I2C\s+\w+\(/);
    expect(sketch).toContain('.init();');
  });

  it('stepper_create_advanced declara la instancia y el include', () => {
    const sketch = sketchWith('stepper_create_advanced');

    expect(sketch).toContain('#include <Stepper.h>');
    expect(sketch).toMatch(/Stepper\s+\w+\(/);
  });

  it('ultrasonic_create_advanced emite la función de lectura', () => {
    const sketch = sketchWith('ultrasonic_create_advanced');

    expect(sketch).toContain('float us_read()');
    expect(sketch).toContain('pinMode(');
  });

  it('la versión básica sigue declarando igual', () => {
    const sketch = sketchWith('servo_create');

    expect(sketch).toContain('#include <Servo.h>');
    expect(sketch).toMatch(/Servo\s+\w+;/);
  });
});

describe('bloques con nombre anterior al split', () => {
  it('tone_duration emite pin, frecuencia y duración sin null', () => {
    const sketch = sketchWith('tone_duration');

    expect(sketch).not.toContain('null');
    expect(sketch).toMatch(/tone\(\d+, \d+, \d+\);/);
  });

  it('tone_output sigue emitiendo un tono simple', () => {
    expect(sketchWith('tone_output')).toMatch(/tone\(\d+, \d+\);/);
  });

  it('no_tone_output detiene el tono en el pin del campo', () => {
    expect(sketchWith('no_tone_output')).toMatch(/noTone\(\d+\);/);
  });

  it('pulse_in devuelve la lectura con pin, valor y tiempo de espera', () => {
    // Bloque de valor: se genera con blockToCode, no dentro de un sketch.
    const ws = new Blockly.Workspace();
    const block = ws.newBlock('pulse_in');
    const out = cppGenerator.blockToCode(block);
    const code = Array.isArray(out) ? out[0] : out;

    expect(code).toMatch(/pulseIn\(\d+, (HIGH|LOW), \d+\)/);
    ws.dispose();
  });

  it('attach_interrupt declara la ISR y engancha la interrupción', () => {
    const sketch = sketchWith('attach_interrupt');

    expect(sketch).toContain('void isr_pin');
    expect(sketch).toContain('attachInterrupt(digitalPinToInterrupt(');
  });
});

describe('map_value sin entrada conectada', () => {
  it('usa 0 en lugar de dejar el argumento vacío', () => {
    const ws = new Blockly.Workspace();
    const block = ws.newBlock('map_value');
    const out = cppGenerator.blockToCode(block);
    const code = Array.isArray(out) ? out[0] : out;

    expect(code).toBe('map(0, 0, 1023, 0, 255)');
    ws.dispose();
  });

  it('usa el valor conectado cuando existe', () => {
    const ws = new Blockly.Workspace();
    const block = ws.newBlock('map_value_advanced');
    value(ws, block, 'VALUE', 42);
    const out = cppGenerator.blockToCode(block);
    const code = Array.isArray(out) ? out[0] : out;

    expect(code).toContain('map(42,');
    ws.dispose();
  });
});
