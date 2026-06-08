/**
 * ArduBlock — Upload a Arduino vía arduino-cli (local) o Web Serial (instancia pública).
 */

import { generateArduinoCode } from './generator.js';
import { getSetting } from './settings.js';
import { consoleLog, isSerialConnected, disconnectSerial, connectSerial } from './serial.js';
import { flashHexViaSerial, requestAndOpenPort, getDeviceCode, SAMBAFlasher } from './web-serial-flasher.js';

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
  let boardFound = false;

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
      boardFound = true;
      _checkDriverIssues();
    }
    // Si no se detectó placa en el servidor, seguimos para intentar Web Serial
  } catch (e) {
    consoleLog('⚠ Servidor local no disponible: ' + e.message, 'warn');
    // Continuar: intentar Web Serial
  }

  if (boardFound) {
    // ── Modo local: compilar + subir desde servidor ──
    await _uploadLocal(code, port, fqbn, tabs);
  } else {
    // ── Modo Web Serial: compilar en servidor, flashear desde navegador ──
    await _uploadViaWebSerial(code, fqbn, tabs);
  }

  btnUpload.disabled = false;
}

// ── Upload local (servidor) ────────────────────

async function _uploadLocal(code, port, fqbn, tabs) {
  consoleLog('⚙ Compilando y subiendo desde servidor...', 'info');

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
}

// ── Upload vía Web Serial (instancia pública) ──

async function _uploadViaWebSerial(code, fqbn, tabs) {
  if (!('serial' in navigator)) {
    consoleLog('✕ Web Serial no soportado en este navegador.', 'error');
    consoleLog('  Usá Chrome, Edge u Opera para flashear por USB.', 'info');
    return;
  }

  // 0. Verificar compatibilidad de placa con Web Serial
  let deviceCode;
  try {
    deviceCode = getDeviceCode(fqbn);
  } catch (e) {
    consoleLog('⚠ ' + e.message, 'warn');
    consoleLog('  Conectá el Arduino a una máquina con arduino-cli para flashear esta placa.', 'info');
    return;
  }

  // 1. Pedir puerto AHORA (requiere activación de usuario = este click)
  consoleLog('💡 Seleccioná el puerto del Arduino en el diálogo.', 'info');
  if (deviceCode === 'renesas-ra4m1') {
    // ── Modo SAM-BA (Renesas UNO R4) ──
    await _uploadRenesas(code, fqbn, tabs);
    return;
  }

  // ── Modo stk500v1 (AVR) ──
  let flasher;
  try {
    flasher = await requestAndOpenPort(msg => consoleLog(msg));
  } catch (e) {
    consoleLog('✕ No se pudo abrir el puerto: ' + e.message, 'error');
    return;
  }

  // 2. Compilar en servidor
  consoleLog('🌐 Compilando en servidor...', 'info');
  let hexContent;
  try {
    const res = await fetch('/api/compile-hex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, fqbn, tabs })
    });
    const data = await res.json();

    if (!data.success) {
      consoleLog('✕ Error de compilación:', 'error');
      if (data.stdout) {
        for (const line of data.stdout.split('\n').filter(l => l.trim())) {
          consoleLog(line, 'error');
        }
      }
      if (data.stderr) {
        for (const line of data.stderr.split('\n').filter(l => l.trim())) {
          consoleLog(line, 'error');
        }
      }
      await flasher.disconnect();
      return;
    }

    hexContent = data.hex;
    consoleLog('✓ Compilación exitosa', 'success');
    if (data.stdout) {
      const lines = data.stdout.split('\n').filter(l => l.trim());
      const last = lines.slice(-3);
      for (const l of last) consoleLog(l, 'info');
    }
  } catch (e) {
    consoleLog('Error de conexión con el servidor: ' + e.message, 'error');
    await flasher.disconnect();
    return;
  }

  // 3. Flashear por el puerto ya abierto
  try {
    const deviceCode = getDeviceCode(fqbn);
    await flasher.flash(hexContent, deviceCode);
    consoleLog('✅ ¡Sketch flasheado correctamente vía Web Serial!', 'success');
  } catch (e) {
    consoleLog('✕ Error al flashear: ' + e.message, 'error');
    if (e.message.includes('sincronizar') || e.message.includes('bootloader')) {
      consoleLog('  ¿El Arduino está en modo programación? Probá presionar RESET.', 'info');
    }
  } finally {
    await flasher.disconnect();
  }
}

// ── Upload vía SAM-BA (Renesas UNO R4) ─────

async function _uploadRenesas(code, fqbn, tabs) {
  // 1. Compilar en servidor (no necesita puerto)
  consoleLog('🌐 Compilando en servidor...', 'info');
  let binBase64;
  try {
    const res = await fetch('/api/compile-hex', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, fqbn, tabs })
    });
    const data = await res.json();

    if (!data.success) {
      consoleLog('✕ Error de compilación:', 'error');
      if (data.stdout) {
        for (const line of data.stdout.split('\n').filter(l => l.trim())) {
          consoleLog(line, 'error');
        }
      }
      if (data.stderr) {
        for (const line of data.stderr.split('\n').filter(l => l.trim())) {
          consoleLog(line, 'error');
        }
      }
      return;
    }

    if (data.format === 'bin' && data.bin) {
      binBase64 = data.bin;
      consoleLog('✓ Compilación exitosa (.bin)', 'success');
    } else {
      consoleLog('✕ El servidor no devolvió .bin para esta placa', 'error');
      return;
    }
  } catch (e) {
    consoleLog('Error de conexión con el servidor: ' + e.message, 'error');
    return;
  }

  // 2. Solicitar puerto para el touch 1200
  consoleLog('💡 Seleccioná el puerto del Arduino.', 'info');
  let port;
  try {
    port = await navigator.serial.requestPort();
  } catch (e) {
    consoleLog('✕ No se seleccionó ningún puerto', 'error');
    return;
  }

  // 3. Touch 1200 bps para entrar en bootloader
  consoleLog('🔄 Activando bootloader (1200 bps)...', 'info');
  try {
    await port.open({ baudRate: 1200 });
    await new Promise(r => setTimeout(r, 100));
    await port.close();
    consoleLog('   Touch completado', 'success');
  } catch (e) {
    consoleLog('⚠ No se pudo hacer touch 1200 bps: ' + e.message, 'warn');
  }

  // 4. Esperar bootloader + SOLICITAR PUERTO FRESCO
  consoleLog('   Esperando bootloader (1.5s)...', 'info');
  await new Promise(r => setTimeout(r, 1500));
  
  consoleLog('💡 Seleccioná el puerto OTRA VEZ (bootloader).', 'info');
  try {
    port = await navigator.serial.requestPort();
  } catch (e) {
    consoleLog('✕ No se seleccionó puerto para bootloader', 'error');
    return;
  }

  // 5. Abrir puerto fresco a 230400 y flashear inmediatamente
  consoleLog('🔌 Abriendo puerto a 230400 baud...', 'info');
  try {
    await port.open({ baudRate: 230400 });
  } catch (e) {
    consoleLog('✕ No se pudo abrir el puerto: ' + e.message, 'error');
    return;
  }

  const flasher = new SAMBAFlasher(msg => consoleLog(msg));
  try {
    await flasher.connect(port);

    const binData = Uint8Array.from(atob(binBase64), c => c.charCodeAt(0));
    await flasher.flash(binData);
    await flasher.reset();

    consoleLog('✅ ¡Sketch flasheado correctamente vía Web Serial (SAM-BA)!', 'success');

  } catch (e) {
    consoleLog('✕ Error al flashear: ' + e.message, 'error');
    if (e.message.includes('Bootloader no responde')) {
      consoleLog('  ¿El puerto correcto? Después del touch el R4 puede cambiar de nombre.', 'info');
      consoleLog('  Probá presionando RESET dos veces y reintentá.', 'info');
    }
  } finally {
    await flasher.disconnect();
  }
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
