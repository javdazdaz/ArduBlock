/**
 * ArduBlock — Panel de sketch de texto en la página de la clase.
 *
 * Cada actividad con `sketch_text` muestra el código y tres acciones:
 * descargar el .ino, compilar en el servidor y subir por Web Serial.
 * La compilación y el flasheo repiten el camino B de `upload.js`
 * (`/api/compile-hex` + los flashers de `web-serial-flasher.js`), sin
 * workspace de Blockly de por medio: el código es el texto del panel.
 *
 * Este archivo se sirve suelto desde /js/ (lo copia scripts/sync-public.mjs),
 * así que solo puede importar módulos que también estén en esa lista.
 */

import { STK500Flasher, SAMBAFlasher, getDeviceCode } from './web-serial-flasher.js';

const POLL_MS = 700;
const COMPILE_TIMEOUT_MS = 90000;

const i18n = readI18n();

function readI18n() {
  const el = document.getElementById('sketch-i18n');
  if (!el) return {};
  try {
    return JSON.parse(el.textContent);
  } catch {
    return {};
  }
}

function log(panel, text, level = 'dim') {
  const box = panel.querySelector('[data-sketch-log]');
  if (!box) return;
  box.classList.remove('hidden');
  const line = document.createElement('div');
  line.className = `sketch-log-line ${level}`;
  line.textContent = text;
  box.appendChild(line);
  box.scrollTop = box.scrollHeight;
}

function codeOf(panel) {
  const pre = panel.querySelector('[data-sketch-code]');
  return pre ? pre.textContent : '';
}

function boardOf(panel) {
  const select = panel.querySelector('[data-sketch-board]');
  return select ? select.value : 'arduino:avr:uno';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ═══ Compilación en el servidor ══════════════════

async function submitCompile(url, code, fqbn) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, fqbn, tabs: [] })
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok || !data.job_id) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data.job_id;
}

async function waitCompile(baseUrl, jobId) {
  const deadline = Date.now() + COMPILE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_MS);
    const res = await fetch(baseUrl + jobId);
    const state = await res.json();
    if (state.status === 'done' || state.status === 'error') {
      return state.result || {};
    }
  }
  throw new Error('timeout');
}

function printFailure(panel, result) {
  const text = [result.stdout, result.stderr, result.error].filter(Boolean).join('\n');
  for (const line of text.split('\n')) {
    if (line.trim()) log(panel, line, 'err');
  }
}

function printSummary(panel, result) {
  const lines = (result.stdout || '').split('\n').filter((l) => l.trim());
  for (const line of lines.slice(-3)) log(panel, line, 'dim');
}

async function compileOnly(panel) {
  const code = codeOf(panel);
  const fqbn = boardOf(panel);
  log(panel, `Compilando ${fqbn}...`, 'info');
  const jobId = await submitCompile('/api/compile', code, fqbn);
  const result = await waitCompile('/api/compile/', jobId);
  if (result.success) {
    printSummary(panel, result);
    log(panel, i18n.compileOk || 'OK', 'ok');
  } else {
    printFailure(panel, result);
    log(panel, i18n.compileFailed || 'Error', 'err');
  }
}

// ═══ Flasheo por Web Serial ══════════════════════

async function flashAvr(panel, hexContent, deviceCode, port) {
  await port.open({ baudRate: 115200, dataBits: 8, stopBits: 1, parity: 'none' });
  const flasher = new STK500Flasher((msg) => log(panel, msg));
  try {
    flasher.port = port;
    flasher.reader = port.readable.getReader();
    await flasher.flash(hexContent, deviceCode);
    log(panel, i18n.uploadDone || 'OK', 'ok');
  } finally {
    await flasher.disconnect();
  }
}

async function flashRenesas(panel, binBase64, port) {
  await port.open({ baudRate: 230400 });
  const flasher = new SAMBAFlasher((msg) => log(panel, msg));
  try {
    await flasher.connect(port);
    const binData = Uint8Array.from(atob(binBase64), (c) => c.charCodeAt(0));
    await flasher.flash(binData);
    await flasher.reset();
    log(panel, i18n.uploadDone || 'OK', 'ok');
  } finally {
    await flasher.disconnect();
  }
}

async function uploadToBoard(panel) {
  if (!('serial' in navigator)) {
    log(panel, i18n.noWebSerial || 'Web Serial no disponible', 'err');
    return;
  }

  const code = codeOf(panel);
  const fqbn = boardOf(panel);

  let deviceCode;
  try {
    deviceCode = getDeviceCode(fqbn);
  } catch (e) {
    log(panel, e.message, 'err');
    return;
  }

  // El puerto se pide primero: requestPort necesita el gesto del clic.
  let port;
  try {
    port = await navigator.serial.requestPort();
  } catch {
    log(panel, i18n.portCancelled || 'Sin puerto', 'warn');
    return;
  }

  const format = deviceCode === 'renesas-ra4m1' ? 'bin' : 'hex';
  log(panel, `Compilando ${fqbn} para ${format}...`, 'info');
  const jobId = await submitCompile('/api/compile-hex', code, fqbn);
  const result = await waitCompile('/api/compile-hex/', jobId);

  if (!result.success) {
    printFailure(panel, result);
    log(panel, i18n.uploadFailed || 'Error', 'err');
    return;
  }

  const payload = format === 'bin' ? result.bin : result.hex;
  if (!payload) {
    log(panel, i18n.compileFailed || 'Sin binario', 'err');
    return;
  }

  if (format === 'bin') {
    log(panel, 'Haga doble-RESET en el R4 ahora (LED L pulsando).', 'info');
    await flashRenesas(panel, payload, port);
  } else {
    await flashAvr(panel, payload, deviceCode, port);
  }
}

// ═══ Enganche ════════════════════════════════════

function toggleCode(panel, button) {
  const pre = panel.querySelector('[data-sketch-code]');
  if (!pre) return;
  const hidden = pre.classList.toggle('hidden');
  button.setAttribute('aria-expanded', String(!hidden));
  button.textContent = hidden ? (i18n.show || 'Ver') : (i18n.hide || 'Ocultar');
}

function wirePanel(panel) {
  const toggle = panel.querySelector('[data-sketch-toggle]');
  const compile = panel.querySelector('[data-sketch-compile]');
  const upload = panel.querySelector('[data-sketch-upload]');
  const logBox = panel.querySelector('[data-sketch-log]');

  if (toggle) toggle.addEventListener('click', () => toggleCode(panel, toggle));

  if (compile) {
    compile.addEventListener('click', async () => {
      compile.disabled = true;
      if (logBox) logBox.textContent = '';
      try {
        await compileOnly(panel);
      } catch (e) {
        log(panel, `✕ ${e.message}`, 'err');
      } finally {
        compile.disabled = false;
      }
    });
  }

  if (upload) {
    upload.addEventListener('click', async () => {
      upload.disabled = true;
      if (logBox) logBox.textContent = '';
      try {
        await uploadToBoard(panel);
      } catch (e) {
        log(panel, `✕ ${e.message}`, 'err');
      } finally {
        upload.disabled = false;
      }
    });
  }
}

document.querySelectorAll('[data-sketch-panel]').forEach(wirePanel);
