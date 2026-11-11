import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { generateArduinoCode } from '../frontend/js/generator.js';
import { actividadExamples } from '../frontend/js/examples-actividades.js';

function sketchDe(estado) {
  const ws = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(estado, ws);
    return generateArduinoCode(ws);
  } finally {
    ws.dispose();
  }
}

describe('ejemplos de actividades: usar', () => {
  const porNombre = Object.fromEntries(actividadExamples.map(e => [e.name, e]));

  it('la sección declara los dos programas en la categoría usar', () => {
    expect(actividadExamples).toHaveLength(2);
    expect(actividadExamples.map(e => e.source)).toEqual(['actividades', 'actividades']);
    expect(actividadExamples.map(e => e.category)).toEqual(['usar', 'usar']);
  });

  it('el semáforo enciende los dos LED por turnos', () => {
    const sketch = sketchDe(porNombre['Semáforo'].state);
    expect(sketch).toContain('void setup()');
    expect(sketch).toContain('pinMode(6, OUTPUT);');
    expect(sketch).toContain('pinMode(3, OUTPUT);');
    expect(sketch).toContain('Serial.begin(9600);');
    expect(sketch).toContain('digitalWrite(6, HIGH);');
    expect(sketch).toContain('digitalWrite(3, HIGH);');
    expect(sketch).toContain('Serial.println("LED 6 encendido");');
    expect(sketch).toContain('Serial.println("LED 3 encendido");');
    expect(sketch.match(/delay\(1000\);/g)).toHaveLength(2);
  });

  it('el pulsador declara sus globales fuera de setup y cuenta por flanco', () => {
    const sketch = sketchDe(porNombre['Pulsador'].state);
    const corte = sketch.indexOf('void setup()');
    expect(corte).toBeGreaterThan(0);
    expect(sketch.slice(0, corte)).toContain('int contador = 0;');
    expect(sketch.slice(0, corte)).toContain('int anterior = 0;');
    expect(sketch).toContain('pinMode(A1, INPUT);');
    expect(sketch).toContain('int estado = digitalRead(A1);');
    expect(sketch).toContain('if (estado == true && anterior == false) {');
    expect(sketch).toContain('contador = contador + 1;');
    expect(sketch).toContain('if (contador % 2 == 0) {');
    expect(sketch).toContain('anterior = estado;');
  });
});
