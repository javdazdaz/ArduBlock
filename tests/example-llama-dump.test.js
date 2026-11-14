import { it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { generateArduinoCode } from '../frontend/js/generator.js';

/**
 * Escribe el sketch del ejemplo SensorLlamaWebSocket con su página real, para
 * compilarlo con arduino-cli. No corre en la suite normal.
 *
 *   LLAMA_DUMP=1 LLAMA_OUT=<dir> npx vitest run tests/llama-dump.test.js
 */
it.runIf(Boolean(process.env.LLAMA_DUMP))('escribe el sketch del ejemplo', () => {
  const base = process.env.LLAMA_OUT || '/tmp/ardublock-llama';
  const pagina = readFileSync('examples/web/sensor-llama.html', 'utf8');
  window._tabManager = { getTabs: () => [{ filename: 'sensor-llama.html', content: pagina }] };

  const estado = JSON.parse(
    readFileSync('examples/blockly-states/ardublock-examples/web/SensorLlamaWebSocket.json', 'utf8')
  );
  const ws = new Blockly.Workspace();
  Blockly.serialization.workspaces.load(estado, ws);
  const sketch = generateArduinoCode(ws);
  ws.dispose();

  mkdirSync(base + '/SensorLlamaWebSocket', { recursive: true });
  writeFileSync(base + '/SensorLlamaWebSocket/SensorLlamaWebSocket.ino', sketch);
  // eslint-disable-next-line no-console
  console.log(sketch);
});
