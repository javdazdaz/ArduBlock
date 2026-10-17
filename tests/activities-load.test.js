import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { generateArduinoCode } from '../frontend/js/generator.js';

/**
 * Las diez actividades de Fundación BH traen un bloque library_include dentro
 * de setup y bloques digital_write_basic. Con un tipo desconocido o un bloque
 * sin conexiones, Blockly aborta la carga y el editor muestra
 * "Error al cargar actividad".
 */

const modulos = import.meta.glob('../frontend/activities/*.js');

async function cargarActividades() {
  const actividades = [];
  for (const ruta of Object.keys(modulos).sort()) {
    const mod = await modulos[ruta]();
    actividades.push(mod.activity);
  }
  return actividades;
}

describe('actividades: deserialización', () => {
  it('las diez cargan en un workspace sin lanzar', async () => {
    const actividades = await cargarActividades();
    expect(actividades).toHaveLength(10);

    const fallos = [];
    for (const actividad of actividades) {
      const ws = new Blockly.Workspace();
      try {
        Blockly.serialization.workspaces.load(actividad.state, ws);
        if (ws.getAllBlocks(false).length === 0) fallos.push(`${actividad.name}: sin bloques`);
      } catch (e) {
        fallos.push(`${actividad.name}: ${e.message}`);
      } finally {
        ws.dispose();
      }
    }
    expect(fallos).toEqual([]);
  });

  it('las diez generan un sketch con setup y loop', async () => {
    const actividades = await cargarActividades();
    const fallos = [];
    for (const actividad of actividades) {
      const ws = new Blockly.Workspace();
      try {
        Blockly.serialization.workspaces.load(actividad.state, ws);
        const sketch = generateArduinoCode(ws);
        if (!sketch.includes('void setup()') || !sketch.includes('void loop()')) {
          fallos.push(`${actividad.name}: sketch incompleto`);
        }
      } catch (e) {
        fallos.push(`${actividad.name}: ${e.message}`);
      } finally {
        ws.dispose();
      }
    }
    expect(fallos).toEqual([]);
  });

  it('conserva la metadata de protección de cada actividad', async () => {
    const actividades = await cargarActividades();
    const conMeta = actividades.filter(a => a.activityMeta);
    expect(conMeta.length).toBeGreaterThan(0);
    for (const actividad of conMeta) {
      expect(actividad.activityMeta.protected ?? actividad.activityMeta.placeholders).toBeTruthy();
    }
  });
});

describe('regresión: bloques de librería en la pila', () => {
  it('library_include acepta un bloque siguiente dentro de setup', () => {
    const ws = new Blockly.Workspace();
    try {
      const setup = ws.newBlock('arduino_setup');
      const include = ws.newBlock('library_include');
      const write = ws.newBlock('digital_write_basic');
      include.setFieldValue('AFMotor_R4.h', 'LIB');

      expect(include.previousConnection).toBeTruthy();
      expect(include.nextConnection).toBeTruthy();

      setup.getInput('BODY').connection.connect(include.previousConnection);
      include.nextConnection.connect(write.previousConnection);

      expect(ws.getAllBlocks(false)).toHaveLength(3);
    } finally {
      ws.dispose();
    }
  });

  it('el alias digital_write genera el mismo código que su variante básica', () => {
    const ws = new Blockly.Workspace();
    try {
      const setup = ws.newBlock('arduino_setup');
      const write = ws.newBlock('digital_write');
      write.setFieldValue('13', 'PIN');
      write.setFieldValue('HIGH', 'VALUE');
      setup.getInput('BODY').connection.connect(write.previousConnection);

      const sketch = generateArduinoCode(ws);
      expect(sketch).toContain('digitalWrite(13, HIGH);');
    } finally {
      ws.dispose();
    }
  });
});

describe('presets web: deserialización', () => {
  it('los cuatro presets cargan y generan sketch', async () => {
    const { webPresetProjects } = await import('../frontend/js/web-preset-projects.js');
    const rutas = Object.keys(webPresetProjects);
    expect(rutas).toHaveLength(4);

    const fallos = [];
    for (const ruta of rutas) {
      const estado = webPresetProjects[ruta]();
      const ws = new Blockly.Workspace();
      try {
        Blockly.serialization.workspaces.load(estado, ws);
        const sketch = generateArduinoCode(ws);
        if (!sketch.includes('void setup()')) fallos.push(`${ruta}: sin setup`);
      } catch (e) {
        fallos.push(`${ruta}: ${e.message}`);
      } finally {
        ws.dispose();
      }
    }
    expect(fallos).toEqual([]);
  });
});
