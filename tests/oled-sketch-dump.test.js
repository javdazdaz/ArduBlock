import { it } from 'vitest';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { generateArduinoCode } from '../frontend/js/generator.js';
import { OLED_ANIMATIONS, partirEnTabs } from '../frontend/js/oled-animations.js';
import { badappleBytes } from '../frontend/js/oled-anim-badapple.js';

// Utilidad de verificación: escribe sketches reales para compilarlos con
// arduino-cli. Corre solo con OLED_DUMP=1.
const base = process.env.OLED_DUMP_DIR || '/tmp/ardublock-oled';

function armar(bloques) {
  const ws = new Blockly.Workspace();
  const setup = ws.newBlock('arduino_setup');
  const loop = ws.newBlock('arduino_loop');
  let previo = null;
  for (const [tipo, cfg] of bloques) {
    const b = ws.newBlock(tipo);
    if (cfg) cfg(b, ws);
    if (b.previousConnection && previo) previo.nextConnection.connect(b.previousConnection);
    if (b.previousConnection && !previo) setup.getInput('BODY').connection.connect(b.previousConnection);
    previo = b;
  }
  const sk = generateArduinoCode(ws);
  ws.dispose();
  return sk;
}

function texto(ws, padre, input, valor) {
  const t = ws.newBlock('text');
  t.setFieldValue(valor, 'TEXT');
  padre.getInput(input).connection.connect(t.outputConnection);
}
function numero(ws, padre, input, n) {
  const m = ws.newBlock('math_number');
  m.setFieldValue(String(n), 'NUM');
  padre.getInput(input).connection.connect(m.outputConnection);
}

it.runIf(Boolean(process.env.OLED_DUMP))('escribe los sketches de verificación', () => {
  mkdirSync(base + '/OledTexto', { recursive: true });
  mkdirSync(base + '/OledAnim', { recursive: true });

  // 1. Texto y píxeles
  const textoSketch = armar([
    ['oled_create'],
    ['oled_clear'],
    ['oled_text', (b, ws) => { texto(ws, b, 'TEXT', 'Hola, NZN!'); numero(ws, b, 'X', 0); numero(ws, b, 'Y', 0); }],
    ['oled_text', (b, ws) => { texto(ws, b, 'TEXT', 'SSD1315 OLED'); numero(ws, b, 'X', 0); numero(ws, b, 'Y', 16); }],
    ['oled_show'],
  ]);
  writeFileSync(base + '/OledTexto/OledTexto.ino', textoSketch);

  // 2. Bad Apple con los dos tabs .h
  const bytes = badappleBytes();
  const partes = partirEnTabs(bytes, 'oled_anim_badapple', 'Bad Apple!!');
  let animSketch = armar([
    ['oled_create'],
    ['oled_play_animation', b => b.setFieldValue('FALSE', 'LOOP')],
  ]);
  const includes = partes.map(p => '#include "' + p.tab + '"').join('\n');
  animSketch = includes + '\n' + animSketch;
  writeFileSync(base + '/OledAnim/OledAnim.ino', animSketch);
  for (const p of partes) writeFileSync(base + '/OledAnim/' + p.tab, p.texto);
  // eslint-disable-next-line no-console
  console.log('partes:', partes.map(p => p.tab + ' (' + p.bytes + ' B, ' + p.texto.length + ' B de texto)').join(' | '));
  console.log('meta:', JSON.stringify(OLED_ANIMATIONS.badapple));

  // 3. Animación propia que no cabe en el .ino: mismos tabs, path `oj_`
  mkdirSync(base + '/OledPropia', { recursive: true });
  const propias = partirEnTabs(bytes, 'oled_anim_prueba', 'animación propia prueba');
  localStorage.setItem('ardublock:oled-animations', JSON.stringify({
    prueba: {
      fps: 25,
      cuadros: 871,
      b64: '',
      tabs: propias.map(p => p.tab),
      arrays: propias.map(p => p.nombre),
      corte: propias[0].bytes,
      bytes: bytes.length,
    },
  }));
  let propiaSketch = armar([
    ['oled_create'],
    ['oled_play_animation', b => b.setFieldValue('oj_prueba', 'ANIM')],
  ]);
  const propiosIncludes = propias.map(p => '#include "' + p.tab + '"').join('\n');
  propiaSketch = propiosIncludes + '\n' + propiaSketch;
  writeFileSync(base + '/OledPropia/OledPropia.ino', propiaSketch);
  for (const p of propias) writeFileSync(base + '/OledPropia/' + p.tab, p.texto);
  localStorage.removeItem('ardublock:oled-animations');
  // eslint-disable-next-line no-console
  console.log('propia:', propias.map(p => p.tab + ' (' + p.bytes + ' B)').join(' | '));

  // 4. El ejemplo OledBadApple, tal como lo carga el editor
  mkdirSync(base + '/OledEjemplo', { recursive: true });
  const estadoEjemplo = JSON.parse(
    readFileSync('examples/blockly-states/ardublock-examples/oled/OledBadApple.json', 'utf8'));
  const wsEjemplo = new Blockly.Workspace();
  Blockly.serialization.workspaces.load(estadoEjemplo, wsEjemplo);
  const ejemploSketch = includes + '\n' + generateArduinoCode(wsEjemplo);
  wsEjemplo.dispose();
  writeFileSync(base + '/OledEjemplo/OledEjemplo.ino', ejemploSketch);
  for (const p of partes) writeFileSync(base + '/OledEjemplo/' + p.tab, p.texto);
});
