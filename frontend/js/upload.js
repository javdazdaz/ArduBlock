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
  const tabs = window._tabManager ? window._tabManager.getTabs() : [];
  consoleLog('🔍 Buscando Arduino...', 'info');

  let port = '';
  let fqbn = getSetting('board');
  try {
    const boardRes = await fetch('/api/boards');
    const boardData = await boardRes.json();
    if (boardData.error) {
      consoleLog('✕ ' + boardData.error, 'error');
      btnUpload.disabled = false;
      return;
    }
    if (boardData.detected_ports && boardData.detected_ports.length > 0) {
      const p = boardData.detected_ports[0];
      port = p.port.address || p.address || '';
      if (p.matching_boards && p.matching_boards.length > 0) {
        fqbn = p.matching_boards[0].fqbn || fqbn;
      } else if (p.suggested_fqbn) {
        // Clon detectado — usar sugerencia o respetar selección del usuario
        const userFqbn = getSetting('board');
        const compat = p.compatible_fqbns || [];
        if (compat.includes(userFqbn)) {
          fqbn = userFqbn;
        } else {
          fqbn = p.suggested_fqbn;
          consoleLog(`💡 Placa no identificada (${p.chip_label || 'clon'}). Asumiendo ${fqbn}.`, 'info');
          consoleLog('   Si es otra placa, cambiala en el selector.', 'info');
        }
      }
      consoleLog(`✓ Placa detectada: ${port} (${fqbn})`, 'success');
      
      // Verificar si el chip necesita drivers
      _checkDriverIssues();
    } else {
      // No se detectó placa — verificar si hay chips conocidos sin driver
      const driverIssues = await _fetchDriverIssues();
      if (driverIssues && driverIssues.recommendations && driverIssues.recommendations.length > 0) {
        consoleLog('⚠ ' + driverIssues.recommendations[0], 'warn');
        for (let i = 1; i < driverIssues.recommendations.length; i++) {
          consoleLog('   ' + driverIssues.recommendations[i], 'info');
        }
      } else {
        consoleLog('✕ No se detectó ningún Arduino. Conectalo por USB.', 'error');
      }
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
      body: JSON.stringify({ code, port, fqbn, tabs })
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

// ── Helpers de drivers USB ─────────────────────

async function _fetchDriverIssues() {
  try {
    const res = await fetch('/api/drivers');
    return await res.json();
  } catch (_) {
    return null;
  }
}

async function _checkDriverIssues() {
  const data = await _fetchDriverIssues();
  if (!data || !data.ports || data.ports.length === 0) return;
  
  for (const p of data.ports) {
    if (p.driver_needed && !p.board_identified) {
      consoleLog(
        `⚠ Chip ${p.chip} en ${p.address}: requiere driver. ` +
        `Descargalo en ${p.driver_url}`,
        'warn'
      );
    }
  }
  if (data.recommendations) {
    for (const rec of data.recommendations) {
      consoleLog('💡 ' + rec, 'info');
    }
  }
}
