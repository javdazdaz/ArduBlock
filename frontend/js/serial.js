/**
 * ArduBlock — Serial Monitor
 *
 * connectSerial, disconnectSerial, consoleLog, toggleConsole.
 */

import { escapeHtml } from './project-manager.js';
import { getSetting } from './settings.js';

let arduinoConsole, consoleOutput, btnConnect, btnConsoleToggle, serialBaud;
let serialPollTimer = null;
let serialConnected = false;

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
    if (serialConnected) disconnectSerial();
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
    btnConsoleToggle.textContent = '🔌 Consola';
  } else {
    if (serialConnected) disconnectSerial();
    arduinoConsole.classList.add('hidden');
    btnConsoleToggle.classList.remove('active');
    btnConsoleToggle.textContent = '🔌 Consola';
  }
}

export async function connectSerial() {
  if (serialConnected) return;
  arduinoConsole.classList.remove('hidden');
  btnConnect.disabled = true;
  const baud = serialBaud.value || getSetting('baud');

  try {
    const res = await fetch('/api/serial/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baud: parseInt(baud) })
    });
    const data = await res.json();

    if (data.error) {
      consoleLog(data.error, 'error');
      btnConnect.disabled = false;
      return;
    }

    serialConnected = true;
    btnConnect.disabled = false;
    btnConnect.textContent = '🔌 Desconectar';
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

export async function disconnectSerial() {
  serialConnected = false;
  if (serialPollTimer) { clearInterval(serialPollTimer); serialPollTimer = null; }
  try { await fetch('/api/serial/close', { method: 'POST' }); } catch(e) {}
  btnConnect.disabled = false;
  btnConnect.textContent = '🔌 Conectar';
  btnConnect.className = 'console-btn connect';
  consoleLog('Desconectado', 'info');
}

// Exponer para upload.js
export function isSerialConnected() { return serialConnected; }
export function getSerialPollTimer() { return serialPollTimer; }
