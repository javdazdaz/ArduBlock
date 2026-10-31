import { it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { generateArduinoCode } from '../frontend/js/generator.js';

/**
 * Utilidad de verificación: escribe un sketch real con salidas nombradas para
 * compilarlo con arduino-cli y medir flash y RAM por placa.
 *
 *   SALIDAS_DUMP=1 SALIDAS_DUMP_DIR=<dir> npx vitest run tests/salidas-sketch-dump.test.js
 *
 * El directorio del sketch se llama igual que el .ino; con otro nombre
 * arduino-cli responde "Can't open sketch: main file missing".
 */
const base = process.env.SALIDAS_DUMP_DIR || '/tmp/ardublock-salidas';

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

function fijar(ws, nombre, estado) {
  const b = ws.newBlock('salida_fijar');
  b.setFieldValue(nombre, 'NAME');
  b.setFieldValue(estado, 'ESTADO');
  return b;
}

it.runIf(Boolean(process.env.SALIDAS_DUMP))('escribe el sketch de verificación', () => {
  const ws = new Blockly.Workspace();
  const setup = ws.newBlock('arduino_setup');
  const loop = ws.newBlock('arduino_loop');

  encadenar(setup, [
    declarar(ws, 'luz1', '4'),
    declarar(ws, 'bomba', '7', 'LOW')   // relé activo en bajo
  ]);

  // if (estado de la salida luz1) { poner salida bomba apagada }
  const si = ws.newBlock('controls_if');
  const cond = ws.newBlock('salida_estado');
  cond.setFieldValue('luz1', 'NAME');
  si.getInput('IF0').connection.connect(cond.outputConnection);
  const cuerpo = fijar(ws, 'bomba', '0');
  si.getInput('DO0').connection.connect(cuerpo.previousConnection);

  encadenar(loop, [
    fijar(ws, 'luz1', '1'),
    ws.newBlock('delay_ms_basic'),
    (() => { const b = ws.newBlock('salida_alternar'); b.setFieldValue('bomba', 'NAME'); return b; })(),
    si
  ]);

  const sketch = generateArduinoCode(ws);
  ws.dispose();

  mkdirSync(base + '/SalidasDemo', { recursive: true });
  writeFileSync(base + '/SalidasDemo/SalidasDemo.ino', sketch);
  // eslint-disable-next-line no-console
  console.log(sketch);
});
