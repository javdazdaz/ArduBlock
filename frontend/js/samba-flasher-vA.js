// ── SAMBAFlasher — Applet ARM (réplica bossac, comandos S/W/X/Y/Z) ──
// Bootloader: SAM-BA extended 2.0 [Arduino:IKXYZ]
// S y W son fire-and-forget (no responden). X, Y, N, V, I sí responden.
// Confirmado funcional desde Python (pyserial) Jul 2026.

const SAMBA_APPLET = new Uint8Array([
  0x09, 0x48, 0x0a, 0x49, 0x0a, 0x4a, 0x02, 0xe0,
  0x08, 0xc9, 0x08, 0xc0, 0x01, 0x3a, 0x00, 0x2a,
  0xfa, 0xd1, 0x04, 0x48, 0x00, 0x28, 0x01, 0xd1,
  0x01, 0x48, 0x85, 0x46, 0x70, 0x47, 0xc0, 0x46,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
]);

const SAMBA_PAGE_SIZE  = 4096;
const SAMBA_BUF_ADDR   = 0x34;         // RAM buffer
const SAMBA_APPLET_ADDR = 0x00000000;
const SAMBA_FLASH_BASE = 0x00000000;   // Applet traduce offset

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

  // ── Helpers ──

  async _writeRaw(data) {
    const w = this.port.writable.getWriter();
    try { await w.write(data); } finally { w.releaseLock(); }
  }

  /** Comando que SÍ responde (N, V, I, X, Y, Z). */
  async _cmdR(command) {
    const shortCmd = command.length > 35 ? command.slice(0, 35) + '…' : command;
    this.log(`   >> ${shortCmd}`, 'dim');
    await this._writeRaw(new TextEncoder().encode(command));
    await this._delay(200);
    const resp = await this._readLine(3000);
    this.log(`   << ${resp.length}B`, 'dim');
    return resp;
  }

  /** Comando fire-and-forget (S+data, W) — NO lee respuesta. */
  async _cmdF(command) {
    const shortCmd = command.length > 35 ? command.slice(0, 35) + '…' : command;
    this.log(`   >> ${shortCmd} (fire-and-forget)`, 'dim');
    await this._writeRaw(new TextEncoder().encode(command));
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

  // ── Init: N# → V# → I# → subir applet → W×2 ──

  async init() {
    this.log('🔄 Inicializando SAM-BA...', 'info');

    let resp = await this._cmdR('N#');
    if (resp.length < 2) throw new Error('Bootloader no responde a N#');

    resp = await this._cmdR('V#');
    const ver = new TextDecoder().decode(resp).trim();
    this.log('   Bootloader: ' + ver, 'info');
    if (!ver.includes('Arduino')) throw new Error('Bootloader no reconocido: ' + ver);

    resp = await this._cmdR('I#');
    const chip = new TextDecoder().decode(resp).trim();
    this.log('   Chip: ' + chip, 'info');

    // Subir applet (fire-and-forget)
    this.log('📟 Subiendo applet...', 'info');
    const appletCmd = `S${SAMBA_APPLET_ADDR.toString(16).padStart(8, '0').toUpperCase()},${SAMBA_APPLET.length.toString(16).padStart(8, '0').toUpperCase()}#`;
    const w = this.port.writable.getWriter();
    try {
      await w.write(new TextEncoder().encode(appletCmd));
      await this._delay(15);
      await w.write(SAMBA_APPLET);
    } finally { w.releaseLock(); }
    this.log(`   >> S+applet (52B, fire-and-forget)`, 'dim');
    await this._delay(500);

    // Configurar applet (fire-and-forget)
    await this._cmdF(`W${(SAMBA_APPLET_ADDR + 0x30).toString(16).padStart(8, '0').toUpperCase()},00000400#`);
    await this._cmdF(`W${(SAMBA_APPLET_ADDR + 0x20).toString(16).padStart(8, '0').toUpperCase()},00000000#`);

    this.log('✓ Applet listo', 'success');
  }

  // ── Chip erase ──

  async chipErase() {
    this.log('🗑️ Borrando flash...', 'info');
    const resp = await this._cmdR('X00000000#');
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

      // 1. Subir página a RAM vía S (fire-and-forget)
      const sCmd = `S${SAMBA_BUF_ADDR.toString(16).padStart(8, '0').toUpperCase()},${SAMBA_PAGE_SIZE.toString(16).padStart(8, '0').toUpperCase()}#`;
      const w = this.port.writable.getWriter();
      try {
        await w.write(new TextEncoder().encode(sCmd));
        await this._delay(15);
        await w.write(pageBuf);
      } finally { w.releaseLock(); }
      await this._delay(2000);  // Bootloader procesa 4KB

      // 2. Y checksum (responde)
      await this._cmdR(`Y${SAMBA_BUF_ADDR.toString(16).padStart(8, '0').toUpperCase()},0#`);

      // 3. Y flash write (responde)
      const flashAddr = SAMBA_FLASH_BASE + offset;
      await this._cmdR(`Y${flashAddr.toString(16).padStart(8, '0').toUpperCase()},00001000#`);

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
