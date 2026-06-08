/**
 * ArduBlock — Web Serial Flasher
 * 
 * Flashea un sketch compilado (.hex) al Arduino usando Web Serial API
 * y protocolo stk500v1 (compatible con bootloader Optiboot de Uno/Nano/Mega).
 * 
 * Usado por la instancia pública donde el servidor compila pero el Arduino
 * está conectado al cliente vía USB.
 */

// ── Constantes STK500v1 ────────────────────────

const STK_OK      = 0x10;
const STK_FAILED  = 0x11;
const STK_UNKNOWN = 0x12;
const STK_NODEVICE = 0x13;
const STK_INSYNC  = 0x14;
const STK_NOSYNC  = 0x15;

const Cmnd_STK_GET_SYNC      = 0x30;
const Cmnd_STK_GET_SIGN_ON   = 0x31;
const Cmnd_STK_SET_DEVICE    = 0x42;
const Cmnd_STK_ENTER_PROGMODE = 0x50;
const Cmnd_STK_LEAVE_PROGMODE = 0x51;
const Cmnd_STK_LOAD_ADDRESS  = 0x55;
const Cmnd_STK_PROG_PAGE     = 0x64;
const Cmnd_STK_READ_PAGE     = 0x74;
const Cmnd_STK_READ_SIGN     = 0x75;

// ── Intel HEX parser ───────────────────────────

/**
 * Parsea un string Intel HEX y devuelve array de { address, data: Uint8Array }.
 * Cada entrada representa un bloque contiguo de datos.
 */
function parseHex(hexText) {
  const lines = hexText.trim().split(/\r?\n/);
  /** @type {Map<number, number[]>} */
  const memoryMap = new Map();
  
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith(':')) continue;
    
    const byteCount = parseInt(line.slice(1, 3), 16);
    const address   = parseInt(line.slice(3, 7), 16);
    const recordType = parseInt(line.slice(7, 9), 16);
    
    if (recordType !== 0) continue; // solo datos, ignorar EOF/extended
    
    const data = [];
    for (let i = 0; i < byteCount; i++) {
      data.push(parseInt(line.slice(9 + i * 2, 11 + i * 2), 16));
    }
    memoryMap.set(address, (memoryMap.get(address) || []).concat(data));
  }
  
  // Ordenar por dirección
  const sorted = [...memoryMap.entries()].sort((a, b) => a[0] - b[0]);
  return sorted.map(([addr, bytes]) => ({
    address: addr,
    data: new Uint8Array(bytes)
  }));
}

// ── STK500 Communication ───────────────────────

class STK500Flasher {
  constructor(log) {
    /** @type {SerialPort|null} */
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.seq = 0;
    /** @type {(msg: string, level?: string) => void} */
    this.log = log || (() => {});
  }

  /**
   * Solicita puerto serial al usuario y lo abre.
   * @param {number} baudRate 
   */
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

    // Configurar para lectura/escritura
    this.reader = this.port.readable.getReader();
    
    // Pequeño delay para que el bootloader se estabilice
    await this._delay(200);
  }

  /**
   * Cierra el puerto serial.
   */
  async disconnect() {
    try { this.reader?.releaseLock(); } catch (_) {}
    try { await this.port?.close(); } catch (_) {}
    this.port = null;
    this.reader = null;
    this.log('🔌 Puerto cerrado', 'info');
  }

  /**
   * Envía un comando stk500 y espera la respuesta.
   */
  async _sendCommand(cmd, data = []) {
    const msgLength = data.length;
    const token = 0x0E; // token fijo
    
    // Construir mensaje
    const msg = [0x1B, this.seq, msgLength, token, cmd, ...data];
    
    // Checksum: XOR de seq..último byte de data
    let checksum = 0x00;
    for (let i = 1; i < msg.length; i++) {
      checksum ^= msg[i];
    }
    msg.push(checksum);
    
    // Incrementar seq
    this.seq = (this.seq + 1) & 0xFF;
    
    // Enviar
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(new Uint8Array(msg));
    } finally {
      writer.releaseLock();
    }
    
    // Leer respuesta (stk500 responses son cortas: 2-10 bytes)
    const timeout = 5000;
    const response = await this._readWithTimeout(timeout);
    
    if (response.length < 2) {
      throw new Error('Respuesta vacía del bootloader');
    }
    
    // Verificar sync
    if (response[0] !== STK_INSYNC) {
      throw new Error(`Bootloader no sincronizado (${response[0].toString(16)})`);
    }
    
    return response;
  }

  /**
   * Lee del puerto serial con timeout real.
   */
  async _readWithTimeout(ms) {
    const readPromise = (async () => {
      const chunks = [];
      while (true) {
        const { value, done } = await this.reader.read();
        if (value) chunks.push(value);
        if (done) break;
        // Si ya tenemos datos, damos un pequeño margen extra y salimos
        if (chunks.length > 0) {
          await this._delay(30);
          break;
        }
      }
      const total = chunks.reduce((s, c) => s + c.length, 0);
      const result = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        result.set(c, offset);
        offset += c.length;
      }
      return result;
    })();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    );

    try {
      return await Promise.race([readPromise, timeoutPromise]);
    } catch (e) {
      if (e.message === 'Timeout') {
        return new Uint8Array(0);
      }
      throw e;
    }
  }

  async _delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  /**
   * Sincroniza con el bootloader.
   */
  async sync() {
    this.log('🔄 Sincronizando con bootloader...', 'info');
    
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const writer = this.port.writable.getWriter();
        try {
          await writer.write(new Uint8Array([0x30, 0x20]));
        } finally {
          writer.releaseLock();
        }
        
        const resp = await this._readWithTimeout(200);
        
        if (resp.length >= 2 && resp[0] === STK_INSYNC && resp[1] === STK_OK) {
          // Limpiar buffer residual
          while (true) {
            try {
              const { value, done } = await this.reader.read();
              if (done || !value || value.length === 0) break;
            } catch (_) { break; }
          }
          this.log('✓ Bootloader sincronizado', 'success');
          return;
        }
      } catch (_) { /* reintentar */ }
      
      await this._delay(100);
    }
    
    throw new Error('No se pudo sincronizar con el bootloader. ¿El Arduino está en modo programación?');
  }

  /**
   * Obtiene la firma del dispositivo.
   */
  async getSignature() {
    const resp = await this._sendCommand(Cmnd_STK_READ_SIGN);
    if (resp[1] !== STK_OK || resp.length < 5) {
      throw new Error('No se pudo leer la firma del dispositivo');
    }
    return {
      signature: [resp[2], resp[3], resp[4]],
      hex: `0x${resp[2].toString(16)} 0x${resp[3].toString(16)} 0x${resp[4].toString(16)}`
    };
  }

  /**
   * Entra en modo programación.
   * @param {string} deviceCode - 'atmega328p', 'atmega2560', etc.
   */
  async enterProgramming(deviceCode = 'atmega328p') {
    this.log('📟 Entrando en modo programación...', 'info');
    
    // Configurar dispositivo
    // ATmega328P: device=0x86, revision=0x00, progtype=0x00, parmode=0x01
    // polling=0x01, selftimed=0x01, lock=0x3F, fuse=0x0F, flash=0xFF
    const deviceParams = {
      'atmega328p':  [0x86, 0x00, 0x00, 0x01, 0x01, 0x01, 0x3F, 0x0F, 0x00, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
    };
    
    const params = deviceParams[deviceCode] || deviceParams['atmega328p'];
    
    // Set device parameters
    await this._sendCommand(Cmnd_STK_SET_DEVICE, params);
    
    // Enter programming mode
    const resp = await this._sendCommand(Cmnd_STK_ENTER_PROGMODE);
    if (resp[1] !== STK_OK) {
      throw new Error('No se pudo entrar en modo programación');
    }
    
    this.log('✓ Modo programación activado', 'success');
  }

  /**
   * Sale del modo programación.
   */
  async leaveProgramming() {
    try {
      await this._sendCommand(Cmnd_STK_LEAVE_PROGMODE);
      this.log('✓ Modo programación desactivado', 'success');
    } catch (_) { /* ignorar errores al salir */ }
  }

  /**
   * Carga dirección de memoria.
   */
  async loadAddress(address) {
    // La dirección se envía como 2 bytes (word address, no byte address)
    const wordAddr = Math.floor(address / 2);
    const hi = (wordAddr >> 8) & 0xFF;
    const lo = wordAddr & 0xFF;
    
    const resp = await this._sendCommand(Cmnd_STK_LOAD_ADDRESS, [lo, hi]);
    if (resp[1] !== STK_OK) {
      throw new Error(`Error cargando dirección 0x${address.toString(16)}`);
    }
  }

  /**
   * Programa una página de flash (max 128 bytes para ATmega328P).
   */
  async programPage(data, pageSize = 128) {
    if (data.length > pageSize) {
      throw new Error(`Página muy grande: ${data.length} > ${pageSize}`);
    }
    
    // Construir mensaje: [size_hi, size_lo, flags, data..., sync_cmd]
    const sizeHi = (data.length >> 8) & 0xFF;
    const sizeLo = data.length & 0xFF;
    const flags = 0x20; // F = 1 (flash memory)
    
    const payload = [sizeHi, sizeLo, flags, ...Array.from(data)];
    
    const resp = await this._sendCommand(Cmnd_STK_PROG_PAGE, payload);
    if (resp[1] !== STK_OK) {
      throw new Error(`Error programando página de ${data.length} bytes`);
    }
  }

  /**
   * Flashea un sketch completo.
   * @param {string} hexContent - contenido del archivo .hex (Intel HEX)
   * @param {string} deviceCode - código del microcontrolador
   */
  async flash(hexContent, deviceCode = 'atmega328p') {
    const blocks = parseHex(hexContent);
    
    if (blocks.length === 0) {
      throw new Error('El archivo .hex está vacío');
    }
    
    this.log(`📦 ${blocks.length} bloques de datos para flashear`, 'info');
    
    await this.sync();
    await this.enterProgramming(deviceCode);
    
    // Verificar firma
    const sig = await this.getSignature();
    this.log(`🔍 Firma: ${sig.hex}`, 'info');
    
    // Programar flash
    const pageSize = 128;
    let totalBytes = 0;
    
    for (const block of blocks) {
      let address = block.address;
      const data = block.data;
      
      // Cargar dirección
      await this.loadAddress(address);
      
      // Programar en páginas
      let offset = 0;
      while (offset < data.length) {
        const chunk = data.slice(offset, offset + pageSize);
        await this.programPage(chunk, pageSize);
        
        offset += pageSize;
        address += pageSize;
        totalBytes += chunk.length;
        
        // Cargar siguiente dirección si hay más datos
        if (offset < data.length) {
          await this.loadAddress(address);
        }
        
        // Progreso
        if (totalBytes % 1024 === 0) {
          this.log(`   ${totalBytes} bytes programados...`, 'info');
        }
      }
    }
    
    await this.leaveProgramming();
    this.log(`✅ ${totalBytes} bytes flasheados correctamente`, 'success');
  }

  /**
   * Toca el puerto a 1200 baud para activar bootloader en placas con USB nativo
   * (Leonardo, Micro, etc.). Para Uno/Nano con Optiboot, esto puede omitirse.
   */
  async touch1200(baudRate = 1200) {
    try {
      // Abrir brevemente a 1200 baud y cerrar
      // Esto activa el bootloader en placas como Leonardo
      await this.port.close();
      await this.port.open({ baudRate, dataBits: 8, stopBits: 1, parity: 'none' });
      await this._delay(100);
      await this.port.close();
      await this._delay(500); // esperar que el bootloader inicie
      this.log('💡 Touch 1200 baud enviado', 'info');
    } catch (_) {
      // Algunas placas no soportan esto, continuar
    }
  }
}

/**
 * Flujo completo: solicitar puerto → flashear → desconectar.
 * 
 * @param {string} hexContent - contenido .hex (Intel HEX)
 * @param {string} fqbn - Fully Qualified Board Name
 * @param {(msg: string, level?: string) => void} log - callback de log
 */
export async function flashHexViaSerial(hexContent, fqbn, log) {
  const deviceCode = getDeviceCode(fqbn);
  const flasher = new STK500Flasher(log);

  try {
    await flasher.connect(115200);
    await flasher.flash(hexContent, deviceCode);
    return { success: true };
  } finally {
    await flasher.disconnect();
  }
}

/**
 * Solicita el puerto serial al usuario y lo abre.
 * Debe llamarse dentro de un evento de usuario (click) para que
 * requestPort() no falle con "requires user activation".
 *
 * @param {(msg: string, level?: string) => void} log
 * @returns {STK500Flasher} instancia con puerto ya abierto
 */
export async function requestAndOpenPort(log) {
  const flasher = new STK500Flasher(log);
  await flasher.connect(115200);
  return flasher;
}

/**
 * Devuelve el código de dispositivo stk500 según el FQBN.
 * Lanza error si la placa no es AVR (no soportada por stk500v1).
 */
export function getDeviceCode(fqbn) {
  // Solo AVR es soportado por stk500v1
  if (fqbn.includes(':avr:')) {
    if (fqbn.includes('mega') || fqbn.includes('2560')) {
      return 'atmega2560';
    }
    return 'atmega328p';
  }

  // Renesas (UNO R4) — protocolo SAM-BA
  if (fqbn.includes('renesas')) {
    return 'renesas-ra4m1';
  }

  // ESP32 — soporte planificado
  if (fqbn.includes('esp32')) {
    throw new Error(
      'ESP32 usa protocolo esptool. ' +
      'El soporte para Web Serial en ESP32 está planificado (ver INTERNO.md). ' +
      'Por ahora, conectalo a una máquina con arduino-cli.'
    );
  }

  throw new Error(`Placa no soportada para Web Serial: ${fqbn}. Solo AVR (Uno R3, Nano, Mega).`);
}


// ═══════════════════════════════════════════════════════════════
// SAM-BA Flasher para Renesas RA4M1 (UNO R4 WiFi/Minima)
// Protocolo documentado vía strace de bossac 1.9.1-arduino5
// ═══════════════════════════════════════════════════════════════

/** Applet de 52 bytes (ARM Thumb) para chipErase y writeBuffer. */
const SAMBA_APPLET = new Uint8Array([
  0x09, 0x48, 0x0a, 0x49, 0x0a, 0x4a, 0x02, 0xe0,
  0x08, 0xc9, 0x08, 0xc0, 0x01, 0x3a, 0x00, 0x2a,
  0xfa, 0xd1, 0x04, 0x48, 0x00, 0x28, 0x01, 0xd1,
  0x01, 0x48, 0x85, 0x46, 0x70, 0x47, 0xc0, 0x46,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
]);

const SAMBA_PAGE_SIZE = 4096;  // R4 usa páginas de 4KB
const SAMBA_BUFFER_ADDR = 0x34;  // Dirección RAM para buffer de página
const SAMBA_APPLET_ADDR = 0x00000000;
const SAMBA_FLASH_BASE = 0x00000000;

class SAMBAFlasher {
  constructor(log) {
    this.port = null;
    this.writer = null;
    this.reader = null;
    this.log = log || (() => {});
  }

  /**
   * Abre el puerto serial ya solicitado (requestPort lo hizo el caller).
   * @param {SerialPort} port
   */
  async connect(port) {
    this.port = port;
    // Configurar para lectura/escritura
    // NOTA: NO reconfigurar baud rate — el bootloader está a 230400
    this.reader = this.port.readable.getReader();
    // Pequeña espera para estabilizar
    await this._delay(300);
    this.log('✓ Puerto SAM-BA listo', 'success');
  }

  async disconnect() {
    try { this.reader?.releaseLock(); } catch (_) {}
    try { await this.port?.close(); } catch (_) {}
    this.port = null;
    this.reader = null;
    this.log('🔌 Puerto SAM-BA cerrado', 'info');
  }

  /** Envía comando SAM-BA y lee respuesta (terminada en \n\r). */
  async _cmd(command) {
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(new TextEncoder().encode(command));
    } finally {
      writer.releaseLock();
    }

    // Pequeña pausa para que el bootloader procese
    await this._delay(30);
    // Leer respuesta
    return await this._readLine(5000);
  }

  /** Envía comando S (write to RAM) + datos binarios. */
  async _writeRAM(addr, data) {
    const cmd = `S${addr.toString(16).padStart(8, '0').toUpperCase()},${data.length.toString(16).padStart(8, '0').toUpperCase()}#`;
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(new TextEncoder().encode(cmd));
      // Pausa para que el bootloader procese el header S antes de recibir datos
      await this._delay(15);
      await writer.write(data);
      // Esperar a que los datos se envíen
      await this._delay(30);
    } finally {
      writer.releaseLock();
    }
  }

  /** 
   * Lee respuesta del bootloader. El bootloader envía la respuesta inmediatamente
   * después de cada comando, terminada en \n. Usamos reader.read() secuencial
   * acumulando hasta encontrar \n, con timeout total.
   */
  async _readLine(timeoutMs) {
    const start = Date.now();
    const chunks = [];
    
    while (Date.now() - start < timeoutMs) {
      // reader.read() devuelve {value, done}. Si no hay datos aún, se queda esperando.
      // Como el bootloader responde rápido, un timeout de 500ms por lectura alcanza.
      const remaining = timeoutMs - (Date.now() - start);
      if (remaining <= 0) break;
      
      try {
        // Cancelar cualquier read previo si existe (esto es seguro en Web Serial)
        await this.reader.cancel();
      } catch (_) {}
      
      try {
        const { value, done } = await this._readWithTimeout(Math.min(500, remaining));
        if (value && value.length > 0) {
          chunks.push(value);
          // ¿Ya tenemos \n?
          let totalLen = chunks.reduce((s, c) => s + c.length, 0);
          if (totalLen > 0) {
            const all = new Uint8Array(totalLen);
            let off = 0;
            for (const c of chunks) { all.set(c, off); off += c.length; }
            if (all.includes(0x0a)) return all;
          }
        }
        if (done) break;
      } catch (_) {
        // Timeout de esta lectura, reintentar
        await this._delay(50);
      }
    }
    
    if (chunks.length === 0) return new Uint8Array(0);
    const totalLen = chunks.reduce((s, c) => s + c.length, 0);
    const all = new Uint8Array(totalLen);
    let off = 0;
    for (const c of chunks) { all.set(c, off); off += c.length; }
    return all;
  }

  /**
   * reader.read() con timeout.
   */
  async _readWithTimeout(ms) {
    let timer;
    try {
      return await Promise.race([
        this.reader.read(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Timeout')), ms);
        })
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async _delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  /**
   * Secuencia de init: N#, V#, I#.
   */
  async init() {
    this.log('🔄 Inicializando SAM-BA...', 'info');

    // N# — binary mode
    let resp = await this._cmd('N#');
    if (resp.length < 2) throw new Error('Bootloader no responde a N#');

    // V# — version
    resp = await this._cmd('V#');
    const ver = new TextDecoder().decode(resp).trim();
    this.log('   Bootloader: ' + ver, 'info');
    if (!ver.includes('Arduino')) throw new Error('Bootloader no reconocido: ' + ver);

    // I# — chip ID
    resp = await this._cmd('I#');
    const chip = new TextDecoder().decode(resp).trim();
    this.log('   Chip: ' + chip, 'info');

    // Subir applet
    this.log('📟 Subiendo applet...', 'info');
    await this._writeRAM(SAMBA_APPLET_ADDR, SAMBA_APPLET);

    // Configurar applet: writeWord(0x30, 0x400) y writeWord(0x20, 0)
    await this._cmd(`W${(SAMBA_APPLET_ADDR + 0x30).toString(16).padStart(8, '0').toUpperCase()},00000400#`);
    await this._cmd(`W${(SAMBA_APPLET_ADDR + 0x20).toString(16).padStart(8, '0').toUpperCase()},00000000#`);

    this.log('✓ Applet listo', 'success');
  }

  /**
   * Borra todo el flash (chip erase).
   */
  async chipErase() {
    this.log('🗑️ Borrando flash...', 'info');
    // Ejecutar applet en addr 0 para chipErase
    const resp = await this._cmd('X00000000#');
    const text = new TextDecoder().decode(resp).trim();
    if (!text.startsWith('X')) throw new Error('Chip erase falló: ' + text);
    this.log('✓ Flash borrado', 'success');
  }

  /**
   * Flashea el .bin completo.
   * @param {Uint8Array} binData — contenido del .bin (ya decodificado de base64)
   */
  async flash(binData) {
    const totalPages = Math.ceil(binData.length / SAMBA_PAGE_SIZE);
    this.log(`📦 ${totalPages} páginas (${binData.length} bytes)`, 'info');

    await this.init();
    await this.chipErase();

    let offset = 0;
    let pageNum = 0;
    const pageBuf = new Uint8Array(SAMBA_PAGE_SIZE);

    while (offset < binData.length) {
      // Preparar página (rellenar con 0x00 si es parcial)
      const chunkSize = Math.min(SAMBA_PAGE_SIZE, binData.length - offset);
      pageBuf.fill(0x00);
      pageBuf.set(binData.slice(offset, offset + chunkSize));

      // 1. Subir página a RAM
      await this._writeRAM(SAMBA_BUFFER_ADDR, pageBuf);

      // 2. Checksum
      await this._cmd(`Y${SAMBA_BUFFER_ADDR.toString(16).padStart(8, '0').toUpperCase()},0#`);

      // 3. Flashear a flash
      const flashAddr = (SAMBA_FLASH_BASE + offset);
      await this._cmd(`Y${flashAddr.toString(16).padStart(8, '0').toUpperCase()},00001000#`);

      offset += SAMBA_PAGE_SIZE;
      pageNum++;

      if (pageNum % 4 === 0 || pageNum === totalPages) {
        this.log(`   ${pageNum}/${totalPages} páginas (${Math.round(pageNum/totalPages*100)}%)`, 'info');
      }
    }

    this.log(`✅ ${offset} bytes flasheados`, 'success');
  }

  /**
   * Resetea la CPU.
   */
  async reset() {
    try {
      await this._cmd('Z#');
      this.log('✓ CPU reseteada', 'success');
    } catch (_) { /* ignorar */ }
  }
}

export { STK500Flasher, SAMBAFlasher };
