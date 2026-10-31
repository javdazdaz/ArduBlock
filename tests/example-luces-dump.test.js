import { it } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { generateArduinoCode } from '../frontend/js/generator.js';
import { webExamples } from '../frontend/js/examples-web.js';

/**
 * Utilidad de verificación: escribe el sketch del ejemplo con la página real,
 * para compilarlo con arduino-cli y medir el flash por placa.
 *
 *   LUCES_DUMP=1 LUCES_DUMP_DIR=<dir> npx vitest run tests/example-luces-dump.test.js
 */
const base = process.env.LUCES_DUMP_DIR || '/tmp/ardublock-luces';

it.runIf(Boolean(process.env.LUCES_DUMP))('escribe el sketch del ejemplo', () => {
  const pagina = readFileSync('examples/web/luces.html', 'utf8');
  window._tabManager = { getTabs: () => [{ filename: 'luces.html', content: pagina }] };

  const ejemplo = webExamples.find(e => e.name === 'LucesWebSocket');
  const ws = new Blockly.Workspace();
  Blockly.serialization.workspaces.load(ejemplo.state, ws);
  const sketch = generateArduinoCode(ws);
  ws.dispose();

  mkdirSync(base + '/LucesWebSocket', { recursive: true });
  writeFileSync(base + '/LucesWebSocket/LucesWebSocket.ino', sketch);
  // eslint-disable-next-line no-console
  console.log('sketch de', sketch.length, 'bytes; página de', pagina.length, 'bytes');
});
