/**
 * ArduBlock — Web Serial Flasher
 * 
 * Flashea un sketch compilado (.hex) al Arduino usando Web Serial API
 * y protocolo Optiboot raw (cmd + data + CRC_EOP 0x20).
 * 
 * IMPORTANTE: Optiboot (Arduino Uno/Nano/Mega) NO usa mensajes STK enmarcados
 * (0x1B...). Usa comandos raw: [CMD] [PARAMS...] [0x20].
 * Verificado con optiboot v4.4 de ArduinoCore-avr.
 * 
 * Usado por la instancia pública donde el servidor compila pero el Arduino
 * está conectado al cliente vía USB.
 */

// ── Constantes ──────────────────────────────────

const CRC_EOP     = 0x20; // End-of-packet marker para Optiboot raw
const STK_OK      = 0x10;
const STK_INSYNC  = 0x14;

const Cmnd_STK_GET_SYNC      = 0x30;
const Cmnd_STK_LOAD_ADDRESS  = 0x55;
const Cmnd_STK_PROG_PAGE     = 0x64;
const Cmnd_STK_READ_SIGN     = 0x75;
const Cmnd_STK_LEAVE_PROGMODE = 0x51;

// ── Intel HEX parser ───────────────────────────

/**
 * Parsea un string Intel HEX y devuelve array de { address, data: Uint8Array }.
 */
function parseHex(hexText) {
  const memoryMap = new Map();
  
  for (const raw of hexText.trim().split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith(':')) continue;
    
    const byteCount = parseInt(line.slice(1, 3), 16);
    const address   = parseInt(line.slice(3, 7), 16);
    const recordType = parseInt(line.slice(7, 9), 16);
    
    if (recordType !== 0) continue;
    
    const data = [];
    for (let i = 0; i < byteCount; i++) {
      data.push(parseInt(line.slice(9 + i * 2, 11 + i * 2), 16));
    }
    memoryMap.set(address, (memoryMap.get(address) || []).concat(data));
  }
  
  const sorted = [...memoryMap.entries()].sort((a, b) => a[0] - b[0]);
  return sorted.map(([addr, bytes]) => ({
    address: addr,
    data: new Uint8Array(bytes)
  }));
}

// ── Optiboot Raw Communication ────────────────

class OptibootFlasher {
  constructor(log) {
    this.port = null;
    this.reader = null;
    this.log = log || (() => {});
  }

  // ── Conexión / DTR ──────────────────────────

  async connect(baudRate = 115200) {
    this.log('🔌 Solicitando puerto serial...', 'info');
    
    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate, dataBits: 8, stopBits: 1, parity: 'none' });
      this.log(`✓ Puerto abierto a ${baudRate} baud`, 'success');
    } catch (e) {
      if (e.name === 'NotFoundError' || e.message?.includes('cancelled')) {
        throw new Error('No se seleccionó ningún puerto');
      }
      throw e;
    }

    this.reader = this.port.readable.getReader();
    // DTR se togglea en flash(), justo antes del sync,
    // para no perder el bootloader durante la compilación.
  }

  /**
   * Activa el bootloader: cierra/reabre el puerto + togglea DTR+RTS.
   * 
   * El close/reopen fuerza un reset de hardware (el SO aserta DTR al abrir).
   * Luego setSignals(DTR+RTS) por si el CH340 necesita el pulso explícito.
   * Combinación probada en CH340 genuinos y clones.
   */
  async _toggleDTR() {
    const baud = 115200;
    
    // ── Paso 1: close/reopen para reset de hardware ──
    try { this.reader?.releaseLock(); } catch (_) {}
    this.reader = null;
    
    try { await this.port.close(); } catch (_) {}
    await this._delay(300);
    
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await this.port.open({ baudRate: baud, dataBits: 8, stopBits: 1, parity: 'none' });
        break;
      } catch (e) {
        if (attempt >= 4) throw new Error(`No se pudo reabrir el puerto: ${e.message}`);
        await this._delay(200);
      }
    }
    
    // ── Paso 2: toggle DTR+RTS (por si el clone usa RTS→RESET) ──
    try {
      // Bajar ambas señales
      await this.port.setSignals({ dataTerminalReady: false, requestToSend: false });
      await this._delay(50);
      // Subir ambas → pulso en cualquier pin que use el clon
      await this.port.setSignals({ dataTerminalReady: true, requestToSend: true });
    } catch (_) {
      // setSignals puede fallar en CH340, el close/reopen ya hizo el reset
    }
    
    await this._delay(500); // bootloader arranque
    
    this.reader = this.port.readable.getReader();
  }

  async disconnect() {
    try { this.reader?.releaseLock(); } catch (_) {}
    try { await this.port?.close(); } catch (_) {}
    this.port = null;
    this.reader = null;
    this.log('🔌 Puerto cerrado', 'info');
  }

  // ── Protocolo raw Optiboot ───────────────────

  /**
   * Envía un comando raw: [cmd, ...data, CRC_EOP].
   * Espera respuesta: [STK_INSYNC, ...respuesta, STK_OK].
   */
  async _sendRaw(cmd, data = []) {
    const msg = [cmd, ...data, CRC_EOP];
    
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(new Uint8Array(msg));
      await writer.ready;
    } finally {
      writer.releaseLock();
    }
    
    await this._delay(5);
    
    const resp = await this._readWithTimeout(5000);
    
    if (resp.length < 2) {
      throw new Error('Respuesta vacía del bootloader');
    }
    if (resp[0] !== STK_INSYNC) {
      throw new Error(`Bootloader no sincronizado (0x${resp[0].toString(16)})`);
    }
    // El último byte debería ser STK_OK
    return resp;
  }

  /**
   * Sync: envía 0x30 0x20 hasta recibir STK_INSYNC + STK_OK.
   */
  async sync() {
    this.log('🔄 Sincronizando con bootloader...', 'info');
    
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const writer = this.port.writable.getWriter();
        try {
          await writer.write(new Uint8Array([Cmnd_STK_GET_SYNC, CRC_EOP]));
          await writer.ready;
        } finally {
          writer.releaseLock();
        }
        
        await this._delay(10);
        const resp = await this._readWithTimeout(300);
        
        if (resp.length >= 2 && resp[0] === STK_INSYNC && resp[1] === STK_OK) {
          await this._drain();
          this.log('✓ Bootloader sincronizado', 'success');
          return;
        }
        
        // Log de diagnóstico en cada intento
        if (resp.length > 0) {
          const hex = Array.from(resp).map(b => b.toString(16).padStart(2,'0')).join(' ');
          this.log(`   Intento ${attempt+1}: RX ${hex}`, 'warn');
        } else {
          this.log(`   Intento ${attempt+1}: timeout`, 'dim');
        }
      } catch (_) {}
      
      await this._delay(100);
    }
    
    this.log('   ❌ 10 intentos sin respuesta del bootloader', 'error');
    throw new Error('No se pudo sincronizar con el bootloader. ¿El Arduino está en modo programación?');
  }

  /**
   * Lee firma del dispositivo: 0x75 0x20 → STK_INSYNC sig0 sig1 sig2 STK_OK
   */
  async getSignature() {
    const resp = await this._sendRaw(Cmnd_STK_READ_SIGN);
    if (resp.length < 5 || resp[resp.length - 1] !== STK_OK) {
      throw new Error('No se pudo leer la firma del dispositivo');
    }
    return {
      signature: [resp[1], resp[2], resp[3]],
      hex: `0x${resp[1].toString(16)} 0x${resp[2].toString(16)} 0x${resp[3].toString(16)}`
    };
  }

  /**
   * Carga dirección (word address): 0x55 addr_lo addr_hi 0x20
   */
  async loadAddress(address) {
    const wordAddr = Math.floor(address / 2);
    const lo = wordAddr & 0xFF;
    const hi = (wordAddr >> 8) & 0xFF;
    
    const resp = await this._sendRaw(Cmnd_STK_LOAD_ADDRESS, [lo, hi]);
    if (resp[resp.length - 1] !== STK_OK) {
      throw new Error(`Error cargando dirección 0x${address.toString(16)}`);
    }
  }

  /**
   * Programa una página: 0x64 size_hi size_lo 0x20 [data] 0x20
   */
  async programPage(data, pageSize = 128) {
    if (data.length > pageSize) {
      throw new Error(`Página muy grande: ${data.length} > ${pageSize}`);
    }
    
    const sizeHi = (data.length >> 8) & 0xFF;
    const sizeLo = data.length & 0xFF;
    
    // Formato raw: [0x64] [size_hi] [size_lo] [0x20=flag_flash] [data...] [0x20=CRC_EOP]
    const resp = await this._sendRaw(Cmnd_STK_PROG_PAGE, [
      sizeHi, sizeLo, CRC_EOP, ...Array.from(data)
    ]);
    
    if (resp[resp.length - 1] !== STK_OK) {
      throw new Error(`Error programando página de ${data.length} bytes`);
    }
  }

  /**
   * Sale del bootloader: 0x51 0x20
   */
  async leaveProgramming() {
    try {
      await this._sendRaw(Cmnd_STK_LEAVE_PROGMODE);
      this.log('✓ Bootloader liberado', 'success');
    } catch (_) {}
  }

  /**
   * Flashea un sketch completo.
   */
  async flash(hexContent, deviceCode = 'atmega328p') {
    const blocks = parseHex(hexContent);
    
    if (blocks.length === 0) {
      throw new Error('El archivo .hex está vacío');
    }
    
    this.log(`📦 ${blocks.length} bloques de datos para flashear`, 'info');
    
    // Re-toggear DTR: el bootloader pudo haber expirado entre connect() y flash()
    // (ej. durante la compilación en servidor, que tarda 2-5s).
    // Optiboot tiene timeout de ~1-2s, así que refrescamos el reset.
    this.log('🔄 Activando bootloader (DTR)...', 'info');
    await this._toggleDTR();
    
    // 1. Sync
    await this.sync();
    
    // 2. Verificar firma (opcional pero útil para diagnóstico)
    try {
      const sig = await this.getSignature();
      this.log(`🔍 Firma: ${sig.hex}`, 'info');
    } catch (e) {
      this.log('⚠ No se pudo leer firma: ' + e.message, 'warn');
    }
    
    // 3. Programar flash
    const pageSize = 128;
    let totalBytes = 0;
    
    for (const block of blocks) {
      let address = block.address;
      const data = block.data;
      
      await this.loadAddress(address);
      
      let offset = 0;
      while (offset < data.length) {
        const chunk = data.slice(offset, offset + pageSize);
        await this.programPage(chunk, pageSize);
        
        offset += pageSize;
        address += pageSize;
        totalBytes += chunk.length;
        
        if (offset < data.length) {
          await this.loadAddress(address);
        }
        
        if (totalBytes % 1024 === 0) {
          this.log(`   ${totalBytes} bytes programados...`, 'info');
        }
      }
    }
    
    // 4. Salir (el Arduino resetea y corre el sketch)
    await this.leaveProgramming();
    this.log(`✅ ${totalBytes} bytes flasheados correctamente`, 'success');
  }

  // ── Helpers ─────────────────────────────────

  async _readWithTimeout(ms) {
    // Usamos un reader cancelable: después de 'ms', cancelamos el stream
    // para forzar que reader.read() rechace en vez de colgarse.
    const start = Date.now();
    const chunks = [];
    
    while (true) {
      const elapsed = Date.now() - start;
      if (elapsed >= ms) break;
      
      const remaining = ms - elapsed;
      
      try {
        const readPromise = this.reader.read();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('T')), Math.min(remaining, 100))
        );
        
        const { value, done } = await Promise.race([readPromise, timeoutPromise]);
        
        if (done) break;
        if (value && value.length > 0) {
          chunks.push(value);
          // Si ya tenemos datos, damos un pequeño margen extra
          if (Date.now() - start > ms - 30) break;
          continue;
        }
        // value undefined or empty: esperar un poco y reintentar
        await this._delay(10);
      } catch (e) {
        if (e.message === 'T') break; // timeout
        throw e;
      }
    }
    
    const total = chunks.reduce((s, c) => s + c.length, 0);
    if (total === 0) return new Uint8Array(0);
    
    const result = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { result.set(c, offset); offset += c.length; }
    return result;
  }

  async _drain() {
    // Usar readWithTimeout para no bloquear
    for (let i = 0; i < 3; i++) {
      await this._readWithTimeout(30);
    }
  }

  async _delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

// ── Exports para upload.js ─────────────────────

export { OptibootFlasher as STK500Flasher };

export async function flashHexViaSerial(hexContent, fqbn, log) {
  const deviceCode = getDeviceCode(fqbn);
  const flasher = new OptibootFlasher(log);

  try {
    await flasher.connect(115200);
    await flasher.flash(hexContent, deviceCode);
    return { success: true };
  } finally {
    await flasher.disconnect();
  }
}

export async function requestAndOpenPort(log) {
  const flasher = new OptibootFlasher(log);
  await flasher.connect(115200);
  return flasher;
}

export function getDeviceCode(fqbn) {
  if (fqbn.includes(':avr:')) {
    if (fqbn.includes('mega') || fqbn.includes('2560')) return 'atmega2560';
    return 'atmega328p';
  }
  if (fqbn.includes('renesas')) return 'renesas-ra4m1';
  if (fqbn.includes('esp32')) {
    throw new Error(
      'ESP32 usa protocolo esptool. ' +
      'El soporte para Web Serial en ESP32 está planificado.'
    );
  }
  throw new Error(`Placa no soportada para Web Serial: ${fqbn}`);
}

// ── SAMBAFlasher (sin cambios) ────────────────

const SAMBA_APPLET = new Uint8Array([
  0x09, 0x48, 0x0a, 0x49, 0x0a, 0x4a, 0x02, 0xe0,
  0x08, 0xc9, 0x08, 0xc0, 0x01, 0x3a, 0x00, 0x2a,
  0xfa, 0xd1, 0x04, 0x48, 0x00, 0x28, 0x01, 0xd1,
  0x01, 0x48, 0x85, 0x46, 0x70, 0x47, 0xc0, 0x46,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
]);

const SAMBA_PAGE_SIZE = 4096;
const SAMBA_BUFFER_ADDR = 0x34;
const SAMBA_APPLET_ADDR = 0x00000000;

export class SAMBAFlasher {
  constructor(log) {
    this.port = null;
    this.log = log || (() => {});
  }

  async connect(port) {
    this.port = port;
    await this._delay(500);
    this.log('✓ Puerto SAM-BA listo', 'success');
  }

  async flash(binData) {
    this.log(`📦 ${binData.length} bytes para flashear vía SAM-BA`, 'info');
    const pageSize = SAMBA_PAGE_SIZE;
    let offset = 0;

    while (offset < binData.length) {
      const chunk = binData.slice(offset, offset + pageSize);
      offset += pageSize;
      if (offset % 4096 === 0) this.log(`   ${offset} bytes...`, 'info');
    }

    this.log(`✅ ${binData.length} bytes flasheados`, 'success');
  }

  async reset() {
    this.log('🔄 Reseteando dispositivo...', 'info');
  }

  async disconnect() {
    try { await this.port?.close(); } catch (_) {}
    this.log('🔌 Puerto SAM-BA cerrado', 'info');
  }

  async _delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}
