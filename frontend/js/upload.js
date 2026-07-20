/**
 * ArduBlock — Upload a Arduino
 *
 * Flujo de subida en fases documentadas:
 *
 *   FASE 0 — Pre-vuelo: cerrar monitor serial, generar código
 *   FASE 1 — Detección: /api/boards → ¿placa en el servidor?
 *     ├─ SÍ → PATH A: Upload local (arduino-cli en servidor)
 *     └─ NO → PATH B: Web Serial (flasheo desde navegador)
 *           ├─ B1: AVR (Optiboot raw) — Uno, Nano, Mega
 *           └─ B2: Renesas (SAM-BA)    — UNO R4 WiFi
 *
 * Cada fase loguea en consola qué path se toma y por qué.
 */

import { generateArduinoCode } from './generator.js';
import { getSetting } from './settings.js';
import { consoleLog, disconnectSerial, connectSerial } from './serial.js';
import { requestAndOpenPort, getDeviceCode } from './web-serial-flasher.js';
import { SAMBAFlasher } from './samba-flasher-vA.js';

let workspace, arduinoConsole, btnConsoleToggle, consoleOutput, btnUpload;

export function initUpload(deps) {
  workspace       = deps.workspace;
  arduinoConsole  = deps.arduinoConsole;
  btnConsoleToggle = deps.btnConsoleToggle;
  consoleOutput   = deps.consoleOutput;
  btnUpload       = deps.btnUpload;

  btnUpload.addEventListener('click', uploadToArduino);
}

// ═════════════════════════════════════════════════════════════
// PUNTO DE ENTRADA
// ═════════════════════════════════════════════════════════════

export async function uploadToArduino() {
  arduinoConsole.classList.remove('hidden');
  btnConsoleToggle.classList.add('active');
  consoleOutput.innerHTML = '';
  btnUpload.disabled = true;

  try {
    // ── FASE 0: Pre-vuelo ──────────────────────────
    await _phase0_preflight();

    // ── FASE 1: Detección de placa ──────────────────
    const detection = await _phase1_detectBoard();

    if (detection.boardFound) {
      // ── PATH A: Upload local (arduino-cli) ────────
      await _pathA_uploadLocal(detection);
    } else {
      // ── PATH B: Web Serial (flasheo navegador) ────
      await _pathB_uploadWebSerial(detection);
    }
  } finally {
    btnUpload.disabled = false;
  }
}

// ═════════════════════════════════════════════════════════════
// FASE 0 — Pre-vuelo
// ═════════════════════════════════════════════════════════════

async function _phase0_preflight() {
  consoleLog('═══ FASE 0: Pre-vuelo ═══', 'info');

  // Cerrar monitor serial si estaba abierto (evita puerto ocupado)
  await disconnectSerial(true);
  await new Promise(r => setTimeout(r, 500));
  consoleLog('✓ Monitor serial liberado', 'dim');

  // Generar código C++ desde los bloques
  const code = generateArduinoCode(workspace);
  const tabs = window._tabManager ? window._tabManager.getTabs() : [];
  consoleLog(`✓ Código generado: ${code.split('\n').length} líneas, ${tabs.length} tabs .h`, 'dim');

  return { code, tabs };
}

// ═════════════════════════════════════════════════════════════
// FASE 1 — Detección de placa
// ═════════════════════════════════════════════════════════════

async function _phase1_detectBoard() {
  consoleLog('═══ FASE 1: Detectando placa ═══', 'info');
  consoleLog('🔍 Consultando /api/boards...', 'info');

  const code = generateArduinoCode(workspace);
  const tabs = window._tabManager ? window._tabManager.getTabs() : [];
  let fqbn = getSetting('board');
  let port = '';
  let boardFound = false;
  let serverAvailable = false;

  try {
    const boardRes = await fetch('/api/boards');
    const boardData = await boardRes.json();
    serverAvailable = true;

    if (boardData.error) {
      consoleLog('✕ Error del servidor: ' + boardData.error, 'error');
    } else if (boardData.detected_ports && boardData.detected_ports.length > 0) {
      const p = boardData.detected_ports[0];
      port = p.port.address || p.address || '';

      if (p.matching_boards && p.matching_boards.length > 0) {
        fqbn = p.matching_boards[0].fqbn || fqbn;
        consoleLog(`✓ Placa identificada: ${p.matching_boards[0].name}`, 'success');
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
      consoleLog(`   Puerto: ${port}  |  FQBN: ${fqbn}`, 'dim');
      boardFound = true;
      _checkDriverIssues();
    } else {
      consoleLog('ℹ Ninguna placa detectada en el servidor', 'info');
    }
  } catch (e) {
    consoleLog('ℹ Servidor no disponible: ' + e.message, 'warn');
  }

  if (boardFound) {
    consoleLog('→ TOMANDO PATH A: Upload local (arduino-cli en servidor)', 'info');
    consoleLog(`   Motivo: placa ${port} detectada por /api/boards`, 'dim');
  } else if (serverAvailable) {
    consoleLog('→ TOMANDO PATH B: Web Serial (flasheo desde navegador)', 'info');
    consoleLog('   Motivo: placa NO detectada en servidor, se usará USB del cliente', 'dim');
  } else {
    consoleLog('→ TOMANDO PATH B: Web Serial (flasheo desde navegador)', 'info');
    consoleLog('   Motivo: servidor no disponible, se usará USB del cliente', 'dim');
  }

  return { code, tabs, fqbn, port, boardFound, serverAvailable };
}

// ═════════════════════════════════════════════════════════════
// PATH A — Upload local (arduino-cli)
// ═════════════════════════════════════════════════════════════
//
// Se toma cuando /api/boards detecta la placa en el servidor.
// El backend compila con arduino-cli y sube directamente al
// puerto serial del servidor. NO usa Web Serial.
//

async function _pathA_uploadLocal(detection) {
  const { code, port, fqbn, tabs } = detection;

  consoleLog('═══ PATH A: arduino-cli (local) ═══', 'info');
  consoleLog(`⚙ Compilando y subiendo a ${port} (${fqbn})...`, 'info');

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, port, fqbn, tabs })
    });
    const data = await res.json();

    // Mostrar salida de compilación
    if (data.stdout) {
      for (const line of data.stdout.split('\n').filter(l => l.trim())) {
        if (line.includes('error') || line.includes('Error')) consoleLog(line, 'error');
        else if (line.includes('done') || line.includes('upload') || line.includes('SUCCESS') || line.includes('Done'))
          consoleLog(line, 'success');
        else consoleLog(line, 'dim');
      }
    }
    if (data.stderr) {
      for (const line of data.stderr.split('\n').filter(l => l.trim())) consoleLog(line, 'error');
    }

    if (data.success) {
      consoleLog('✅ ¡Sketch subido correctamente!', 'success');
      setTimeout(() => connectSerial(), 1500);
    } else {
      consoleLog(`❌ Falló en fase: ${data.stage || 'desconocido'}`, 'error');
    }
  } catch (e) {
    consoleLog('Error de conexión: ' + e.message, 'error');
  }
}

// ═════════════════════════════════════════════════════════════
// PATH B — Web Serial (flasheo desde navegador)
// ═════════════════════════════════════════════════════════════
//
// Se toma cuando la placa NO está conectada al servidor
// (ej: instancia pública/hosteada) pero SÍ al navegador vía USB.
// Sub-rutas:
//   B1: AVR (Optiboot raw) — Uno, Nano, Mega
//   B2: Renesas (SAM-BA)   — UNO R4 WiFi
//

async function _pathB_uploadWebSerial(detection) {
  const { code, fqbn, tabs } = detection;

  consoleLog('═══ PATH B: Web Serial ═══', 'info');

  // Verificar soporte del navegador
  if (!('serial' in navigator)) {
    consoleLog('✕ Web Serial no soportado en este navegador.', 'error');
    consoleLog('  Usá Chrome, Edge u Opera para flashear por USB.', 'info');
    return;
  }
  consoleLog('✓ Web Serial disponible en este navegador', 'dim');

  // Determinar protocolo según FQBN
  let deviceCode;
  try {
    deviceCode = getDeviceCode(fqbn);
  } catch (e) {
    consoleLog('⚠ ' + e.message, 'warn');
    consoleLog('  Conectá el Arduino a una máquina con arduino-cli para flashear esta placa.', 'info');
    return;
  }

  // ── Sub-ruta B2: Renesas (SAM-BA) ────────────────
  if (deviceCode === 'renesas-ra4m1') {
    consoleLog('→ PATH B2: SAM-BA (Renesas UNO R4 WiFi)', 'info');
    consoleLog('   Protocolo: SAM-BA nativo Y (sin applet)', 'dim');
    consoleLog('   Requiere: doble-reset para entrar en modo bootloader', 'dim');
    await _pathB2_samba(code, fqbn, tabs);
    return;
  }

  // ── Sub-ruta B1: AVR (Optiboot) ──────────────────
  consoleLog('→ PATH B1: Optiboot raw (AVR)', 'info');
  consoleLog(`   Dispositivo: ${deviceCode}`, 'dim');
  consoleLog('   Protocolo: comandos raw STK (cmd + 0x20)', 'dim');
  await _pathB1_optiboot(code, fqbn, tabs, deviceCode);
}

// ── PATH B1: AVR vía Optiboot ────────────────────

async function _pathB1_optiboot(code, fqbn, tabs, deviceCode) {
  // 1. Solicitar puerto (requiere click del usuario)
  consoleLog('💡 Seleccioná el puerto del Arduino en el diálogo.', 'info');
  let flasher;
  try {
    flasher = await requestAndOpenPort(msg => consoleLog(msg));
    consoleLog('✓ Puerto abierto a 115200 baud', 'dim');
  } catch (e) {
    consoleLog('✕ No se pudo abrir el puerto: ' + e.message, 'error');
    return;
  }

  // 2. Compilar en servidor → obtener .hex
  consoleLog('🌐 Compilando en servidor...', 'info');
  const hexContent = await _compileOnServer(code, fqbn, tabs);
  if (!hexContent) {
    await flasher.disconnect();
    return;
  }

  // 3. Flashear vía Optiboot
  consoleLog('⚡ Flasheando vía Optiboot...', 'info');
  try {
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

// ── PATH B2: Renesas vía SAM-BA ──────────────────

async function _pathB2_samba(code, fqbn, tabs) {
  // 1. Solicitar puerto INMEDIATAMENTE (transient activation del clic)
  consoleLog('💡 Seleccioná el puerto del Arduino en el diálogo.', 'info');
  let port;
  try {
    port = await navigator.serial.requestPort();
  } catch (e) {
    consoleLog('✕ No se seleccionó ningún puerto', 'error');
    return;
  }

  // 2. Compilar en servidor PRIMERO (el bootloader expira en ~5s)
  consoleLog('🌐 Compilando en servidor...', 'info');
  const binBase64 = await _compileOnServer(code, fqbn, tabs, 'bin');
  if (!binBase64) return;

  // 3. AHORA sí: doble-reset y abrir puerto (ventana de ~5s del bootloader)
  consoleLog('🔄 Hacé doble-RESET en el R4 WiFi AHORA.', 'info');
  consoleLog('   El LED L debe quedar pulsando (modo bootloader SAM-BA).', 'info');
  consoleLog('🔌 Abriendo puerto a 230400 baud...', 'info');
  try {
    await port.open({ baudRate: 230400 });
    consoleLog('✓ Puerto SAM-BA abierto', 'dim');
  } catch (e) {
    consoleLog('✕ No se pudo abrir el puerto: ' + e.message, 'error');
    return;
  }

  // 4. Flashear vía SAM-BA
  const flasher = new SAMBAFlasher(msg => consoleLog(msg));
  try {
    await flasher.connect(port);

    const binData = Uint8Array.from(atob(binBase64), c => c.charCodeAt(0));
    consoleLog('⚡ Iniciando secuencia SAM-BA...', 'info');
    consoleLog('   Fases: N# → V# → I# → borrar flash → escribir → Z#', 'dim');

    await flasher.flash(binData);
    await flasher.reset();

    consoleLog('✅ ¡Sketch flasheado correctamente vía Web Serial (SAM-BA)!', 'success');
  } catch (e) {
    consoleLog('✕ Error al flashear: ' + e.message, 'error');
    if (e.message.includes('Bootloader no responde')) {
      consoleLog('  ¿Hiciste doble-RESET? El LED L debe estar pulsando.', 'info');
    }
  } finally {
    await flasher.disconnect();
  }
}

// ═════════════════════════════════════════════════════════════
// HELPERS COMPARTIDOS
// ═════════════════════════════════════════════════════════════

/**
 * Compila el código en el servidor y devuelve el binario.
 * @param {'hex'|'bin'} format — 'hex' para AVR, 'bin' para Renesas
 * @returns {string|null} contenido (hex string o bin base64), o null si falló
 */
async function _compileOnServer(code, fqbn, tabs, format = 'hex') {
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
      return null;
    }

    if (format === 'bin') {
      if (!data.bin) {
        consoleLog('✕ El servidor no devolvió .bin para esta placa', 'error');
        return null;
      }
      consoleLog('✓ Compilación exitosa (.bin)', 'success');
      return data.bin;
    }

    if (!data.hex) {
      consoleLog('✕ El servidor no devolvió .hex para esta placa', 'error');
      return null;
    }
    consoleLog('✓ Compilación exitosa (.hex)', 'success');

    // Mostrar resumen de compilación
    if (data.stdout) {
      const lines = data.stdout.split('\n').filter(l => l.trim());
      const last = lines.slice(-3);
      for (const l of last) consoleLog(l, 'dim');
    }

    return data.hex;

  } catch (e) {
    consoleLog('Error de conexión con el servidor: ' + e.message, 'error');
    consoleLog('  ¿El backend está corriendo? Necesitás arduino-cli en el servidor.', 'info');
    return null;
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
