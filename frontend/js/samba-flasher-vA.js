// ── SAMBAFlasher — Protocolo nativo Y (sin applet, sin S/W) ──
// Bootloader: SAM-BA extended 2.0 [Arduino:IKXYZ]
// Solo comandos I, K, X, Y, Z. Sin S ni W.
// Basado en debug/samba-webserial-test.html (verificado Jul 2026).

const SAMBA_PAGE_SIZE = 4096;
const SAMBA_BUF_ADDR   = 0x20000100;  // RAM buffer
const SAMBA_FLASH_BASE = 0x00004000;  // App después del bootloader

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

  // ── Write raw (fire-and-forget, sin leer respuesta) ──
  async _writeRaw(data) {
    const w = this.port.writable.getWriter();
    try { await w.write(data); } finally { w.releaseLock(); }
  }

  // ── Enviar comando texto + leer respuesta ──
  async _cmd(command) {
    const shortCmd = command.length > 35 ? command.slice(0, 35) + '…' : command;
    this.log(`   >> ${shortCmd}`, 'dim');
    await this._writeRaw(new TextEncoder().encode(command));
    await this._delay(200);
    const resp = await this._readLine(3000);
    this.log(`   << ${resp.length}B`, 'dim');
    return resp;
  }

  // ── Leer hasta \n o timeout ──
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

  // ── Init: N# → V# → I# ──
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

    this.log('✓ Init completo', 'success');
  }

  // ── Chip erase ──
  async chipErase() {
    this.log('🗑️ Borrando flash...', 'info');
    const resp = await this._cmd('X00000000#');
    const text = new TextDecoder().decode(resp).trim();
    if (!text.startsWith('X')) throw new Error('Chip erase falló: ' + text);
    this.log('✓ Flash borrado', 'success');
  }

  // ── Flashear .bin ──
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
      const flashAddr = SAMBA_FLASH_BASE + offset;

      // Subir página a RAM (Y upload)
      const uploadCmd = `Y${SAMBA_BUF_ADDR.toString(16).padStart(8, '0').toUpperCase()},${SAMBA_PAGE_SIZE.toString(16).padStart(8, '0').toUpperCase()}#`;
      this.log(`   ↑ 0x${flashAddr.toString(16).toUpperCase()} [${pageNum + 1}/${totalPages}]`, 'dim');
      await this._writeRaw(new TextEncoder().encode(uploadCmd));
      await this._delay(15);
      await this._writeRaw(pageBuf);
      await this._delay(2000);  // Bootloader procesa 4KB

      // Flash write (fire-and-forget — bootloader puede no responder)
      const flashCmd = `Y${flashAddr.toString(16).padStart(8, '0').toUpperCase()},00001000#`;
      await this._writeRaw(new TextEncoder().encode(flashCmd));
      this.log(`   ↓ flash write`, 'dim');
      await this._delay(2000);  // Programación de flash

      offset += SAMBA_PAGE_SIZE;
      pageNum++;

      if (pageNum % 4 === 0 || pageNum === totalPages) {
        this.log(`   ${pageNum}/${totalPages} páginas (${Math.round(pageNum / totalPages * 100)}%)`, 'info');
      }
    }

    this.log(`✅ ${offset} bytes flasheados`, 'success');
  }

  // ── Reset CPU ──
  async reset() {
    try {
      await this._writeRaw(new TextEncoder().encode('Z#'));
      this.log('✓ CPU reseteada', 'success');
    } catch (_) { /* ignorar */ }
  }
}

export { SAMBAFlasher };
