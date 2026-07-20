// ── SAMBAFlasher — Versión A (con applet, comandos S/W) ──
// Extraído de commit 3dcc500: "chore: limpia logs verbose de debug SAM-BA + borra debug-samba.html"
// Uso: import { SAMBAFlasher } from './samba-flasher-vA.js';

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
    this.log = log || (() => {});
  }

  async connect(port) {
    this.port = port;
    await this._delay(500);
    this.log('✓ Puerto SAM-BA listo', 'success');
  }

  async disconnect() {
    try { await this.port?.close(); } catch (_) {}
    this.port = null;
    this.log('🔌 Puerto SAM-BA cerrado', 'info');
  }

  async _cmd(command) {
    const shortCmd = command.length > 35 ? command.slice(0, 35) + '…' : command;
    this.log(`   >> ${shortCmd}`, 'dim');
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(new TextEncoder().encode(command));
    } finally {
      writer.releaseLock();
    }
    await this._delay(200);
    const resp = await this._readLine(3000);
    this.log(`   << ${resp.length}B`, 'dim');
    return resp;
  }

  async _writeRAM(addr, data) {
    const cmd = `S${addr.toString(16).padStart(8, '0').toUpperCase()},${data.length.toString(16).padStart(8, '0').toUpperCase()}#`;
    this.log(`   >> ${cmd} + ${data.length}B`, 'dim');
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(new TextEncoder().encode(cmd));
      await this._delay(15);
      await writer.write(data);
    } finally {
      writer.releaseLock();
    }
    this.log(`   << (fire-and-forget, delay 100ms)`, 'dim');
    await this._delay(100);
  }

  async _readLine(timeoutMs) {
    const start = Date.now();
    const chunks = [];
    const rd = this.port.readable.getReader();
    try {
      while (Date.now() - start < timeoutMs) {
        const { value, done } = await rd.read();
        if (value && value.length > 0) {
          chunks.push(value);
          const total = chunks.reduce((s, c) => s + c.length, 0);
          const all = new Uint8Array(total);
          let off = 0;
          for (const c of chunks) { all.set(c, off); off += c.length; }
          if (all.includes(0x0a)) return all;
        }
        if (done) break;
        await this._delay(30);
      }
      if (chunks.length === 0) return new Uint8Array(0);
      const total = chunks.reduce((s, c) => s + c.length, 0);
      const all = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) { all.set(c, off); off += c.length; }
      return all;
    } finally {
      try { rd.releaseLock(); } catch (_) {}
    }
  }

  async _delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  /**
   * Secuencia de init: N#, V#, I# + subir applet.
   */
  async init() {
    this.log('🔄 Inicializando SAM-BA...', 'info');

    let resp = await this._cmd('N#');
    if (resp.length < 2) throw new Error('Bootloader no responde a N#');

    resp = await this._cmd('V#');
    const ver = new TextDecoder().decode(resp).trim();
    this.log('   Bootloader: ' + ver, 'info');
    if (!ver.includes('Arduino')) throw new Error('Bootloader no reconocido: ' + ver);

    resp = await this._cmd('I#');
    const chip = new TextDecoder().decode(resp).trim();
    this.log('   Chip: ' + chip, 'info');

    // Subir applet a RAM
    this.log('📟 Subiendo applet...', 'info');
    await this._writeRAM(SAMBA_APPLET_ADDR, SAMBA_APPLET);

    // Configurar applet
    await this._cmd(`W${(SAMBA_APPLET_ADDR + 0x30).toString(16).padStart(8, '0').toUpperCase()},00000400#`);
    await this._cmd(`W${(SAMBA_APPLET_ADDR + 0x20).toString(16).padStart(8, '0').toUpperCase()},00000000#`);

    this.log('✓ Applet listo', 'success');
  }

  /**
   * Borra todo el flash (chip erase).
   */
  async chipErase() {
    this.log('🗑️ Borrando flash...', 'info');
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
      const chunkSize = Math.min(SAMBA_PAGE_SIZE, binData.length - offset);
      pageBuf.fill(0x00);
      pageBuf.set(binData.slice(offset, offset + chunkSize));

      await this._writeRAM(SAMBA_BUFFER_ADDR, pageBuf);
      await this._cmd(`Y${SAMBA_BUFFER_ADDR.toString(16).padStart(8, '0').toUpperCase()},0#`);

      const flashAddr = SAMBA_FLASH_BASE + offset;
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

export { SAMBAFlasher };
