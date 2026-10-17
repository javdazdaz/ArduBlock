import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';

/**
 * Barrido del toolbox completo: todo bloque que el proyecto define debe
 * producir código sin lanzar. Un tipo sin generador hace que Blockly lance
 * "does not know how to generate code", y updateCode lo muestra como
 * "// Error: ..." en el panel del sketch.
 *
 * Los built-ins que trae Blockly se descartan para quedarse solo con los
 * bloques propios.
 */
const builtinTypes = new Set(Object.keys(Blockly.Blocks));

await import('../frontend/js/blocks.js');
const { cppGenerator, generateArduinoCode } = await import('../frontend/js/generator.js');

const projectTypes = Object.keys(Blockly.Blocks).filter(t => !builtinTypes.has(t)).sort();

function generate(type) {
  const ws = new Blockly.Workspace();
  const block = ws.newBlock(type);
  try {
    // Los bloques de sentencia necesitan el estado que inicializa
    // generateArduinoCode (listas de instancias, banderas de librería).
    // Solo los bloques con salida se generan sueltos con blockToCode.
    if (!block.outputConnection) {
      if (block.previousConnection) {
        const loop = ws.newBlock('arduino_loop');
        loop.getInput('BODY').connection.connect(block.previousConnection);
      }
      return { out: generateArduinoCode(ws) };
    }
    const out = cppGenerator.blockToCode(block);
    return { out: Array.isArray(out) ? out[0] : out };
  } catch (e) {
    return { error: String(e.message || e) };
  } finally {
    ws.dispose();
  }
}

describe('toolbox completo: cada bloque genera código', () => {
  it('encuentra los bloques del proyecto', () => {
    expect(projectTypes.length).toBeGreaterThan(100);
  });

  it('ningún bloque definido queda sin generador', () => {
    const fallos = [];
    for (const type of projectTypes) {
      const { error } = generate(type);
      if (error) fallos.push(`${type}: ${error}`);
    }
    expect(fallos).toEqual([]);
  });

  it('cada bloque produce código o un valor, no vacío', () => {
    // Los bloques que solo acumulan estado (definiciones de procedimiento,
    // includes) devuelven cadena vacía a propósito.
    const silenciosos = new Set([
      'procedures_defnoreturn', 'procedures_defreturn',
      'include_header', 'library_include', 'arduino_setup', 'arduino_loop',
      // Registran estado o instancias y emiten su código en otra sección.
      'stepper_create', 'stepper_create_advanced',
      'webserver_on', 'webserver_serve', 'webserver_serve_file',
      'websocket_on_message',
    ]);

    const vacios = [];
    for (const type of projectTypes) {
      if (silenciosos.has(type)) continue;
      const { out, error } = generate(type);
      if (error) continue;
      if (out === undefined || out === null || String(out).trim() === '') {
        vacios.push(type);
      }
    }
    expect(vacios).toEqual([]);
  });
});
