import { beforeEach, describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { cppGenerator, generateArduinoCode } from '../frontend/js/generator.js';
import { validateWorkspace } from '../frontend/js/validator.js';

/**
 * Salidas nombradas: la tabla del sketch reemplaza las cadenas de
 * `if (luz == true) digitalWrite(...)`. Se prueba contra Blockly real en un
 * workspace sin render, incluida la inyección de `_salidasIniciar()` en setup.
 */

function code(block) {
  const out = cppGenerator.blockToCode(block);
  return Array.isArray(out) ? out[0] : out;
}

function declarar(ws, nombre, pin, activo) {
  const b = ws.newBlock('salida_declarar');
  b.setFieldValue(nombre, 'NAME');
  b.setFieldValue(pin, 'PIN');
  if (activo) b.setFieldValue(activo, 'ACTIVO');
  return b;
}

function encadenar(padre, bloques) {
  let previo = null;
  for (const b of bloques) {
    if (previo) previo.nextConnection.connect(b.previousConnection);
    else padre.getInput('BODY').connection.connect(b.previousConnection);
    previo = b;
  }
}

describe('bloques de salidas nombradas', () => {
  let ws;

  beforeEach(() => {
    ws = new Blockly.Workspace();
  });

  it('declarar no emite sentencia', () => {
    const b = declarar(ws, 'luz1', '4');
    expect(code(b)).toBe('');
  });

  it('arma la tabla con nombre, pin y polaridad', () => {
    const setup = ws.newBlock('arduino_setup');
    const fijar = ws.newBlock('salida_fijar');
    fijar.setFieldValue('luz1', 'NAME');
    encadenar(setup, [
      declarar(ws, 'luz1', '4'),
      declarar(ws, 'bomba', '7', 'LOW'),
      fijar
    ]);

    const sketch = generateArduinoCode(ws);

    expect(sketch).toContain('_Salida _salidas[2] = {');
    expect(sketch).toContain('{ "luz1", 4, false, false }');
    expect(sketch).toContain('{ "bomba", 7, true, false }');
    expect(sketch).toContain('const uint8_t _N_SALIDAS = 2;');
  });

  it('configura los pines al inicio de setup', () => {
    const setup = ws.newBlock('arduino_setup');
    encadenar(setup, [declarar(ws, 'luz1', '4')]);

    const sketch = generateArduinoCode(ws);
    const cuerpo = sketch.slice(sketch.indexOf('void setup()'));

    expect(cuerpo.indexOf('_salidasIniciar();')).toBeGreaterThan(0);
    expect(cuerpo.indexOf('_salidasIniciar();')).toBeLessThan(cuerpo.indexOf('void loop()'));
    expect(sketch).toContain('pinMode(_salidas[i].pin, OUTPUT);');
  });

  it('poner salida emite la llamada por nombre', () => {
    const b = ws.newBlock('salida_fijar');
    b.setFieldValue('bomba', 'NAME');
    b.setFieldValue('1', 'ESTADO');
    expect(code(b)).toBe('_salidaFijar("bomba", true);\n');

    b.setFieldValue('0', 'ESTADO');
    expect(code(b)).toBe('_salidaFijar("bomba", false);\n');
  });

  it('cambiar de estado emite la llamada', () => {
    const b = ws.newBlock('salida_alternar');
    b.setFieldValue('luz1', 'NAME');
    expect(code(b)).toBe('_salidaAlternar("luz1");\n');
  });

  it('estado de la salida devuelve una expresión booleana', () => {
    const b = ws.newBlock('salida_estado');
    b.setFieldValue('luz1', 'NAME');
    expect(code(b)).toBe('_salidaEstado("luz1")');
  });

  it('sin declaraciones deja la tabla vacía y no toca setup', () => {
    const setup = ws.newBlock('arduino_setup');
    encadenar(setup, [ws.newBlock('salida_fijar')]);

    const sketch = generateArduinoCode(ws);

    expect(sketch).toContain('const uint8_t _N_SALIDAS = 0;');
    expect(sketch).not.toContain('_salidasIniciar();');
  });

  it('un nombre repetido deja una sola fila', () => {
    const setup = ws.newBlock('arduino_setup');
    encadenar(setup, [
      declarar(ws, 'luz1', '4'),
      declarar(ws, 'luz1', '5')
    ]);

    const sketch = generateArduinoCode(ws);

    expect(sketch).toContain('_Salida _salidas[1] = {');
    expect(sketch).toContain('{ "luz1", 4, false, false }');
    expect(sketch).not.toContain('{ "luz1", 5, false, false }');
  });

  it('escapa las comillas del nombre en el literal C++', () => {
    const setup = ws.newBlock('arduino_setup');
    encadenar(setup, [declarar(ws, 'luz "a"', '4')]);

    expect(generateArduinoCode(ws)).toContain('{ "luz \\"a\\"", 4, false, false }');
  });
});

describe('validador de salidas nombradas', () => {
  let ws;

  beforeEach(() => {
    ws = new Blockly.Workspace();
  });

  function avisos() {
    return validateWorkspace(ws).filter(w => w.type.startsWith('salida_'));
  }

  it('avisa cuando se usa una salida que nadie declaró', () => {
    const setup = ws.newBlock('arduino_setup');
    const fijar = ws.newBlock('salida_fijar');
    fijar.setFieldValue('luz9', 'NAME');
    encadenar(setup, [declarar(ws, 'luz1', '4'), fijar]);

    const aviso = avisos().find(w => w.type === 'salida_no_declarada');

    expect(aviso).toBeTruthy();
    expect(aviso.severity).toBe('warning');
  });

  it('no avisa cuando la salida está declarada', () => {
    const setup = ws.newBlock('arduino_setup');
    const fijar = ws.newBlock('salida_fijar');
    fijar.setFieldValue('luz1', 'NAME');
    encadenar(setup, [declarar(ws, 'luz1', '4'), fijar]);

    expect(avisos()).toHaveLength(0);
  });

  it('avisa cuando el mismo nombre se declara dos veces', () => {
    const setup = ws.newBlock('arduino_setup');
    encadenar(setup, [
      declarar(ws, 'luz1', '4'),
      declarar(ws, 'luz1', '5')
    ]);

    expect(avisos().some(w => w.type === 'salida_duplicada')).toBe(true);
  });

  it('no reclama pinMode para el pin de una salida declarada', () => {
    const setup = ws.newBlock('arduino_setup');
    const escribir = ws.newBlock('digital_write_basic');
    escribir.setFieldValue('4', 'PIN');
    encadenar(setup, [declarar(ws, 'luz1', '4'), escribir]);

    const avisosPin = validateWorkspace(ws).filter(w => w.type === 'pin_not_configured');

    expect(avisosPin).toHaveLength(0);
  });
});

describe('salidas por WebSocket', () => {
  let ws;

  beforeEach(() => {
    ws = new Blockly.Workspace();
  });

  it('atender el mensaje emite la llamada y su helper', () => {
    const setup = ws.newBlock('arduino_setup');
    const loop = ws.newBlock('arduino_loop');
    encadenar(setup, [declarar(ws, 'luz1', '4')]);
    encadenar(loop, [ws.newBlock('salida_atender_mensaje')]);

    const sketch = generateArduinoCode(ws);

    expect(sketch).toContain('_salidasAtenderMensaje(_wsMessage);');
    expect(sketch).toContain('void _salidasAtenderMensaje(const String& msg)');
  });

  it('sin el bloque no emite el helper del mensaje', () => {
    const setup = ws.newBlock('arduino_setup');
    encadenar(setup, [declarar(ws, 'luz1', '4')]);

    const sketch = generateArduinoCode(ws);

    expect(sketch).not.toContain('_salidasAtenderMensaje');
    expect(sketch).not.toContain('_salidasEstadoTexto');
  });

  it('estado de las salidas devuelve texto y emite su helper', () => {
    expect(code(ws.newBlock('salidas_estado_texto'))).toBe('_salidasEstadoTexto()');

    const setup = ws.newBlock('arduino_setup');
    const enviar = ws.newBlock('websocket_send');
    enviar.getInput('VALUE').connection
      .connect(ws.newBlock('salidas_estado_texto').outputConnection);
    encadenar(setup, [declarar(ws, 'luz1', '4'), enviar]);

    const sketch = generateArduinoCode(ws);

    expect(sketch).toContain('String _salidasEstadoTexto()');
    expect(sketch).toContain('_wsSend(String(_salidasEstadoTexto()));');
  });

  it('avisa cuando atiende mensajes sin servidor WebSocket', () => {
    const loop = ws.newBlock('arduino_loop');
    encadenar(loop, [ws.newBlock('salida_atender_mensaje')]);

    const aviso = validateWorkspace(ws).find(w => w.type === 'salida_sin_websocket');

    expect(aviso).toBeTruthy();
    expect(aviso.severity).toBe('error');
  });

  it('no avisa si el proyecto inicia el WebSocket', () => {
    const setup = ws.newBlock('arduino_setup');
    const loop = ws.newBlock('arduino_loop');
    encadenar(setup, [declarar(ws, 'luz1', '4'), ws.newBlock('websocket_begin')]);
    encadenar(loop, [ws.newBlock('salida_atender_mensaje')]);

    expect(validateWorkspace(ws).some(w => w.type === 'salida_sin_websocket')).toBe(false);
  });
});
