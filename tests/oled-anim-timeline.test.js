import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { generateArduinoCode } from '../frontend/js/generator.js';
import {
  OLED_ANIMATIONS, MAX_TAB_BYTES, cabeEnIno, decodificarCuadros,
  partirEnTabs, tipoDeAnimacion,
} from '../frontend/js/oled-animations.js';
import {
  MATRIX_ANIMATIONS, ANIMACIONES_DIFERIDAS, cargarBadAppleR4,
} from '../frontend/js/blocks/ledmatrix.js';

/**
 * Lo que se fija aquí: el tipo de animación decide dónde se edita, el recurso
 * de Bad Apple llega completo a la línea de tiempo y la tabla del R4 no viaja
 * en el bundle principal.
 */

function sketchCon(bloques) {
  const ws = new Blockly.Workspace();
  const setup = ws.newBlock('arduino_setup');
  ws.newBlock('arduino_loop');
  let previo = null;
  for (const [tipo, configurar] of bloques) {
    const b = ws.newBlock(tipo);
    if (configurar) configurar(b, ws);
    if (b.previousConnection && previo) previo.nextConnection.connect(b.previousConnection);
    if (b.previousConnection && !previo) setup.getInput('BODY').connection.connect(b.previousConnection);
    previo = b;
  }
  const sketch = generateArduinoCode(ws);
  ws.dispose();
  return sketch;
}

describe('tipo de animación', () => {
  it('sin dato se edita en la línea de tiempo', () => {
    expect(tipoDeAnimacion(undefined)).toBe('linea');
    expect(tipoDeAnimacion([0, 0, 0, 66])).toBe('linea');
    expect(tipoDeAnimacion({ cuadros: 5 })).toBe('linea');
  });

  it('la tabla .h se declara con su tipo', () => {
    expect(tipoDeAnimacion({ tipo: 'tab' })).toBe('tab');
    expect(OLED_ANIMATIONS.badapple.tipo).toBe('linea');
    expect(ANIMACIONES_DIFERIDAS.badapple.tipo).toBe('linea');
  });
});

describe('tope del .ino para animaciones propias', () => {
  it('admite tablas chicas y rechaza la de Bad Apple', () => {
    expect(cabeEnIno(new Uint8Array(1000))).toBe(true);
    expect(cabeEnIno(new Uint8Array(184890))).toBe(false);
  });
});

describe('Bad Apple en la línea de tiempo', () => {
  it('decodifica los 871 cuadros completos', async () => {
    const mod = await import('../frontend/js/oled-anim-badapple.js');
    const bytes = mod.badappleBytes();
    expect(bytes.length).toBe(mod.BADAPPLE_BYTES);

    const cuadros = decodificarCuadros(bytes);
    expect(cuadros.length).toBe(mod.BADAPPLE_CUADROS);
    expect(cuadros[0].length).toBe(1024);
    // El último cuadro no está vacío: el stream se leyó hasta el final.
    const ultimo = cuadros[cuadros.length - 1];
    expect(ultimo.some(b => b !== 0)).toBe(true);
  });

  it('los dos tabs quedan bajo el tope del backend', async () => {
    const mod = await import('../frontend/js/oled-anim-badapple.js');
    const partes = partirEnTabs(mod.badappleBytes(), 'oled_anim_badapple', 'Bad Apple!!');
    expect(partes.length).toBe(2);
    for (const p of partes) expect(p.texto.length).toBeLessThan(MAX_TAB_BYTES);
  });

  it('no cabe como animación propia dentro del .ino', async () => {
    const mod = await import('../frontend/js/oled-anim-badapple.js');
    expect(cabeEnIno(mod.badappleBytes())).toBe(false);
  });
});

describe('animación propia que no cabe en el .ino', () => {
  it('se reproduce desde los tabs y no incrusta la tabla', () => {
    localStorage.setItem('ardublock:oled-animations', JSON.stringify({
      larga: {
        fps: 25,
        cuadros: 871,
        b64: '',
        tabs: ['oled_anim_larga_a.h', 'oled_anim_larga_b.h'],
        arrays: ['oled_anim_larga_a', 'oled_anim_larga_b'],
        corte: 92445,
        bytes: 184890,
      },
    }));

    const sketch = sketchCon([
      ['oled_create'],
      ['oled_play_animation', b => b.setFieldValue('oj_larga', 'ANIM')],
    ]);

    expect(sketch).toContain(
      '_oled_anim_play(oled_anim_larga_a, oled_anim_larga_b, 92445, 184890, 871, 25, false);');
    expect(sketch).not.toContain('const uint8_t oled_anim_larga[]');
    // El decodificador sigue viajando: es el mismo que lee los tabs.
    expect(sketch).toContain('void _oled_cuadro(');
    localStorage.removeItem('ardublock:oled-animations');
  });
});

describe('Bad Apple del R4: la tabla no viaja en el bundle', () => {
  it('el módulo de bloques no la importa al cargarse', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync('frontend/js/blocks/ledmatrix.js', 'utf8');
    expect(src).not.toMatch(/^import\s+badapple_frames\s+from/m);
    expect(src).toContain("import('./ledmatrix-badapple.js')");
  });

  it('el catálogo trae la ficha y no los cuadros', () => {
    expect(MATRIX_ANIMATIONS.badapple).toBeUndefined();
    expect(ANIMACIONES_DIFERIDAS.badapple.cuadros).toBe(2181);
    expect(ANIMACIONES_DIFERIDAS.badapple.obtener()).toBeNull();
  });

  it('el sketch avisa mientras los cuadros no están y los emite al llegar', async () => {
    const conDatos = () => sketchCon([
      ['matrix_play_animation', b => b.setFieldValue('badapple', 'ANIM')],
    ]);

    const antes = conDatos();
    expect(antes).toContain('badapple: los cuadros se están cargando');
    expect(antes).not.toContain('anim_badapple[2181][4]');

    const cuadros = await cargarBadAppleR4();
    expect(cuadros.length).toBe(2181);
    expect(ANIMACIONES_DIFERIDAS.badapple.obtener()).toBe(cuadros);

    const despues = conDatos();
    expect(despues).toContain('const uint32_t anim_badapple[2181][4]');
    expect(despues).toContain('matrix.loadSequence(anim_badapple);');
  });
});
