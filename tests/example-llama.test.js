import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { generateArduinoCode } from '../frontend/js/generator.js';
import { webExamples } from '../frontend/js/examples-web.js';

/**
 * El ejemplo SensorLlamaWebSocket carga con su página y produce un sketch que
 * compila en el R4: el sensor en un pin de entrada y el estado enviado por
 * WebSocket en el mismo puerto que sirve la página.
 */

const PAGINA = '<!doctype html><html><head><title>PRUEBA LLAMA</title></head><body></body></html>';

const ejemplo = webExamples.find(e => e.name === 'SensorLlamaWebSocket');

describe('ejemplo SensorLlamaWebSocket', () => {
  let ws;

  beforeEach(() => {
    window._tabManager = {
      getTabs: () => [{ filename: 'sensor-llama.html', content: PAGINA }]
    };
    ws = new Blockly.Workspace();
  });

  afterEach(() => {
    delete window._tabManager;
    ws.dispose();
  });

  it('el ejemplo declara la página, la placa y el comentario', () => {
    expect(ejemplo).toBeTruthy();
    expect(ejemplo.recursoHtml).toBe('sensor-llama.html');
    expect(ejemplo.board).toBe('arduino:renesas_uno:unor4wifi');
    expect(ejemplo.category).toBe('web');
    expect(ejemplo.comment.es).toContain('SensorLlamaWebSocket');
    expect(ejemplo.comment.en).toContain('SensorLlamaWebSocket');
  });

  it('el estado carga en Blockly sin lanzar', () => {
    Blockly.serialization.workspaces.load(ejemplo.state, ws);
    expect(ws.getAllBlocks(false).length).toBe(19);
  });

  it('el sketch sirve la página y configura el pin del sensor', () => {
    Blockly.serialization.workspaces.load(ejemplo.state, ws);
    const sketch = generateArduinoCode(ws);

    expect(sketch).toContain('PRUEBA LLAMA');
    expect(sketch).toContain('WiFi.beginAP("MiArduino", "12345678");');
    expect(sketch).toContain('WiFiServer server(80);');
    expect(sketch).toContain('pinMode(2, INPUT);');
    // Un solo servidor: el WebSocket entra por el puerto de la página.
    expect(sketch).not.toContain('_wsServer');
  });

  it('el loop envía el estado del sensor y espera 250 ms', () => {
    Blockly.serialization.workspaces.load(ejemplo.state, ws);
    const sketch = generateArduinoCode(ws);

    expect(sketch).toContain('if (digitalRead(2) == 1) {');
    expect(sketch).toContain('_wsSend(String("llama=0"));');
    expect(sketch).toContain('_wsSend(String("llama=1"));');
    expect(sketch).toContain('delay(250);');
  });

  it('el pinMode queda dentro de setup', () => {
    Blockly.serialization.workspaces.load(ejemplo.state, ws);
    const sketch = generateArduinoCode(ws);

    const setup = sketch.indexOf('void setup()');
    const loop = sketch.indexOf('void loop()');
    const pinMode = sketch.indexOf('pinMode(2, INPUT);');
    expect(pinMode).toBeGreaterThan(setup);
    expect(pinMode).toBeLessThan(loop);
  });
});
