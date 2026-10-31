import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { generateArduinoCode } from '../frontend/js/generator.js';
import { webExamples, cargarTabRecursoHtml } from '../frontend/js/examples-web.js';

/**
 * El ejemplo LucesWebSocket tiene que cargar todo: bloques, la página del panel
 * de sitios web y la placa. Se prueba deserializando el estado real en un
 * workspace sin render y generando el sketch con la página como tab, que es lo
 * que hace el cargador de ejemplos.
 */

const PAGINA = '<!doctype html><html><head><title>PRUEBA PAGINA</title></head><body></body></html>';

const ejemplo = webExamples.find(e => e.name === 'LucesWebSocket');

describe('ejemplo LucesWebSocket', () => {
  let ws;

  beforeEach(() => {
    window._tabManager = {
      getTabs: () => [{ filename: 'luces.html', content: PAGINA }]
    };
    ws = new Blockly.Workspace();
  });

  afterEach(() => {
    delete window._tabManager;
    ws.dispose();
  });

  it('el ejemplo declara la página, la placa y el comentario', () => {
    expect(ejemplo).toBeTruthy();
    expect(ejemplo.recursoHtml).toBe('luces.html');
    expect(ejemplo.board).toBe('arduino:renesas_uno:unor4wifi');
    expect(ejemplo.category).toBe('web');
    expect(ejemplo.state).toBeTruthy();
    expect(ejemplo.comment.es).toContain('LucesWebSocket');
    expect(ejemplo.comment.en).toContain('LucesWebSocket');
  });

  it('el estado carga en Blockly sin lanzar', () => {
    Blockly.serialization.workspaces.load(ejemplo.state, ws);
    expect(ws.getAllBlocks(false).length).toBe(13);
  });

  it('el sketch trae la página, los puertos y las tres salidas', () => {
    Blockly.serialization.workspaces.load(ejemplo.state, ws);
    const sketch = generateArduinoCode(ws);

    expect(sketch).toContain('#include <WiFiS3.h>');
    expect(sketch).toContain('WiFi.beginAP("MiArduino", "12345678");');
    expect(sketch).toContain('WiFiServer server(80);');
    expect(sketch).toContain('WiFiServer _wsServer(81);');
    expect(sketch).toContain('server.begin();');
    expect(sketch).toContain('_wsServer.begin();');
    expect(sketch).toContain('_Salida _salidas[3]');
    expect(sketch).toContain('{ "luz1", 4, false, false }');
    expect(sketch).toContain('{ "rele", 7, true, false }');
    expect(sketch).toContain('PRUEBA PAGINA');
    expect(sketch).toContain('_salidasAtenderMensaje(_wsMessage);');
    expect(sketch).toContain('_wsSend(String(_salidasEstadoTexto()));');
  });

  it('la página va antes de setup y el WebSocket antes de las salidas', () => {
    Blockly.serialization.workspaces.load(ejemplo.state, ws);
    const sketch = generateArduinoCode(ws);

    expect(sketch.indexOf('PRUEBA PAGINA')).toBeLessThan(sketch.indexOf('void setup()'));
    expect(sketch.indexOf('_wsMessage')).toBeLessThan(sketch.indexOf('_salidasAtenderMensaje(const String& msg)'));
  });

  it('el handshake acumula las cabeceras y cierra el socket si falla', () => {
    Blockly.serialization.workspaces.load(ejemplo.state, ws);
    const sketch = generateArduinoCode(ws);

    // Acumular hasta la línea en blanco: el pedido puede llegar en dos trozos.
    expect(sketch).toContain('req += (char)client.read();');
    expect(sketch).toContain(String.raw`if (req.indexOf("\r\n\r\n") >= 0) break;`);
    // Un handshake fallido cierra su socket en vez de dejarlo tomado.
    expect(sketch).toContain('if (!_wsConnected) _wsClient.stop();');
    expect(sketch).toContain('HTTP/1.1 400 Bad Request');
  });

  it('atiende el WebSocket antes que el pedido HTTP', () => {
    Blockly.serialization.workspaces.load(ejemplo.state, ws);
    const sketch = generateArduinoCode(ws);

    const wsAccept = sketch.indexOf('_wsServer.available()');
    const httpAccept = sketch.indexOf('WiFiClient client = server.available();');

    expect(wsAccept).toBeGreaterThan(0);
    expect(wsAccept).toBeLessThan(httpAccept);
  });

  it('no vuelve a aceptar la misma conexión mientras está conectado', () => {
    Blockly.serialization.workspaces.load(ejemplo.state, ws);
    const sketch = generateArduinoCode(ws);

    // available() entrega otra vez el mismo socket cuando llegan datos:
    // aceptarlo y cerrar el anterior corta la sesión viva.
    expect(sketch).toContain('if (_newWs && !_wsConnected)');
    expect(sketch).not.toContain('if (_wsConnected) _wsClient.stop();');
  });

  it('no sirve la página cuando el pedido no es HTTP', () => {
    Blockly.serialization.workspaces.load(ejemplo.state, ws);
    const sketch = generateArduinoCode(ws);

    expect(sketch).toContain('if (path.length() > 0) {');
    expect(sketch).toContain('metodo != "GET"');
  });

  it('el favicon no se sirve como página', () => {
    Blockly.serialization.workspaces.load(ejemplo.state, ws);
    const sketch = generateArduinoCode(ws);

    expect(sketch).toContain('if (path == "/favicon.ico")');
    expect(sketch).toContain('HTTP/1.1 204 No Content');
  });
});

describe('cargarTabRecursoHtml', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('devuelve el tab con el contenido del preset', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ path: 'luces.html', name: 'luces', content: PAGINA })
    })));

    const tabs = await cargarTabRecursoHtml('luces.html');

    expect(tabs).toHaveLength(1);
    expect(tabs[0].filename).toBe('luces.html');
    expect(tabs[0].content).toBe(PAGINA);
  });

  it('lanza cuando el preset no existe', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));

    await expect(cargarTabRecursoHtml('no-existe.html')).rejects.toThrow();
  });
});
