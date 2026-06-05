/**
 * ArduBlock — Exportar sketch como .zip
 *
 * Genera un archivo .zip con sketch.ino + tabs .h + metadatos.
 * ZIP Store (sin compresión) — el código es texto, no necesita compresión.
 *
 * Expone exportSketch() — vinculado al botón Exportar en la toolbar Arduino.
 */

import { getInoContent } from './tab-manager.js';
import { getSetting } from './settings.js';
import { getProjectName } from './project-manager.js';

// ═══ CRC-32 (tabla precalculada) ═══════════════

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[n] = c;
}

function crc32(data) {
  let crc = 0xFFFFFFFF;
  const bytes = typeof data === 'string'
    ? new TextEncoder().encode(data)
    : new Uint8Array(data);
  for (const b of bytes) {
    crc = CRC_TABLE[(crc ^ b) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ═══ ZIP helpers ════════════════════════════════

/**
 * Formatea una fecha como DOS date/time (2+2 bytes).
 */
function dosDateTime(date) {
  const dt = date || new Date();
  const time = (dt.getSeconds() >> 1) | (dt.getMinutes() << 5) | (dt.getHours() << 11);
  const dosDate = dt.getDate() | ((dt.getMonth() + 1) << 5) | ((dt.getFullYear() - 1980) << 9);
  return { time, date: dosDate };
}

/**
 * Construye un archivo ZIP en memoria (Store method, sin compresión).
 * @param {Array<{name: string, data: string|Uint8Array}>} files
 * @returns {Uint8Array} ZIP completo
 */
function buildZip(files) {
  const now = dosDateTime(new Date());
  const parts = [];
  const centralDir = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name);
    const dataBytes = typeof file.data === 'string'
      ? new TextEncoder().encode(file.data)
      : file.data;

    const crc = crc32(dataBytes);
    const size = dataBytes.length;
    const nameLen = nameBytes.length;

    // ── Local File Header ──
    const lfh = new Uint8Array(30 + nameLen);
    const lfv = new DataView(lfh.buffer);
    let pos = 0;
    lfv.setUint32(pos, 0x04034b50, true); pos += 4;  // signature
    lfv.setUint16(pos, 20, true); pos += 2;           // version needed
    lfv.setUint16(pos, 0, true); pos += 2;            // flags
    lfv.setUint16(pos, 0, true); pos += 2;            // compression: store
    lfv.setUint16(pos, now.time, true); pos += 2;     // mod time
    lfv.setUint16(pos, now.date, true); pos += 2;     // mod date
    lfv.setUint32(pos, crc, true); pos += 4;          // crc-32
    lfv.setUint32(pos, size, true); pos += 4;         // compressed size
    lfv.setUint32(pos, size, true); pos += 4;         // uncompressed size
    lfv.setUint16(pos, nameLen, true); pos += 2;      // filename length
    lfv.setUint16(pos, 0, true); pos += 2;            // extra field length
    lfh.set(nameBytes, pos);

    parts.push(lfh);
    parts.push(dataBytes);

    const headerSize = 30 + nameLen;

    // ── Central Directory entry ──
    const cd = new Uint8Array(46 + nameLen);
    const cdv = new DataView(cd.buffer);
    pos = 0;
    cdv.setUint32(pos, 0x02014b50, true); pos += 4;   // signature
    cdv.setUint16(pos, 20, true); pos += 2;            // version made by
    cdv.setUint16(pos, 20, true); pos += 2;            // version needed
    cdv.setUint16(pos, 0, true); pos += 2;             // flags
    cdv.setUint16(pos, 0, true); pos += 2;             // compression
    cdv.setUint16(pos, now.time, true); pos += 2;      // mod time
    cdv.setUint16(pos, now.date, true); pos += 2;      // mod date
    cdv.setUint32(pos, crc, true); pos += 4;           // crc-32
    cdv.setUint32(pos, size, true); pos += 4;          // compressed size
    cdv.setUint32(pos, size, true); pos += 4;          // uncompressed size
    cdv.setUint16(pos, nameLen, true); pos += 2;       // filename length
    cdv.setUint16(pos, 0, true); pos += 2;             // extra field length
    cdv.setUint16(pos, 0, true); pos += 2;             // comment length
    cdv.setUint16(pos, 0, true); pos += 2;             // disk number start
    cdv.setUint16(pos, 0, true); pos += 2;             // internal attributes
    cdv.setUint32(pos, 0, true); pos += 4;             // external attributes
    cdv.setUint32(pos, offset, true); pos += 4;        // offset of local header
    cd.set(nameBytes, pos);

    centralDir.push(cd);
    offset += headerSize + size;
  }

  // ── End of Central Directory ──
  const cdOffset = offset;
  let cdSize = 0;
  for (const cd of centralDir) {
    parts.push(cd);
    cdSize += cd.length;
  }

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  let eocdPos = 0;
  ev.setUint32(eocdPos, 0x06054b50, true); eocdPos += 4;      // signature
  ev.setUint16(eocdPos, 0, true); eocdPos += 2;                // disk number
  ev.setUint16(eocdPos, 0, true); eocdPos += 2;                // disk where CD starts
  ev.setUint16(eocdPos, files.length, true); eocdPos += 2;     // entries on this disk
  ev.setUint16(eocdPos, files.length, true); eocdPos += 2;     // total entries
  ev.setUint32(eocdPos, cdSize, true); eocdPos += 4;           // CD size
  ev.setUint32(eocdPos, cdOffset, true); eocdPos += 4;         // CD offset
  ev.setUint16(eocdPos, 0, true); eocdPos += 2;                // comment length
  parts.push(eocd);

  // Concatenar todas las partes
  const totalLen = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLen);
  let dest = 0;
  for (const p of parts) {
    result.set(p, dest);
    dest += p.length;
  }

  return result;
}

// ═══ Niveles ═══════════════════════════════════

const LEVEL_NAMES = { 1: 'Básico', 2: 'Intermedio', 3: 'Avanzado' };

// ═══ Función principal de exportación ══════════

/**
 * Genera un archivo .zip con el sketch actual y lo descarga.
 * Llamado desde el botón Exportar en la toolbar Arduino.
 */
export function exportSketch() {
  // ── Obtener código .ino ──
  const inoContent = getInoContent();
  if (!inoContent || !inoContent.trim()) {
    // Toast vía callback inyectado en init
    if (window._showToast) {
      window._showToast('El workspace está vacío. Agregá bloques antes de exportar.');
    }
    return;
  }

  // ── Obtener metadata ──
  const board = getSetting('board');
  const level = getSetting('level');
  const levelName = LEVEL_NAMES[level] || 'Básico';
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // ── Prepend comment con metadatos ──
  const metadataComment = `/*\n`
    + ` * Generado por ArduBlock\n`
    + ` * Placa: ${board}\n`
    + ` * Nivel: ${levelName}\n`
    + ` * Fecha: ${date}\n`
    + ` */\n\n`;

  const sketchIno = metadataComment + inoContent;

  // ── Determinar nombre del sketch ──
  let projectName = getProjectName();
  // Quitar extensión .ino si existe (el ZIP usa el nombre sin extensión)
  if (projectName.endsWith('.ino')) {
    projectName = projectName.slice(0, -4);
  }
  if (!projectName || projectName === 'sin-nombre') {
    projectName = 'sketch';
  }

  // ── Construir lista de archivos ──
  const files = [
    { name: `${projectName}/${projectName}.ino`, data: sketchIno }
  ];

  // ── Agregar tabs .h ──
  if (window._tabManager) {
    const tabs = window._tabManager.getTabs();
    for (const tab of tabs) {
      if (tab.content && tab.content.trim()) {
        files.push({
          name: `${projectName}/${tab.filename}`,
          data: tab.content
        });
      }
    }
  }

  // ── Construir ZIP y descargar ──
  const zipData = buildZip(files);
  const blob = new Blob([zipData], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // ── Toast de confirmación ──
  if (window._showToast) {
    window._showToast(`Sketch exportado: ${projectName}.zip`);
  }
}
