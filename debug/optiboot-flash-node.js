/**
 * Optiboot raw flasher via Node.js serialport
 * Uso: node optiboot-flash.js <archivo.hex> [puerto]
 * Ejemplo: node optiboot-flash.js blank-sketch.ino.hex /dev/ttyUSB0
 */

const { SerialPort } = require('serialport');
const fs = require('fs');
const path = require('path');

const PORT = process.argv[3] || '/dev/ttyUSB0';
const BAUD = 115200;
const PAGE_SIZE = 128; // ATmega328P

const CRC_EOP = 0x20;
const STK_OK = 0x10;
const STK_INSYNC = 0x14;
const MEMTYPE_FLASH = 0x46; // 'F'

const CMD_SYNC = 0x30;
const CMD_LOAD_ADDR = 0x55;
const CMD_PROG_PAGE = 0x64;
const CMD_READ_SIGN = 0x75;
const CMD_LEAVE_PROG = 0x51;

// ── Intel HEX parser ──
function parseHex(hexText) {
  const blocks = [];
  for (const raw of hexText.trim().split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith(':')) continue;
    const byteCount = parseInt(line.slice(1, 3), 16);
    const address = parseInt(line.slice(3, 7), 16);
    const recordType = parseInt(line.slice(7, 9), 16);
    if (recordType !== 0 || byteCount === 0) continue;
    const data = [];
    for (let i = 0; i < byteCount; i++) {
      data.push(parseInt(line.slice(9 + i * 2, 11 + i * 2), 16));
    }
    blocks.push({ address, data: Buffer.from(data) });
  }
  // Merge contiguous blocks into 128-byte aligned pages
  blocks.sort((a, b) => a.address - b.address);
  const merged = [];
  for (const block of blocks) {
    const last = merged[merged.length - 1];
    if (last && last.address + last.data.length === block.address) {
      last.data = Buffer.concat([last.data, block.data]);
    } else {
      merged.push(block);
    }
  }
  return merged;
}

// ── Helpers ──
const delay = ms => new Promise(r => setTimeout(r, ms));

function log(msg, level) {
  const ts = new Date().toISOString().slice(11, 23);
  const prefix = level === 'dim' ? '  ' : level === 'error' ? '✗' : level === 'success' ? '✓' : '•';
  console.log(`${ts} ${prefix} ${msg}`);
}

// ── Main ──
async function main() {
  const hexPath = process.argv[2];
  if (!hexPath) {
    console.error('Uso: node optiboot-flash.js <archivo.hex> [puerto]');
    console.error('Ejemplo: node optiboot-flash.js blank-sketch.ino.hex /dev/ttyUSB0');
    process.exit(1);
  }

  const hexContent = fs.readFileSync(hexPath, 'utf-8');
  const blocks = parseHex(hexContent);
  if (blocks.length === 0) {
    console.error('Archivo .hex vacío o sin datos');
    process.exit(1);
  }

  let totalBytes = 0;
  for (const b of blocks) totalBytes += b.data.length;
  log(`${blocks.length} bloques, ${totalBytes} bytes`, 'info');

  // ── Abrir puerto ──
  log(`Abriendo ${PORT} a ${BAUD} baud...`, 'info');
  const port = await new Promise((res, rej) => {
    const p = new SerialPort({ path: PORT, baudRate: BAUD }, err => {
      if (err) return rej(err);
      res(p);
    });
  });

  try {

  const write = data => new Promise((res, rej) =>
    port.write(data, e => e ? rej(e) : res())
  );

  const setSignals = (dtr, rts) => new Promise((res, rej) =>
    port.set({ dtr, rts }, e => e ? rej(e) : res())
  );

  const writeCmd = async (...bytes) => {
    const msg = Buffer.from([...bytes, CRC_EOP]);
    const hex = Array.from(msg).map(b => b.toString(16).padStart(2, '0')).join(' ');
    log(`TX: ${hex}`, 'dim');
    await write(msg);
  };

  // ── Leer respuesta ──
  async function readResp(timeoutMs = 3000) {
    const start = Date.now();
    const chunks = [];
    while (Date.now() - start < timeoutMs) {
      const data = port.read();
      if (data && data.length > 0) {
        chunks.push(data);
        const all = Buffer.concat(chunks);
        if (all[all.length - 1] === STK_OK) break;
      }
      await delay(20);
    }
    const resp = Buffer.concat(chunks);
    if (resp.length > 0) {
      const hex = Array.from(resp).map(b => b.toString(16).padStart(2, '0')).join(' ');
      log(`RX: ${hex} (${resp.length}B)`, 'dim');
    }
    return resp;
  }

  // ── DTR toggle (entrar al bootloader) ──
  log('Activando bootloader (DTR toggle)...', 'info');
  await setSignals(false, false);
  await delay(50);
  await setSignals(true, true);
  await delay(500);

  // ── Sync ──
  log('Sincronizando bootloader...', 'info');
  let synced = false;
  for (let i = 0; i < 10; i++) {
    await writeCmd(CMD_SYNC);
    await delay(50);
    const resp = await readResp(300);
    if (resp.length >= 2 && resp[0] === STK_INSYNC && resp[1] === STK_OK) {
      log('Bootloader sincronizado', 'success');
      synced = true;
      break;
    }
    // Drenar ruido
    await delay(30);
  }
  if (!synced) throw new Error('No se pudo sincronizar — ¿Arduino conectado? ¿Bootloader activo?');

  // ── Leer firma ──
  await writeCmd(CMD_READ_SIGN);
  await delay(50);
  const sigResp = await readResp(1000);
  if (sigResp.length >= 5 && sigResp[0] === STK_INSYNC && sigResp[4] === STK_OK) {
    log(`Firma: 0x${sigResp[1].toString(16)} 0x${sigResp[2].toString(16)} 0x${sigResp[3].toString(16)}`, 'info');
  } else {
    log('No se pudo leer firma (no crítico)', 'dim');
  }

  // ── Programar flash ──
  let written = 0;
  for (const block of blocks) {
    let addr = block.address;
    const data = block.data;

    // Load address (word address)
    const wordAddr = Math.floor(addr / 2);
    await writeCmd(CMD_LOAD_ADDR, wordAddr & 0xFF, (wordAddr >> 8) & 0xFF);
    await delay(50);
    const laResp = await readResp(1000);
    if (laResp[laResp.length - 1] !== STK_OK) {
      throw new Error(`Error cargando dirección 0x${addr.toString(16)}`);
    }

    // Write pages
    let offset = 0;
    while (offset < data.length) {
      const chunk = data.slice(offset, offset + PAGE_SIZE);
      const sizeLo = chunk.length & 0xFF;
      const sizeHi = (chunk.length >> 8) & 0xFF;

      await writeCmd(CMD_PROG_PAGE, sizeHi, sizeLo, MEMTYPE_FLASH, ...Array.from(chunk));
      await delay(50);
      const pgResp = await readResp(2000);
      if (pgResp[pgResp.length - 1] !== STK_OK) {
        throw new Error(`Error programando página @ 0x${(addr + offset).toString(16)}`);
      }

      offset += PAGE_SIZE;
      written += chunk.length;

      if (offset < data.length) {
        const nextAddr = Math.floor((addr + offset) / 2);
        await writeCmd(CMD_LOAD_ADDR, nextAddr & 0xFF, (nextAddr >> 8) & 0xFF);
        await delay(50);
        await readResp(1000);
      }
    }
  }

  // ── Leave programming mode ──
  await writeCmd(CMD_LEAVE_PROG);
  await delay(50);
  try { await readResp(500); } catch (_) {}

  log(`${written} bytes flasheados`, 'success');

  // ── DTR reset para ejecutar sketch ──
  await setSignals(false, false);
  await delay(200);
  await setSignals(true, true);

  log('Listo. Sketch en ejecución.', 'success');

  await new Promise(r => port.close(r));
  log('Puerto cerrado.', 'dim');

  } finally {
    try { await new Promise(r => port.close(r)); } catch (_) {}
  }
}

main().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
