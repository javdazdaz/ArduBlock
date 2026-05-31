/**
 * ArduBlock — Upload a Arduino vía arduino-cli.
 */

import { generateArduinoCode } from './generator.js';
import { getSetting } from './settings.js';
import { consoleLog, isSerialConnected, disconnectSerial, connectSerial } from './serial.js';

let workspace, arduinoConsole, btnConsoleToggle, consoleOutput, btnUpload;

export function initUpload(deps) {
  workspace       = deps.workspace;
  arduinoConsole  = deps.arduinoConsole;
  btnConsoleToggle = deps.btnConsoleToggle;
  consoleOutput   = deps.consoleOutput;
  btnUpload       = deps.btnUpload;

  btnUpload.addEventListener('click', uploadToArduino);
}

export async function uploadToArduino() {
  arduinoConsole.classList.remove('hidden');
  btnConsoleToggle.classList.add('active');
  consoleOutput.innerHTML = '';
  btnUpload.disabled = true;

  if (isSerialConnected()) disconnectSerial();

  const code = generateArduinoCode(workspace);
  consoleLog('🔍 Buscando Arduino...', 'info');

  let port = '';
  let fqbn = getSetting('board');
  try {
    const boardRes = await fetch('/api/boards');
    const boardData = await boardRes.json();
    if (boardData.detected_ports && boardData.detected_ports.length > 0) {
      const p = boardData.detected_ports[0];
      port = p.port.address || p.address || '';
      if (p.matching_boards && p.matching_boards.length > 0) {
        fqbn = p.matching_boards[0].fqbn || fqbn;
      }
      consoleLog(`✓ Placa detectada: ${port} (${fqbn})`, 'success');
    } else {
      consoleLog('✕ No se detectó ningún Arduino. Conectalo por USB.', 'error');
      btnUpload.disabled = false;
      return;
    }
  } catch (e) {
    consoleLog('✕ Error al buscar placa: ' + e.message, 'error');
    btnUpload.disabled = false;
    return;
  }

  consoleLog('⚙ Compilando...', 'info');

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, port, fqbn })
    });
    const data = await res.json();

    if (data.stdout) {
      for (const line of data.stdout.split('\n').filter(l => l.trim())) {
        if (line.includes('error') || line.includes('Error')) consoleLog(line, 'error');
        else if (line.includes('done') || line.includes('upload') || line.includes('SUCCESS')) consoleLog(line, 'success');
        else consoleLog(line);
      }
    }
    if (data.stderr) {
      for (const line of data.stderr.split('\n').filter(l => l.trim())) consoleLog(line, 'error');
    }
    if (data.success) {
      consoleLog('✅ ¡Sketch subido correctamente!', 'success');
      setTimeout(() => connectSerial(), 1500);
    } else {
      consoleLog('❌ Falló: ' + (data.stage || 'desconocido'), 'error');
    }
  } catch (e) {
    consoleLog('Error de conexión: ' + e.message, 'error');
  }
  btnUpload.disabled = false;
}
