import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import * as Blockly from 'blockly';
import { buildToolboxForBoard } from '../frontend/js/blocks.js';
import '../frontend/js/blocks.js';
import { cppGenerator, generateArduinoCode } from '../frontend/js/generator.js';

/**
 * Bloques del sensor de obstáculos HW-201: un tipo por caso, pin por entrada y
 * polaridad elegible. El pinMode lo inyecta el generador, no el bloque.
 */

function crear(ws, type, { pin, polaridad } = {}) {
  const b = ws.newBlock(type);
  if (pin !== undefined) {
    const num = ws.newBlock('math_number');
    num.setFieldValue(String(pin), 'NUM');
    b.getInput('PIN').connection.connect(num.outputConnection);
  }
  if (polaridad) b.setFieldValue(polaridad, 'POLARIDAD');
  return b;
}

function sketchConSentencia(type, opciones) {
  const ws = new Blockly.Workspace();
  try {
    const loop = ws.newBlock('arduino_loop');
    const b = crear(ws, type, opciones);
    loop.getInput('BODY').connection.connect(b.previousConnection);
    return generateArduinoCode(ws);
  } finally {
    ws.dispose();
  }
}

describe('bloques HW-201', () => {
  it('detecta compara contra el nivel de detección', () => {
    const ws = new Blockly.Workspace();
    const [code] = cppGenerator.blockToCode(crear(ws, 'hw201_detecta', { pin: 5 }));
    ws.dispose();
    expect(code).toBe('digitalRead(5) == LOW');
  });

  it('libre niega el nivel de detección', () => {
    const ws = new Blockly.Workspace();
    const [code] = cppGenerator.blockToCode(
      crear(ws, 'hw201_libre', { pin: 5, polaridad: 'HIGH' })
    );
    ws.dispose();
    expect(code).toBe('digitalRead(5) != HIGH');
  });

  it('sin número conectado el pin por defecto es 2', () => {
    const ws = new Blockly.Workspace();
    const [code] = cppGenerator.blockToCode(crear(ws, 'hw201_detecta'));
    ws.dispose();
    expect(code).toBe('digitalRead(2) == LOW');
  });

  it('esperar detección emite el bucle con la espera de 10 ms', () => {
    const sketch = sketchConSentencia('hw201_esperar_detecta', { pin: 7 });
    expect(sketch).toContain('while (digitalRead(7) != LOW) {');
    expect(sketch).toContain('delay(10);');
  });

  it('esperar paso libre usa el nivel elegido', () => {
    const sketch = sketchConSentencia('hw201_esperar_libre', { pin: 7, polaridad: 'HIGH' });
    expect(sketch).toContain('while (digitalRead(7) == HIGH) {');
  });

  it('el pinMode de cada pin usado va dentro de setup', () => {
    const sketch = sketchConSentencia('hw201_esperar_detecta', { pin: 7 });
    const setup = sketch.indexOf('void setup()');
    const loop = sketch.indexOf('void loop()');
    const pinMode = sketch.indexOf('pinMode(7, INPUT);');
    expect(pinMode).toBeGreaterThan(setup);
    expect(pinMode).toBeLessThan(loop);
  });

  it('dos bloques sobre el mismo pin configuran el pin una vez', () => {
    const ws = new Blockly.Workspace();
    try {
      const loop = ws.newBlock('arduino_loop');
      const a = crear(ws, 'hw201_esperar_detecta', { pin: 9 });
      const b = crear(ws, 'hw201_esperar_libre', { pin: 9 });
      loop.getInput('BODY').connection.connect(a.previousConnection);
      a.nextConnection.connect(b.previousConnection);
      const sketch = generateArduinoCode(ws);
      expect(sketch.match(/pinMode\(9, INPUT\);/g)).toHaveLength(1);
    } finally {
      ws.dispose();
    }
  });

  it('un estado guardado con los bloques vuelve a cargar', () => {
    const ws = new Blockly.Workspace();
    const loop = ws.newBlock('arduino_loop');
    const primero = crear(ws, 'hw201_esperar_detecta', { pin: 4 });
    const segundo = crear(ws, 'hw201_esperar_libre', { pin: 4 });
    loop.getInput('BODY').connection.connect(primero.previousConnection);
    primero.nextConnection.connect(segundo.previousConnection);
    const estado = Blockly.serialization.workspaces.save(ws);
    ws.dispose();

    const otra = new Blockly.Workspace();
    try {
      Blockly.serialization.workspaces.load(estado, otra);
      expect(otra.getAllBlocks(false).some(b => b.type === 'hw201_esperar_detecta')).toBe(true);
      expect(otra.getAllBlocks(false).some(b => b.type === 'hw201_esperar_libre')).toBe(true);
    } finally {
      otra.dispose();
    }
  });
});

function tiposDelToolbox(level) {
  const toolbox = buildToolboxForBoard('arduino:avr:uno', level);
  const tipos = [];
  const recorrer = (nodos) => {
    for (const nodo of nodos || []) {
      if (nodo.type) tipos.push(nodo.type);
      recorrer(nodo.contents);
    }
  };
  recorrer(toolbox.contents);
  return tipos;
}

describe('toolbox: los bloques HW-201 son de nivel 3', () => {
  it('aparecen en nivel 3 y no en el 2', () => {
    const tres = tiposDelToolbox(3);
    const dos = tiposDelToolbox(2);
    for (const tipo of ['hw201_detecta', 'hw201_libre', 'hw201_esperar_detecta', 'hw201_esperar_libre']) {
      expect(tres).toContain(tipo);
      expect(dos).not.toContain(tipo);
    }
  });
});

it.runIf(Boolean(process.env.HW201_DUMP))('escribe el sketch de prueba', () => {
  const base = process.env.HW201_DUMP_DIR || '/tmp/ardublock-hw201';
  const ws = new Blockly.Workspace();
  try {
    const loop = ws.newBlock('arduino_loop');
    const detecta = crear(ws, 'hw201_detecta', { pin: 2 });
    const digitalWrite = ws.newBlock('digital_write_basic');
    digitalWrite.setFieldValue('13', 'PIN');
    digitalWrite.setFieldValue('HIGH', 'VALUE');
    const si = ws.newBlock('controls_if');
    si.getInput('IF0').connection.connect(detecta.outputConnection);
    si.getInput('DO0').connection.connect(digitalWrite.previousConnection);
    loop.getInput('BODY').connection.connect(si.previousConnection);

    const sketch = generateArduinoCode(ws);
    mkdirSync(base + '/HW201', { recursive: true });
    writeFileSync(base + '/HW201/HW201.ino', sketch);
    // eslint-disable-next-line no-console
    console.log(sketch);
  } finally {
    ws.dispose();
  }
});
