/**
 * ArduBlock — Serial Monitor
 *
 * Dos modos:
 *   1. Web Serial (navegador): puerto guardado tras flasheo PATH B
 *   2. Backend (pyserial):   vía /api/serial/* en el servidor
 *
 * connectSerial, disconnectSerial, consoleLog, toggleConsole,
 * setWebSerialPort, hasWebSerialPort.
 */

import { escapeHtml } from './project-manager.js';
import { getSetting } from './settings.js';
import { t } from './i18n.js';

let arduinoConsole, consoleOutput, btnConnect, btnConsoleToggle, serialBaud;
let serialPollTimer = null;
let serialConnected = false;

// ── Web Serial state (PATH B) ──────────────────
let _webSerialPort = null;
let _webSerialConnected = false;
const _textDecoder = new TextDecoder('utf-8');

export function initSerial(deps) {
  arduinoConsole    = deps.arduinoConsole;
  consoleOutput     = deps.consoleOutput;
  btnConnect        = deps.btnConnect;
  btnConsoleToggle  = deps.btnConsoleToggle;
  serialBaud        = deps.serialBaud;

  document.getElementById('console-close').addEventListener('click', toggleConsole);
  btnConsoleToggle.addEventListener('click', toggleConsole);
  document.getElementById('serial-clear').addEventListener('click', () => {
    consoleOutput.textContent = '';
  });
  btnConnect.addEventListener('click', () => {
    if (serialConnected || _webSerialConnected) disconnectSerial();
    else connectSerial();
  });
}

export function consoleLog(msg, cls = '') {
  const span = cls ? `<span class="${cls}">${escapeHtml(msg)}</span>` : escapeHtml(msg);
  consoleOutput.insertAdjacentHTML('beforeend', span + '\n');
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

export function toggleConsole() {
  if (arduinoConsole.classList.contains('hidden')) {
    arduinoConsole.classList.remove('hidden');
    btnConsoleToggle.classList.add('active');
    btnConsoleToggle.textContent = t('btn_console');
  } else {
    if (serialConnected || _webSerialConnected) disconnectSerial();
    arduinoConsole.classList.add('hidden');
    btnConsoleToggle.classList.remove('active');
    btnConsoleToggle.textContent = t('btn_console');
  }
}

// ── Web Serial helpers ─────────────────────────

/**
 * Guarda el puerto Web Serial para usar como monitor tras flasheo PATH B.
 * Lo llama upload.js después de un flash exitoso (antes del disconnect).
 */
export function setWebSerialPort(port) {
  _webSerialPort = port;
}

/**
 * ¿Hay un puerto Web Serial disponible para monitor?
 */
export function hasWebSerialPort() {
  return _webSerialPort !== null;
}

// ── Conexión ───────────────────────────────────

export async function connectSerial() {
  if (serialConnected || _webSerialConnected) return;

  arduinoConsole.classList.remove('hidden');
  btnConnect.disabled = true;
  const baud = parseInt(serialBaud.value || getSetting('baud'));

  // Modo 1: Web Serial (puerto guardado tras flasheo PATH B)
  if (_webSerialPort) {
    await _connectWebSerial(baud);
    return;
  }

  // Modo 2: Backend
  try {
    const res = await fetch('/api/serial/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baud: baud })
    });
    const data = await res.json();

    if (data.error) {
      consoleLog(data.error, 'error');
      btnConnect.disabled = false;
      return;
    }

    serialConnected = true;
    btnConnect.disabled = false;
    btnConnect.textContent = t('serial_disconnect');
    btnConnect.className = 'console-btn connected';
    consoleLog(`✓ Conectado a ${data.port || '?'} @ ${data.baud || '?'} baud`, 'success');

    // Polling cada 200ms
    serialPollTimer = setInterval(async () => {
      try {
        const r = await fetch('/api/serial/read');
        const d = await r.json();
        if (d.data) {
          consoleOutput.textContent += d.data;
          consoleOutput.scrollTop = consoleOutput.scrollHeight;
        }
      } catch(e) {
        // Silencioso — el polling se recupera en la siguiente iteración
      }
    }, 200);
  } catch (e) {
    consoleLog('Error: ' + e.message, 'error');
    btnConnect.disabled = false;
  }
}

// ── Web Serial connect ─────────────────────────

async function _connectWebSerial(baud) {
  try {
    btnConnect.textContent = 'Conectando...';
    await _webSerialPort.open({ baudRate: baud });

    // Asegurar DTR alto para no resetear la placa (algunos OS/drivers lo bajan al abrir)
    try {
      await _webSerialPort.setSignals({ dataTerminalReady: true, requestToSend: true });
    } catch (_) {
      // setSignals puede no estar soportado — ignorar
    }

    _webSerialConnected = true;
    btnConnect.disabled = false;
    btnConnect.textContent = t('serial_disconnect');
    btnConnect.className = 'console-btn connected';
    consoleLog(`✓ Conectado vía Web Serial @ ${baud} baud`, 'success');

    // Iniciar loop de lectura en background (no await — corre independiente)
    _webSerialReadLoop().catch(() => {});

  } catch (e) {
    consoleLog('Error Web Serial: ' + e.message, 'error');
    btnConnect.disabled = false;
    btnConnect.textContent = t('serial_connect');
    btnConnect.className = 'console-btn connect';
    _webSerialPort = null;
  }
}

// ── Web Serial read loop ───────────────────────

async function _webSerialReadLoop() {
  while (_webSerialConnected && _webSerialPort.readable) {
    try {
      const reader = _webSerialPort.readable.getReader();
      try {
        while (_webSerialConnected) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value && value.length > 0) {
            consoleOutput.textContent += _textDecoder.decode(value, { stream: true });
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
          }
        }
      } finally {
        try { reader.releaseLock(); } catch (_) {}
      }
    } catch (e) {
      // Port cerrado (disconnect) → salir limpiamente
      break;
    }
  }
  _webSerialConnected = false;
}

// ── Desconexión ────────────────────────────────

export async function disconnectSerial(quiet = false) {
  const wasConnected = serialConnected || _webSerialConnected;

  // Web Serial mode
  if (_webSerialConnected) {
    _webSerialConnected = false;
    try { await _webSerialPort.close(); } catch (_) {}
    _webSerialPort = null;
  }

  // Backend mode
  if (serialConnected) {
    serialConnected = false;
    if (serialPollTimer) { clearInterval(serialPollTimer); serialPollTimer = null; }
    try { await fetch('/api/serial/close', { method: 'POST' }); } catch(e) { console.warn('[Serial] close failed:', e); }
  }

  btnConnect.disabled = false;
  btnConnect.textContent = t('serial_connect');
  btnConnect.className = 'console-btn connect';
  if (wasConnected && !quiet) consoleLog('Desconectado', 'info');
}

// ── Estado ─────────────────────────────────────

export function isSerialConnected() {
  return serialConnected || _webSerialConnected;
}

export function getSerialPollTimer() {
  return serialPollTimer;
}
