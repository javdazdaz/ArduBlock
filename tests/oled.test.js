import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { cppGenerator, generateArduinoCode } from '../frontend/js/generator.js';
import { OLED_ANIMATIONS, encodeCuadros, partirEnTabs } from '../frontend/js/oled-animations.js';

/**
 * Bloques OLED SSD1315 (I2C crudo). Lo que se fija aquí: el driver viaja con
 * el sketch, el #include va antes de cualquier declaración y el decodificador
 * de animaciones usa el mismo formato que el sketch Bad_Apple_Flash.
 */

function sketchCon(bloques) {
  const ws = new Blockly.Workspace();
  const setup = ws.newBlock('arduino_setup');
  const loop = ws.newBlock('arduino_loop');
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

function numero(ws, padre, input, n) {
  const num = ws.newBlock('math_number');
  num.setFieldValue(String(n), 'NUM');
  padre.getInput(input).connection.connect(num.outputConnection);
}

describe('OLED: creación y driver', () => {
  it('emite el include de Wire y el driver con búfer de 1024 bytes', () => {
    const sketch = sketchCon([['oled_create']]);
    expect(sketch).toContain('#include <Wire.h>');
    expect(sketch).toContain('uint8_t oled_buf[1024];');
    expect(sketch).toContain('void _oled_volcar()');
    expect(sketch).toContain('_oled_init(0x3C, 400000);');
  });

  it('el include queda antes de toda declaración', () => {
    const sketch = sketchCon([['oled_create'], ['oled_show']]);
    const posInclude = sketch.indexOf('#include <Wire.h>');
    const posBuf = sketch.indexOf('uint8_t oled_buf');
    expect(posInclude).toBeGreaterThan(-1);
    expect(posInclude).toBeLessThan(posBuf);
  });

  it('respeta dirección y reloj elegidos', () => {
    const sketch = sketchCon([['oled_create', b => {
      b.setFieldValue('0x3D', 'ADDR');
      b.setFieldValue('100000', 'CLOCK');
    }]]);
    expect(sketch).toContain('_oled_init(0x3D, 100000);');
  });

  it('sin bloques OLED el sketch no lleva driver', () => {
    const sketch = sketchCon([['delay_ms_basic']]);
    expect(sketch).not.toContain('uint8_t oled_buf');
    expect(sketch).not.toContain('#include <Wire.h>');
  });

  it('cualquier bloque OLED arrastra el driver', () => {
    const sketch = sketchCon([['oled_show']]);
    expect(sketch).toContain('_oled_volcar();');
    expect(sketch).toContain('uint8_t oled_buf');
  });
});

describe('OLED: dibujo', () => {
  it('píxel usa las coordenadas conectadas', () => {
    const sketch = sketchCon([['oled_create'], ['oled_pixel', (b, ws) => {
      numero(ws, b, 'X', 5);
      numero(ws, b, 'Y', 9);
      b.setFieldValue('false', 'ON');
    }]]);
    expect(sketch).toContain('_oled_punto(5, 9, false);');
  });

  it('texto emite la fuente de 5x7 solo cuando se usa', () => {
    const conTexto = sketchCon([['oled_create'], ['oled_text', (b, ws) => {
      const t = ws.newBlock('text');
      t.setFieldValue('Hola', 'TEXT');
      b.getInput('TEXT').connection.connect(t.outputConnection);
      numero(ws, b, 'X', 0);
      numero(ws, b, 'Y', 0);
    }]]);
    expect(conTexto).toContain('const uint8_t _oled_font5x7[][5] PROGMEM');
    expect(conTexto).toContain('_oled_texto(0, 0, "Hola");');

    const sinTexto = sketchCon([['oled_create'], ['oled_show']]);
    expect(sinTexto).not.toContain('_oled_font5x7');
  });

  it('borrar marca el búfer y mostrar vuelca las páginas sucias', () => {
    const sketch = sketchCon([['oled_create'], ['oled_clear'], ['oled_show']]);
    expect(sketch).toContain('_oled_limpiar();');
    expect(sketch).toContain('_oled_volcar();');
    expect(sketch).toContain('if (oled_sucia[p])');
  });
});

describe('OLED: animación Bad Apple', () => {
  it('llama al decodificador con los dos arreglos y el corte', () => {
    const meta = OLED_ANIMATIONS.badapple;
    const sketch = sketchCon([['oled_create'], ['oled_play_animation']]);
    expect(sketch).toContain('_oled_anim_play(' + meta.arrays[0] + ', ' + meta.arrays[1]
      + ', ' + meta.corte + ', ' + meta.bytes + ', ' + meta.cuadros + ', 25, false);');
    expect(sketch).toContain('void _oled_cuadro(');
    expect(sketch).toContain('void _oled_bloque8(');
  });

  it('el bucle se propaga al decodificador', () => {
    const sketch = sketchCon([['oled_create'], ['oled_play_animation', b => {
      b.setFieldValue('TRUE', 'LOOP');
    }]]);
    expect(sketch).toContain(', 25, true);');
  });

  it('no emite decodificador si no hay animación', () => {
    const sketch = sketchCon([['oled_create'], ['oled_show']]);
    expect(sketch).not.toContain('_oled_anim_play');
  });
});

describe('animación propia guardada en el navegador', () => {
  it('emite la tabla y la llama con sizeof', () => {
    const bytes = encodeCuadros([new Uint8Array(1024)]);
    let binario = '';
    for (let i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i]);
    localStorage.setItem('ardublock:oled-animations',
      JSON.stringify({ prueba: { fps: 25, cuadros: 1, b64: btoa(binario) } }));

    const sketch = sketchCon([['oled_create'], ['oled_play_animation', b => {
      b.setFieldValue('oj_prueba', 'ANIM');
    }]]);

    expect(sketch).toContain('const uint8_t oled_anim_prueba[] PROGMEM');
    expect(sketch).toContain('_oled_anim_play(oled_anim_prueba, NULL, 0, sizeof(oled_anim_prueba), 0, 25, false);');
    localStorage.removeItem('ardublock:oled-animations');
  });
});

describe('codificador de animaciones', () => {
  it('codifica un cuadro vacío como cuadro completo', () => {
    const stream = encodeCuadros([new Uint8Array(1024)]);
    expect(stream.length).toBe(1 + 1024);
    expect(stream[0]).toBe(255);
  });

  it('codifica un cambio pequeño como lista de offsets', () => {
    const vacio = new Uint8Array(1024);
    const conPunto = new Uint8Array(1024);
    conPunto[0] = 1; // columna 0, página 0: un solo bloque
    const stream = encodeCuadros([vacio, conPunto]);
    expect(stream[0]).toBe(255);
    const offset = 1 + 1024;
    expect(stream[offset]).toBe(1);
    expect(stream[offset + 1]).toBe(0);
    expect(stream.length).toBe(offset + 1 + 9);
  });

  it('parte el stream en tabs que respetan el tope de 512 KB', () => {
    const bytes = new Uint8Array(200000);
    const partes = partirEnTabs(bytes, 'oled_anim_prueba', 'prueba');
    expect(partes.length).toBeGreaterThan(1);
    for (const p of partes) {
      expect(p.texto.length).toBeLessThan(512 * 1024);
    }
    const total = partes.reduce((s, p) => s + p.bytes, 0);
    expect(total).toBe(200000);
  });
});
