import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { generateArduinoCode } from '../frontend/js/generator.js';
import { OLED_ANIMATIONS } from '../frontend/js/oled-animations.js';
import estado from '../examples/blockly-states/ardublock-examples/oled/OledBadApple.json';

/**
 * El ejemplo OledBadApple: los bloques existen, el estado deserializa, el
 * sketch llama a los arreglos que crea el cargador del recurso y la animación
 * queda en loop() —una vuelta por pasada de 34,8 s—, no en setup().
 */

function cargarEjemplo() {
  const ws = new Blockly.Workspace();
  Blockly.serialization.workspaces.load(estado, ws);
  return ws;
}

describe('ejemplo OledBadApple', () => {
  it('usa solo bloques definidos', () => {
    const ws = cargarEjemplo();
    const tipos = ws.getAllBlocks(false).map(b => b.type).sort();
    expect(tipos).toEqual([
      'arduino_loop', 'arduino_setup', 'oled_create', 'oled_play_animation',
    ]);
    for (const tipo of tipos) expect(Blockly.Blocks[tipo]).toBeDefined();
    ws.dispose();
  });

  it('inicia la pantalla en setup y reproduce la animación en loop', () => {
    const ws = cargarEjemplo();
    const sketch = generateArduinoCode(ws);

    expect(sketch).toContain('#include <Wire.h>');
    expect(sketch).toContain('_oled_init(0x3C, 400000);');
    const meta = OLED_ANIMATIONS.badapple;
    expect(sketch).toContain('_oled_anim_play(' + meta.arrays[0] + ', '
      + (meta.arrays[1] || 'NULL') + ', ' + (meta.corte || 0) + ', ' + meta.bytes + ', '
      + meta.cuadros + ', 25, false);');
    expect(sketch).toContain('void _oled_cuadro(');

    ws.dispose();
  });

  it('la llamada va dentro de loop() y no de setup()', () => {
    const ws = cargarEjemplo();
    const sketch = generateArduinoCode(ws);

    const posSetup = sketch.indexOf('void setup()');
    const posLoop = sketch.indexOf('void loop()');
    const posInit = sketch.indexOf('_oled_init(0x3C, 400000);');
    const posPlay = sketch.indexOf('_oled_anim_play(' + OLED_ANIMATIONS.badapple.arrays[0]);

    expect(posSetup).toBeGreaterThan(-1);
    expect(posLoop).toBeGreaterThan(posSetup);
    expect(posInit).toBeGreaterThan(posSetup);
    expect(posInit).toBeLessThan(posLoop);
    expect(posPlay).toBeGreaterThan(posLoop);

    ws.dispose();
  });

  it('los arreglos que llama son los que escribe el cargador del recurso', () => {
    // El ejemplo no lleva las tablas: el cargador crea los tabs con estos
    // nombres, y el sketch los llama por el mismo nombre.
    const meta = OLED_ANIMATIONS.badapple;
    expect(meta.tabs).toEqual(meta.arrays.map(a => a + '.h'));
  });
});
