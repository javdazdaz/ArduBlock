/**
 * ArduBlock — Editor visual de Matriz LED (dual mode)
 *
 * Soporta dos modos:
 *   - R4 12×8 (UNO R4 WiFi, Arduino_LED_Matrix.h)
 *   - MAX7219 8×8 (LedControl.h, SPI)
 *
 * Grid interactivo, frames guardados en localStorage,
 * línea de tiempo para crear animaciones.
 */

import { MATRIX_FRAMES, MATRIX_ANIMATIONS, ANIMACIONES_DIFERIDAS } from './blocks/ledmatrix.js';
import { MAX7219_FRAMES } from './blocks/max7219.js';
import {
  encodeCuadros, decodificarCuadros, desdeBase64, partirEnTabs,
  tipoDeAnimacion, cabeEnIno,
} from './oled-animations.js';
import { createHeaderTab, openTab, getTabs, setHeaderTabContent } from './tab-manager.js';

// ═══ Configuración por modo ════════════════════

const OLED_ANCHO = 128;
const OLED_ALTO = 64;

/**
 * Fichas del panel para las animaciones que no viajan en el bundle: rótulo,
 * cantidad de cuadros y tipo, sin la tabla. `diferida` nombra la entrada de
 * ANIMACIONES_DIFERIDAS cuyo cargador trae los cuadros.
 */
function _conDiferidas(base) {
  const salida = { ...base };
  for (const [clave, meta] of Object.entries(ANIMACIONES_DIFERIDAS)) {
    salida[clave] = {
      label: meta.label,
      cuadros: meta.cuadros,
      tipo: meta.tipo || 'linea',
      diferida: clave,
    };
  }
  return salida;
}

/** Lado del canvas del editor OLED en píxeles de pantalla. */
const OLED_ESCALA = 3;

const MODES = {
  r4: {
    label: 'R4 12×8',
    cols: 12,
    framesKey: 'ardublock:matrix-frames',
    animsKey: 'ardublock:matrix-animations',
    presets: () => MATRIX_FRAMES,
    animPresets: () => _conDiferidas(MATRIX_ANIMATIONS),
    encode(frameData) {
      let bits = 0n;
      for (let row = 0; row < 8; row++) {
        let rowVal = 0;
        for (let col = 0; col < 12; col++)
          if (frameData[row][col]) rowVal |= (1 << (11 - col));
        bits |= BigInt(rowVal) << BigInt((7 - row) * 12);
      }
      return [
        Number((bits >> 64n) & 0xFFFFFFFFn),
        Number((bits >> 32n) & 0xFFFFFFFFn),
        Number(bits & 0xFFFFFFFFn),
      ];
    },
    decode(u32) {
      const bits = (BigInt(u32[0]) << 64n) | (BigInt(u32[1]) << 32n) | BigInt(u32[2]);
      const data = [];
      for (let row = 0; row < 8; row++) {
        const rowVal = Number((bits >> BigInt((7 - row) * 12)) & 0xFFFn);
        const cols = [];
        for (let col = 0; col < 12; col++)
          cols.push((rowVal >> (11 - col)) & 1);
        data.push(cols);
      }
      return data;
    },
    renderHex(u32) {
      document.getElementById('matrix-hex-0').textContent = '0x' + u32[0].toString(16);
      document.getElementById('matrix-hex-1').textContent = '0x' + u32[1].toString(16);
      document.getElementById('matrix-hex-2').textContent = '0x' + u32[2].toString(16);
    },
    copyCode(u32) {
      return `matrix.loadFrame({0x${u32[0].toString(16)}, 0x${u32[1].toString(16)}, 0x${u32[2].toString(16)}});`;
    },
    fromStorageFrame(entry) { return entry; },        // [u32_0, u32_1, u32_2]
    toStorageFrame(u32)   { return [...u32]; },
    fromAnimFrame(f)      { return { name: f[4] || '', u32: [f[0], f[1], f[2]], dur: f[3] || 200 }; },
    toAnimFrame(item)     { return [...item.u32, item.dur, item.name || '']; },
    playCode(frameVar)    { return 'matrix.loadFrame(' + frameVar + ');\n'; },
  },

  max7219: {
    label: 'MAX7219 8×8',
    cols: 8,
    framesKey: 'ardublock:max7219-frames',
    animsKey: 'ardublock:max7219-animations',
    presets: () => MAX7219_FRAMES,
    animPresets: () => ({}),  // sin anims predefinidas aún
    encode(frameData) {
      const bytes = [];
      for (let row = 0; row < 8; row++) {
        let b = 0;
        for (let col = 0; col < 8; col++)
          if (frameData[row][col]) b |= (1 << (7 - col));
        bytes.push(b);
      }
      return bytes;
    },
    decode(bytes) {
      const data = [];
      for (let row = 0; row < 8; row++) {
        const cols = [];
        for (let col = 0; col < 8; col++)
          cols.push((bytes[row] >> (7 - col)) & 1);
        data.push(cols);
      }
      return data;
    },
    renderHex(bytes) {
      document.getElementById('matrix-hex-0').textContent = '0x' + bytes[0].toString(16).padStart(2, '0');
      document.getElementById('matrix-hex-1').textContent = '0x' + bytes[1].toString(16).padStart(2, '0');
      document.getElementById('matrix-hex-2').textContent = '0x' + bytes[2].toString(16).padStart(2, '0');
      // Show all 8 bytes inline
      const hexAll = document.getElementById('matrix-hex-all');
      if (hexAll) {
        hexAll.textContent = 'byte frame[8] = {' +
          bytes.map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ') + '};';
      }
    },
    copyCode(bytes) {
      const hex = bytes.map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ');
      return `const byte frame[8] = {${hex}};\nfor (int r=0; r<8; r++) lc.setRow(0, r, frame[r]);`;
    },
    fromStorageFrame(entry) { return entry; },        // [b0..b7]
    toStorageFrame(bytes)   { return [...bytes]; },
    fromAnimFrame(f)        { return { name: f[8] || '', bytes: f.slice(0, 8), dur: f[8] || 200 }; },
    toAnimFrame(item)       { return [...item.bytes, item.dur, item.name || '']; },
    playCode(frameVar) {
      let c = '';
      for (let r = 0; r < 8; r++)
        c += 'lc.setRow(0, ' + r + ', ' + frameVar + '[' + r + ']);\n';
      return c;
    },
  },

  direct: {
    label: 'Directa 8×8',
    cols: 8,
    framesKey: 'ardublock:direct-frames',
    animsKey: 'ardublock:direct-animations',
    presets: () => MAX7219_FRAMES,  // mismos frames 8×8
    animPresets: () => ({}),
    encode: null,   // heredado de max7219 abajo
    decode: null,   // heredado de max7219 abajo
    renderHex: null,
    copyCode(bytes) {
      const hex = bytes.map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ');
      return `const byte frame[8] = {${hex}};\n_direct_show(frame, 500);  // multiplexado`;
    },
    fromStorageFrame(entry) { return entry; },
    toStorageFrame(bytes)   { return [...bytes]; },
    fromAnimFrame(f)        { return { name: f[8] || '', bytes: f.slice(0, 8), dur: f[8] || 200 }; },
    toAnimFrame(item)       { return [...item.bytes, item.dur, item.name || '']; },
    playCode(frameVar) {
      return '_direct_show(' + frameVar + ', 100);  // mostrar frame por 100ms\n';
    },
  },

  // ── OLED SSD1315 128x64 ──
  // Comparte el panel con los otros modos: mismo toolbar, mismo panel lateral,
  // misma línea de tiempo. Cambia el reticulado por un lienzo y el formato del
  // cuadro: 8 páginas de 128 columnas, que es lo que envía el driver del sketch.
  oled: {
    label: 'OLED SSD1315',
    cols: OLED_ANCHO,
    rows: OLED_ALTO,
    canvas: true,
    framesKey: 'ardublock:oled-frames',
    animsKey: 'ardublock:oled-animations',
    presets: () => ({}),
    animPresets: () => ({
      // El mismo recurso en sus dos formas: 'linea' son los 871 cuadros
      // editables en la línea de tiempo; 'tab' son las dos tablas .h que el
      // bloque reproduce en placa, editables como texto.
      badapple: {
        label: 'Bad Apple!! 34,8 s',
        cuadros: 871,
        fps: 25,
        tipo: 'linea',
        recurso: 'badapple',
      },
      badapple_tabs: {
        label: 'Bad Apple!! en tabs .h',
        tabs: 2,
        tipo: 'tab',
        recurso: 'badapple',
      },
    }),
    empty() { return new Uint8Array(1024); },
    encode(fd) {
      const buf = new Uint8Array(1024);
      for (let p = 0; p < 8; p++) {
        for (let x = 0; x < OLED_ANCHO; x++) {
          let byte = 0;
          for (let b = 0; b < 8; b++) if (fd[p * 8 + b][x]) byte |= 1 << b;
          buf[p * OLED_ANCHO + x] = byte;
        }
      }
      return buf;
    },
    decode(bytes) {
      const buf = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes || []);
      const fd = [];
      for (let y = 0; y < OLED_ALTO; y++) fd.push(new Array(OLED_ANCHO).fill(0));
      for (let p = 0; p < 8; p++) {
        for (let x = 0; x < OLED_ANCHO; x++) {
          const byte = buf[p * OLED_ANCHO + x] || 0;
          for (let b = 0; b < 8; b++) fd[p * 8 + b][x] = (byte >> b) & 1;
        }
      }
      return fd;
    },
    renderHex(bytes) {
      const el = document.getElementById('matrix-hex-all');
      if (el) {
        const primeros = Array.from(bytes.slice(0, 8))
          .map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ');
        el.textContent = `uint8_t frame[1024] = {${primeros}, ...};`;
      }
    },
    copyCode(bytes) {
      const hex = Array.from(bytes).map(b => '0x' + b.toString(16).padStart(2, '0'));
      const lineas = [];
      for (let i = 0; i < hex.length; i += 16) {
        lineas.push('  ' + hex.slice(i, i + 16).join(', ') + ',');
      }
      return 'const uint8_t frame[1024] PROGMEM = {\n' + lineas.join('\n') + '\n};';
    },
    fromStorageFrame(bytes) { return Array.from(bytes); },
    toStorageFrame(bytes) { return Array.from(bytes); },
    fromAnimFrame(f) { return { name: f.name || '', data: Array.from(f.data), dur: f.dur || 100 }; },
    toAnimFrame(item) {
      return { name: item.name || '', data: Array.from(item.data), dur: item.dur || 100 };
    },
    playCode() { return ''; },
  },
};

// Heredar encode/decode/renderHex de max7219 para direct
MODES.direct.encode = MODES.max7219.encode;
MODES.direct.decode = MODES.max7219.decode;
MODES.direct.renderHex = MODES.max7219.renderHex;

// ═══ Estado global ═══════════════════════════════

let mode = 'r4';             // 'r4' | 'max7219'
let cfg = MODES.r4;
let grid, cells;
let frameData;               // 8×cols (cols depends on mode)
let savedFrames = {};        // formato depende del modo
let savedAnims = {};
let timeline = [];           // { name, data: [u32]|[bytes], dur }
let selectedFrame = null;
let timelineSelected = -1;
let playTimer = null;
let playIndex = 0;
let insertIdx = -1;
// Animaciones guardadas que no caben en el .ino y viven como tabs .h:
// { nombre: { tabs, arrays, corte, bytes } }. Se persiste junto a la animación
// en `ardublock:oled-animations`, que es lo que lee el generador.
let enTabs = {};

// ═══ API pública ════════════════════════════════

export function initMatrixEditor() {
  grid = document.getElementById('matrix-grid');

  _initMode();
  _loadStorage();
  _buildGrid();
  _populatePresets();
  _renderFrameList();
  _renderAnimList();
  _renderTimeline();
  _setupTimelineDrop();
  _bindTimelinePaint();
  _bindEvents();
  _bindModeTabs();
  _update();
}

export function initPanelModeTabs() {
  const tabCode = document.getElementById('panel-tab-code');
  const tabAnim = document.getElementById('panel-tab-anim');
  const tabWeb  = document.getElementById('panel-tab-web');
  const codeViews = document.getElementById('code-view-ino');
  const hView = document.getElementById('code-edit-h');
  const animView = document.getElementById('code-view-animation');
  const webView = document.getElementById('code-view-web');
  const codeTabs = document.getElementById('code-tabs');
  const arduinoToolbar = document.querySelector('.arduino-toolbar');
  const headerTitle = document.querySelector('.panel-header h2');

  function switchMode(mode) {
    tabCode.classList.toggle('active', mode === 'code');
    tabAnim.classList.toggle('active', mode === 'animation');
    if (tabWeb) tabWeb.classList.toggle('active', mode === 'web');

    const editorPanel = document.getElementById('editor-panel');
    const resizer = document.getElementById('panel-resizer');
    const codePanel = document.getElementById('code-panel');

    if (mode === 'code') {
      headerTitle.textContent = 'Código Arduino (C++)';
      codeTabs.style.display = '';
      if (arduinoToolbar) arduinoToolbar.style.display = '';
      animView.style.display = 'none';
      if (webView) webView.style.display = 'none';
      if (editorPanel) editorPanel.style.display = '';
      if (resizer) resizer.style.display = '';
      if (codePanel) codePanel.style.flex = '';
      const activeTab = document.querySelector('.code-tab.active');
      if (activeTab && activeTab.dataset.readonly === 'true') {
        codeViews.style.display = '';
        hView.style.display = 'none';
      } else if (activeTab) {
        codeViews.style.display = 'none';
        hView.style.display = '';
      }
    } else {
      headerTitle.textContent = mode === 'web' ? 'Sitios web' : _tituloPanelAnimacion();
      codeTabs.style.display = 'none';
      if (arduinoToolbar) arduinoToolbar.style.display = 'none';
      codeViews.style.display = 'none';
      hView.style.display = 'none';
      animView.style.display = mode === 'animation' ? '' : 'none';
      if (webView) webView.style.display = mode === 'web' ? '' : 'none';
      if (editorPanel) editorPanel.style.display = 'none';
      if (resizer) resizer.style.display = 'none';
      if (codePanel) codePanel.style.flex = '1';
      if (mode === 'web' && typeof window._refreshWebPanel === 'function') window._refreshWebPanel();
    }

    const lc = document.getElementById('line-count');
    if (lc) lc.style.display = mode === 'code' ? '' : 'none';
    const collapseBtn = document.getElementById('btn-collapse-code');
    if (collapseBtn) collapseBtn.style.display = mode === 'code' ? '' : 'none';
  }

  tabCode.addEventListener('click', () => switchMode('code'));
  tabAnim.addEventListener('click', () => switchMode('animation'));
  if (tabWeb) tabWeb.addEventListener('click', () => switchMode('web'));

  // Expuesto para que otros módulos (web-presets.js) puedan volver al modo código.
  window._setPanelMode = switchMode;
}

// ═══ Modo ════════════════════════════════════════

/** Rótulo del panel de animación según el modo del editor. */
function _tituloPanelAnimacion() {
  return mode === 'oled' ? 'OLED SSD1315 — Editor de animaciones' : 'Matriz LED — Editor de frames';
}

function _initMode() {
  try {
    const saved = localStorage.getItem('ardublock:matrix-editor-mode');
    if (saved === 'max7219' || saved === 'r4' || saved === 'direct' || saved === 'oled') mode = saved;
  } catch (_) {}
  _applyMode();
}

function _applyMode() {
  // Actualizar tabs visuales
  document.querySelectorAll('.matrix-mode-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });

  const titulo = document.querySelector('.panel-header h2');
  if (titulo && /Matriz LED|OLED SSD1315/.test(titulo.textContent)) {
    titulo.textContent = _tituloPanelAnimacion();
  }
  const vista = document.getElementById('code-view-animation');
  if (vista) vista.classList.toggle('modo-oled', mode === 'oled');

  cfg = MODES[mode];
  frameData = Array.from({ length: cfg.rows || 8 }, () => new Array(cfg.cols).fill(0));

  // Botón de recurso: solo tiene sentido en el modo OLED.
  const btnBad = document.getElementById('matrix-load-badapple');
  if (btnBad) btnBad.style.display = mode === 'oled' ? '' : 'none';

  // Mostrar/ocultar hex display según modo
  const hexR4 = document.getElementById('matrix-hex-r4');
  const hex7219 = document.getElementById('matrix-hex-max7219');
  if (hexR4) hexR4.style.display = mode === 'r4' ? '' : 'none';
  if (hex7219) hex7219.style.display = (mode === 'max7219' || mode === 'direct' || mode === 'oled') ? '' : 'none';

  // Leyenda de pines solo en modo directa
  const pinLegend = document.getElementById('matrix-pin-legend');
  if (pinLegend) pinLegend.style.display = mode === 'direct' ? '' : 'none';

  // Guardar preferencia
  localStorage.setItem('ardublock:matrix-editor-mode', mode);

  _loadStorage();
  _buildGrid();
  _populatePresets();
  _renderFrameList();
  _renderAnimList();
  _renderTimeline();
  _update();
}

function _bindModeTabs() {
  document.querySelectorAll('.matrix-mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const newMode = tab.dataset.mode;
      if (newMode !== mode) {
        mode = newMode;
        // Resetear estado del editor al cambiar de modo
        selectedFrame = null;
        timelineSelected = -1;
        timeline = [];
        _applyMode();
      }
    });
  });
}

// ═══ Storage ═══════════════════════════════════

/**
 * En el modo OLED el almacenamiento guarda lo que el generador consume: cuadros
 * en base64, sin la retícula de 64x128. Aquí se traduce a la forma que usa el
 * editor, y al guardar se vuelve a traducir.
 */
function _loadStorage() {
  try {
    const crudo = JSON.parse(localStorage.getItem(cfg.framesKey)) || {};
    if (cfg.canvas) {
      savedFrames = {};
      for (const [nombre, valor] of Object.entries(crudo)) {
        if (typeof valor === 'string') savedFrames[nombre] = Array.from(desdeBase64(valor));
        else if (Array.isArray(valor)) savedFrames[nombre] = valor;
      }
    } else {
      savedFrames = crudo;
    }
  } catch (_) {
    savedFrames = {};
  }

  try {
    const crudoA = JSON.parse(localStorage.getItem(cfg.animsKey)) || {};
    if (cfg.canvas) {
      savedAnims = {};
      enTabs = {};
      for (const [nombre, valor] of Object.entries(crudoA)) {
        if (!valor || !valor.b64) continue;
        const fps = valor.fps || 25;
        const dur = Math.round(1000 / fps);
        savedAnims[nombre] = decodificarCuadros(desdeBase64(valor.b64))
          .map(buf => ({ name: nombre, data: Array.from(buf), dur }));
        if (Array.isArray(valor.arrays) && valor.arrays.length > 0) {
          enTabs[nombre] = {
            tabs: valor.tabs || [],
            arrays: valor.arrays,
            corte: valor.corte || 0,
            bytes: valor.bytes || 0,
          };
        }
      }
    } else {
      savedAnims = crudoA;
    }
  } catch (_) {
    savedAnims = {};
    enTabs = {};
  }
}

function _saveFrames() {
  if (cfg.canvas) {
    const salida = {};
    for (const [nombre, valor] of Object.entries(savedFrames)) {
      let binario = '';
      const bytes = Uint8Array.from(valor);
      for (let i = 0; i < bytes.length; i += 8192) {
        binario += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
      }
      salida[nombre] = window.btoa(binario);
    }
    localStorage.setItem(cfg.framesKey, JSON.stringify(salida));
    return;
  }
  localStorage.setItem(cfg.framesKey, JSON.stringify(savedFrames));
}

function _saveAnims() {
  if (cfg.canvas) {
    const salida = {};
    for (const [nombre, cuadros] of Object.entries(savedAnims)) {
      if (!Array.isArray(cuadros) || cuadros.length === 0) continue;
      const fps = Math.max(1, Math.round(1000 / (cuadros[0].dur || 100)));
      const bytes = encodeCuadros(cuadros.map(f => Uint8Array.from(f.data)));
      let binario = '';
      for (let i = 0; i < bytes.length; i += 8192) {
        binario += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
      }
      salida[nombre] = {
        fps,
        cuadros: cuadros.length,
        b64: window.btoa(binario),
        // Las que no caben en el .ino viajan en tabs .h: el generador necesita
        // los arreglos, el corte y el tamaño para llamarlas.
        ...(enTabs[nombre] || {}),
      };
    }
    localStorage.setItem(cfg.animsKey, JSON.stringify(salida));
    return;
  }
  localStorage.setItem(cfg.animsKey, JSON.stringify(savedAnims));
}

// ═══ Grid ═══════════════════════════════════════

function _buildGrid() {
  grid.innerHTML = '';
  cells = [];

  // OLED: 8192 celdas en DOM no se pueden arrastrar con soltura, así que el
  // mismo hueco del reticulado lo ocupa un lienzo de 128x64.
  if (cfg.canvas) {
    grid.style.display = 'block';
    grid.style.gridTemplateColumns = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'matrix-canvas';
    canvas.className = 'matrix-canvas';
    canvas.width = OLED_ANCHO * OLED_ESCALA;
    canvas.height = OLED_ALTO * OLED_ESCALA;
    grid.appendChild(canvas);
    _bindCanvas(canvas);
    return;
  }

  grid.style.display = '';
  grid.style.gridTemplateColumns = `repeat(${cfg.cols}, 28px)`;
  const filas = cfg.rows || 8;
  for (let row = 0; row < filas; row++) {
    cells[row] = [];
    for (let col = 0; col < cfg.cols; col++) {
      const cell = document.createElement('div');
      cell.className = 'matrix-cell';
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.addEventListener('click', () => _toggleCell(row, col));
      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        frameData[row][col] = 0;
        _update();
      });
      grid.appendChild(cell);
      cells[row][col] = cell;
    }
  }
}

/** Puntero sobre el lienzo del modo OLED: arrastrar enciende, botón derecho apaga. */
function _bindCanvas(canvas) {
  let pintando = false;

  const pintar = (e) => {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * OLED_ANCHO);
    const y = Math.floor(((e.clientY - r.top) / r.height) * OLED_ALTO);
    if (x < 0 || x >= OLED_ANCHO || y < 0 || y >= OLED_ALTO) return;
    frameData[y][x] = e.buttons === 2 ? 0 : 1;
    _paintCanvas();
    _update(false);
  };

  canvas.addEventListener('mousedown', (e) => { e.preventDefault(); pintando = true; pintar(e); });
  canvas.addEventListener('mousemove', (e) => { if (pintando) pintar(e); });
  canvas.addEventListener('mouseup', () => { pintando = false; _update(); });
  canvas.addEventListener('mouseleave', () => { pintando = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

/** Dibuja la retícula lógica en el lienzo, con marca cada 8 píxeles. */
function _paintCanvas() {
  const canvas = document.getElementById('matrix-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#8fd3ff';
  for (let y = 0; y < OLED_ALTO; y++) {
    for (let x = 0; x < OLED_ANCHO; x++) {
      if (frameData[y][x]) {
        ctx.fillRect(x * OLED_ESCALA, y * OLED_ESCALA, OLED_ESCALA, OLED_ESCALA);
      }
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= OLED_ANCHO; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x * OLED_ESCALA + 0.5, 0);
    ctx.lineTo(x * OLED_ESCALA + 0.5, OLED_ALTO * OLED_ESCALA);
    ctx.stroke();
  }
  for (let y = 0; y <= OLED_ALTO; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y * OLED_ESCALA + 0.5);
    ctx.lineTo(OLED_ANCHO * OLED_ESCALA, y * OLED_ESCALA + 0.5);
    ctx.stroke();
  }
}

function _toggleCell(row, col) {
  frameData[row][col] = frameData[row][col] ? 0 : 1;
  _update();
}

function _clearAll() {
  for (let row = 0; row < (cfg.rows || 8); row++)
    for (let col = 0; col < cfg.cols; col++)
      frameData[row][col] = 0;
}

function _invertAll() {
  for (let row = 0; row < (cfg.rows || 8); row++)
    for (let col = 0; col < cfg.cols; col++)
      frameData[row][col] = frameData[row][col] ? 0 : 1;
}

function _loadFrameToGrid(data) {
  // data is the encoded format (u32 array or byte array)
  frameData = cfg.decode(data);
}

// ═══ Render ═════════════════════════════════════

function _update(sincronizar = true) {
  const data = cfg.encode(frameData);

  // Grid cells o lienzo
  if (cfg.canvas) {
    if (sincronizar) _paintCanvas();
  } else {
    for (let row = 0; row < (cfg.rows || 8); row++)
      for (let col = 0; col < cfg.cols; col++)
        cells[row][col].classList.toggle('on', frameData[row][col] === 1);
  }

  // Hex display
  cfg.renderHex(data);

  // Two-way binding: sincronizar timeline selection
  if (sincronizar && timelineSelected >= 0 && timelineSelected < timeline.length) {
    timeline[timelineSelected].data = cfg.toStorageFrame(data);
    _syncTimelineCanvas(timelineSelected);
  }
}

/**
 * Escribe una animación propia como tabs .h cuando su tabla no cabe en el
 * .ino. Es el mismo reparto que usa el recurso: partes parejas bajo el tope de
 * 512 KB por tab y el tamaño del primer corte en la llamada al decodificador.
 * Devuelve los nombres de los tabs escritos.
 */
function _guardarAnimsEnTabs(nombre, bytes) {
  const partes = partirEnTabs(bytes, 'oled_anim_' + nombre, 'animación propia ' + nombre);
  const tabs = [];
  for (const parte of partes) {
    const yaExiste = getTabs().some(t => t.filename === parte.tab);
    const final = createHeaderTab(parte.tab, parte.texto);
    // createHeaderTab no toca el contenido de un tab que ya existe: sin esto,
    // volver a guardar la animación editada dejaría la tabla vieja.
    if (yaExiste) setHeaderTabContent(final, parte.texto);
    tabs.push(final);
  }
  enTabs[nombre] = {
    tabs,
    arrays: partes.map(p => p.nombre),
    corte: partes[0].bytes,
    bytes: bytes.length,
  };
  return tabs;
}

function _syncTimelineCanvas(idx) {
  const track = document.getElementById('matrix-timeline-track');
  const frameEl = track.querySelector(`.matrix-timeline-frame[data-idx="${idx}"]`);
  if (frameEl) {
    const canvas = frameEl.querySelector('canvas');
    if (canvas) _drawTimelineCanvas(canvas, timeline[idx].data);
  }
}

function _drawTimelineCanvas(canvas, data) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const filas = cfg.rows || 8;
  const fd = cfg.decode(data);

  // OLED: la miniatura se dibuja encendida sobre negro y escalada desde un
  // lienzo de 128x64, que da bordes limpios a cualquier tamaño.
  if (cfg.canvas) {
    const off = document.createElement('canvas');
    off.width = OLED_ANCHO;
    off.height = OLED_ALTO;
    const octx = off.getContext('2d');
    octx.fillStyle = '#000';
    octx.fillRect(0, 0, OLED_ANCHO, OLED_ALTO);
    octx.fillStyle = '#8fd3ff';
    for (let row = 0; row < filas; row++) {
      for (let col = 0; col < cfg.cols; col++) {
        if (fd[row][col]) octx.fillRect(col, row, 1, 1);
      }
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, w, h);
    return;
  }

  const cw = w / cfg.cols, ch = h / filas;
  for (let row = 0; row < filas; row++) {
    for (let col = 0; col < cfg.cols; col++) {
      ctx.fillStyle = fd[row][col] ? '#e94560' : '#1a1a2e';
      ctx.fillRect(col * cw, row * ch, cw - 0.5, ch - 0.5);
    }
  }
}

// ═══ Sidebar: frames ════════════════════════════

function _renderFrameList() {
  const list = document.getElementById('matrix-frame-list');
  const presets = cfg.presets();
  const presetNames = Object.keys(presets).sort();
  const customNames = Object.keys(savedFrames).sort();
  const total = presetNames.length + customNames.length;

  const cat = list.previousElementSibling;
  if (cat && cat.classList.contains('matrix-sidebar-cat')) {
    cat.innerHTML = `📁 Frames <span class="matrix-frame-count">${total}</span>`;
  }

  if (total === 0) {
    list.innerHTML = '<div class="matrix-frame-empty">Sin frames</div>';
    return;
  }

  let html = '';

  // Predefinidos (📦, no eliminables)
  for (const name of presetNames) {
    const sel = name === selectedFrame ? ' selected' : '';
    html += `<div class="matrix-frame-item${sel}" data-name="${name}" data-preset="1" draggable="true">
      <canvas class="frame-preview" width="54" height="36"></canvas>
      <span class="frame-item-name">📦 ${_esc(name)}</span>
    </div>`;
  }

  // Custom del usuario (🎞, eliminables)
  for (const name of customNames) {
    const sel = name === selectedFrame ? ' selected' : '';
    html += `<div class="matrix-frame-item${sel}" data-name="${name}" draggable="true">
      <canvas class="frame-preview" width="54" height="36"></canvas>
      <span class="frame-item-name">🎞 ${_esc(name)}</span>
      <span class="frame-item-del" data-del="${name}">✕</span>
    </div>`;
  }

  list.innerHTML = html;

  // Dibujar mini previews
  list.querySelectorAll('.frame-preview').forEach(canvas => {
    const name = canvas.parentElement.dataset.name;
    const data = canvas.parentElement.dataset.preset === '1'
      ? presets[name] : savedFrames[name];
    _drawTimelineCanvas(canvas, data);
  });

  // Click: seleccionar y cargar en grid
  list.querySelectorAll('.matrix-frame-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('frame-item-del')) return;
      const name = el.dataset.name;
      const isPreset = el.dataset.preset === '1';
      selectedFrame = name;
      _loadFrameToGrid(isPreset ? presets[name] : savedFrames[name]);
      _update();
      _renderFrameList();
    });

    // Drag & drop
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', el.dataset.name);
      e.dataTransfer.setData('application/x-frame-preset', el.dataset.preset || '');
      e.dataTransfer.effectAllowed = 'copy';
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
    });
  });

  // Click en ✕: eliminar (solo custom)
  list.querySelectorAll('.frame-item-del').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = el.dataset.del;
      if (confirm(`¿Eliminar frame "${name}"?`)) {
        delete savedFrames[name];
        if (selectedFrame === name) selectedFrame = null;
        _saveFrames();
        _renderFrameList();
        _renderTimeline();
      }
    });
  });
}

// ═══ Sidebar: animaciones ═══════════════════════

function _renderAnimList() {
  const list = document.getElementById('matrix-anim-list');
  const animPresets = cfg.animPresets();
  const customNames = Object.keys(savedAnims).sort();
  const builtinNames = Object.keys(animPresets);
  const total = builtinNames.length + customNames.length;

  const cat = list.previousElementSibling;
  if (cat && cat.classList.contains('matrix-sidebar-cat')) {
    cat.innerHTML = `🎬 Animaciones <span class="matrix-frame-count">${total}</span>`;
  }

  if (total === 0) {
    list.innerHTML = '<div class="matrix-frame-empty">Sin animaciones</div>';
    return;
  }

  let html = '';

  // Predefinidas (no eliminables)
  for (const name of builtinNames) {
    const anim = animPresets[name];
    const tipo = tipoDeAnimacion(anim);
    const rotulo = (anim && anim.label) || name;
    const cuenta = tipo === 'tab'
      ? ((anim && anim.tabs) ? anim.tabs + ' tabs' : 'tab')
      : (((anim && (anim.cuadros || (Array.isArray(anim) ? anim.length : 0))) || 0) + 'f');
    html += `<div class="matrix-frame-item" data-anim="${name}" draggable="true">
      <span class="frame-item-name">📦 ${_esc(rotulo)}</span>
      <span class="frame-item-tipo tipo-${tipo}">${tipo === 'tab' ? 'tab .h' : 'línea'}</span>
      <span style="font-size:0.6rem;opacity:0.5;margin-left:auto">${cuenta}</span>
    </div>`;
  }

  // Custom del usuario (eliminables)
  for (const name of customNames) {
    const anim = savedAnims[name];
    const fc = anim ? anim.length : 0;
    html += `<div class="matrix-frame-item" data-anim="${name}" data-custom="1" draggable="true">
      <span class="frame-item-name">🎞 ${_esc(name)}</span>
      <span class="frame-item-tipo tipo-linea">línea</span>
      <span style="font-size:0.6rem;opacity:0.5;margin-left:auto">${fc}f</span>
      <span class="frame-item-del" data-del-anim="${name}">✕</span>
    </div>`;
  }

  list.innerHTML = html;

  list.querySelectorAll('.matrix-frame-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('frame-item-del')) return;
      const name = el.dataset.anim;
      const isCustom = el.dataset.custom === '1';
      const anim = isCustom ? savedAnims[name] : animPresets[name];
      // Cada tipo se edita en su lugar: los cuadros van a la línea de tiempo y
      // la tabla .h se abre en el editor de código.
      if (anim && anim.diferida) {
        _cargarDiferida(name, anim.diferida);
        return;
      }
      if (anim && anim.recurso) {
        _cargarRecursoOled(anim.recurso, tipoDeAnimacion(anim));
        return;
      }
      if (anim && anim.length > 0) {
        timeline = _entradasDesdeAnimacion(name, anim);
        _renderTimeline();
        _toast(`Animación "${name}" cargada (${timeline.length} frames)`);
      }
    });

    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/x-matrix-anim', el.dataset.anim);
      e.dataTransfer.setData('application/x-matrix-anim-custom', el.dataset.custom || '');
      e.dataTransfer.effectAllowed = 'copy';
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
    });
  });

  // Eliminar (solo custom)
  list.querySelectorAll('.frame-item-del').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = el.dataset.delAnim;
      if (confirm(`¿Eliminar animación "${name}"?`)) {
        delete savedAnims[name];
        _saveAnims();
        _renderAnimList();
      }
    });
  });
}

// ═══ Recursos OLED ══════════════════════════════

/**
 * Escribe los tabs del recurso OLED y devuelve sus nombres. Lo comparten el
 * botón del editor y el cargador de ejemplos: los bloques referencian los
 * arreglos y el tab tiene que existir en el proyecto para que el sketch
 * compile.
 */
function _escribirTabsRecurso(bytes) {
  const partes = partirEnTabs(bytes, 'oled_anim_badapple', 'Bad Apple!!');
  const tabs = partes.map(p => createHeaderTab(p.tab, p.texto));
  // El generador arma los `#include` con los tabs .h que tienen contenido: sin
  // regenerar, el sketch queda llamando a arreglos que no declara.
  if (typeof window !== 'undefined' && typeof window.updateCode === 'function') {
    window.updateCode();
  }
  return tabs;
}

/**
 * Añade al proyecto los tabs de un recurso sin tocar la línea de tiempo. Lo
 * usa el cargador de ejemplos.
 */
export async function cargarTabsRecursoOled(nombre = 'badapple') {
  if (nombre !== 'badapple') throw new Error('recurso sin cargador: ' + nombre);
  const mod = await import('./oled-anim-badapple.js');
  return _escribirTabsRecurso(mod.badappleBytes());
}

/**
 * Vuelca un recurso empaquetado en su lugar de edición. Los tabs .h se crean
 * siempre, porque el bloque los reproduce en placa; `destino` decide además si
 * los cuadros van a la línea de tiempo ('linea') o si se abre el primer tab
 * para editarlo como texto ('tab').
 */
async function _cargarRecursoOled(nombre, destino = 'linea') {
  if (nombre !== 'badapple') {
    _toast('Ese recurso todavía no tiene cargador.');
    return;
  }
  _toast('Cargando Bad Apple!!…');
  try {
    const mod = await import('./oled-anim-badapple.js');
    const bytes = mod.badappleBytes();
    const tabs = _escribirTabsRecurso(bytes);

    if (destino === 'tab') {
      if (typeof window._setPanelMode === 'function') window._setPanelMode('code');
      openTab(tabs[0]);
      _toast('Bad Apple!!: ' + tabs.join(' y ') + ' abiertos para editar');
      return;
    }

    const cuadros = decodificarCuadros(bytes);
    _volcarEnTimeline(nombre, cuadros, mod.BADAPPLE_FPS || 25);
    _toast('Bad Apple!!: ' + cuadros.length + ' cuadros en la línea de tiempo; '
      + tabs.length + ' tabs .h para el bloque');
    _renderAnimList();
  } catch (e) {
    _toast('No se pudo cargar el recurso: ' + e.message);
  }
}

/** Deja una lista de búferes, uno por cuadro, en la línea de tiempo. */
function _volcarEnTimeline(nombre, cuadros, fps) {
  const dur = Math.max(1, Math.round(1000 / (fps || 25)));
  timeline = cuadros.map(buf => ({ name: nombre, data: buf, dur }));
  timelineSelected = -1;
  _renderTimeline();
}

/** Cuadros de una animación del catálogo al formato de la línea de tiempo. */
function _entradasDesdeAnimacion(nombre, anim) {
  return anim.map((f) => {
    if (typeof cfg.fromAnimFrame === 'function') {
      const item = cfg.fromAnimFrame(f);
      // r4 devuelve u32 y max7219/direct devuelven bytes: solo OLED llama
      // `data` a los suyos.
      return {
        name: nombre,
        data: item.data || item.u32 || item.bytes,
        dur: item.dur || 200,
      };
    }
    const dur = f[cfg.cols === 12 ? 3 : 8] || 200;
    const data = cfg.cols === 12 ? [f[0], f[1], f[2]] : f.slice(0, 8);
    return { name: nombre, data, dur };
  });
}

/** Carga una animación diferida y la deja en la línea de tiempo. */
async function _cargarDiferida(nombre, clave) {
  const meta = ANIMACIONES_DIFERIDAS[clave];
  if (!meta) return;
  _toast('Cargando ' + nombre + '…');
  try {
    const cuadros = await meta.cargar();
    timeline = _entradasDesdeAnimacion(nombre, cuadros);
    timelineSelected = -1;
    _renderTimeline();
    _toast(nombre + ': ' + timeline.length + ' cuadros en la línea de tiempo');
  } catch (e) {
    _toast('No se pudo cargar la animación: ' + e.message);
  }
}

// ═══ Timeline ═══════════════════════════════════

/** Ancho de un cuadro más la separación de la pista (.matrix-timeline-track). */
const ANCHO_CUADRO_TIMELINE = 94;

/** Cuadros por tanda de la pintura en segundo plano (~20 ms de dibujo). */
const LOTE_PINTURA_TIMELINE = 40;

let _pinturaTimer = null;   // setTimeout de la tanda en curso
let _pinturaToken = 0;      // invalida la tanda cuando la pista se rehace

/** Dibuja la miniatura de un cuadro si todavía no está pintada. */
function _pintarMarco(el, i) {
  if (!el || !(i >= 0 && i < timeline.length)) return;
  const canvas = el.querySelector('canvas');
  if (!canvas || canvas.dataset.pintado === '1') return;
  _drawTimelineCanvas(canvas, timeline[i].data);
  canvas.dataset.pintado = '1';
}

/**
 * Pinta las miniaturas que entran en la vista, más la seleccionada. El resto
 * queda para la tanda en segundo plano: dibujar las 871 de Bad Apple cuesta
 * ~400 ms medidos y la pista muestra unas quince.
 */
function _pintarVentanaTimeline() {
  const track = document.getElementById('matrix-timeline-track');
  if (!track) return;
  const marcos = track.querySelectorAll('.matrix-timeline-frame');
  if (marcos.length === 0) return;

  const ancho = marcos[0].offsetWidth ? marcos[0].offsetWidth + 4 : ANCHO_CUADRO_TIMELINE;
  // Dos cuadros de margen a cada lado para que el borde no quede en blanco.
  const desde = Math.max(0, Math.floor(track.scrollLeft / ancho) - 2);
  const hasta = Math.min(marcos.length - 1,
    Math.ceil((track.scrollLeft + track.clientWidth) / ancho) + 2);

  for (let i = desde; i <= hasta; i++) _pintarMarco(marcos[i], i);
  _pintarMarco(marcos[timelineSelected], timelineSelected);
}

/**
 * Pinta el resto de las miniaturas por tandas, sin bloquear el panel. No
 * depende del evento scroll: con 871 cuadros la pista completa se pinta en
 * menos de un segundo y el desplazamiento no deja huecos.
 */
function _pintarRestoTimeline() {
  const track = document.getElementById('matrix-timeline-track');
  if (!track) return;
  const marcos = Array.from(track.querySelectorAll('.matrix-timeline-frame'));
  const lista = timeline;
  const token = ++_pinturaToken;
  if (_pinturaTimer) { clearTimeout(_pinturaTimer); _pinturaTimer = null; }
  if (marcos.length === 0) return;

  let i = 0;
  const paso = () => {
    if (token !== _pinturaToken || lista !== timeline) { _pinturaTimer = null; return; }
    // La reproducción manda: la tanda espera a que termine.
    if (playTimer) { _pinturaTimer = setTimeout(paso, 200); return; }
    const fin = Math.min(i + LOTE_PINTURA_TIMELINE, marcos.length);
    for (; i < fin; i++) _pintarMarco(marcos[i], i);
    if (i < marcos.length) _pinturaTimer = setTimeout(paso, 0);
    else _pinturaTimer = null;
  };
  _pinturaTimer = setTimeout(paso, 0);
}

/** Repinta la ventana al desplazar la pista, una vez por cuadro de pantalla. */
function _bindTimelinePaint() {
  const track = document.getElementById('matrix-timeline-track');
  if (!track) return;
  let pendiente = false;
  track.addEventListener('scroll', () => {
    if (pendiente) return;
    pendiente = true;
    const siguiente = (typeof requestAnimationFrame === 'function')
      ? requestAnimationFrame
      : (fn) => setTimeout(fn, 16);
    siguiente(() => { pendiente = false; _pintarVentanaTimeline(); });
  }, { passive: true });
}

function _renderTimeline() {
  const track = document.getElementById('matrix-timeline-track');
  _pinturaToken++;   // invalida la tanda de pintura anterior

  if (timeline.length === 0) {
    track.innerHTML = '<div class="matrix-timeline-empty">Arrastre frames desde el panel lateral o use el botón +</div>'
      + '<div class="matrix-timeline-add" title="Añadir frame actual">+</div>';
    const vacioAdd = track.querySelector('.matrix-timeline-add');
    if (vacioAdd) vacioAdd.addEventListener('click', _addCurrentToTimeline);
    return;
  }

  let html = '';
  for (let i = 0; i < timeline.length; i++) {
    const f = timeline[i];
    const sel = i === timelineSelected ? ' selected' : '';
    html += `<div class="matrix-timeline-frame${sel}" data-idx="${i}" draggable="true">
      <canvas width="90" height="60"></canvas>
      <span class="frame-dur">${f.dur}ms</span>
      <span class="timeline-frame-del" data-del="${i}">✕</span>
    </div>`;
  }
  html += '<div class="matrix-timeline-add" title="Añadir frame actual">+</div>';
  // Rehacer la pista no debe devolver el scroll al inicio: en una animación de
  // 871 cuadros, editar el cuadro 500 dejaría la vista en el primero.
  const desplazamiento = track.scrollLeft;
  track.innerHTML = html;
  track.scrollLeft = desplazamiento;

  // Solo se pintan las miniaturas que entran en la vista. Dibujar las 871 de
  // Bad Apple cuesta ~400 ms medidos, y la vista muestra unas quince.
  _pintarVentanaTimeline();

  // Click en frame
  track.querySelectorAll('.matrix-timeline-frame').forEach(el => {
    el.addEventListener('click', () => {
      timelineSelected = parseInt(el.dataset.idx);
      _renderTimeline();
      const f = timeline[timelineSelected];
      if (f) {
        _loadFrameToGrid(f.data);
        _update();
        document.getElementById('matrix-timeline-duration').value = f.dur;
      }
    });

    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/x-timeline-idx', el.dataset.idx);
      e.dataTransfer.effectAllowed = 'move';
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
    });
  });

  // Botón ✕
  track.querySelectorAll('.timeline-frame-del').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(el.dataset.del);
      if (idx >= 0 && idx < timeline.length) {
        timeline.splice(idx, 1);
        if (timelineSelected >= timeline.length) timelineSelected = timeline.length - 1;
        _renderTimeline();
      }
    });
  });

  // Botón +
  const addBtn = track.querySelector('.matrix-timeline-add');
  if (addBtn) addBtn.addEventListener('click', _addCurrentToTimeline);

  _pintarRestoTimeline();
}

function _addCurrentToTimeline() {
  const dur = parseInt(document.getElementById('matrix-timeline-duration').value) || 200;
  const vacio = cfg.empty ? Array.from(cfg.empty())
    : (cfg.cols === 12 ? [0, 0, 0] : [0, 0, 0, 0, 0, 0, 0, 0]);
  timeline.push({ name: 'blank', data: vacio, dur });
  _renderTimeline();
}

// ── Drop handlers ──

function _setupTimelineDrop() {
  const track = document.getElementById('matrix-timeline-track');

  track.addEventListener('dragover', (e) => {
    e.preventDefault();
    const srcIdx = e.dataTransfer.getData('application/x-timeline-idx');
    e.dataTransfer.dropEffect = srcIdx !== '' ? 'move' : 'copy';
    _updateInsertIndicator(e.clientX);
  });

  track.addEventListener('dragleave', () => _clearInsertIndicator());

  track.addEventListener('drop', (e) => {
    e.preventDefault();
    _clearInsertIndicator();

    // Reorden interno
    const srcIdx = e.dataTransfer.getData('application/x-timeline-idx');
    if (srcIdx !== '') {
      const from = parseInt(srcIdx);
      let to = insertIdx >= 0 ? insertIdx : timeline.length;
      if (from < to) to--;
      if (from >= 0 && from < timeline.length && to >= 0 && to < timeline.length && from !== to) {
        const [moved] = timeline.splice(from, 1);
        timeline.splice(to, 0, moved);
        timelineSelected = to;
        _renderTimeline();
      }
      return;
    }

    // Frame individual (desde sidebar)
    const frameName = e.dataTransfer.getData('text/plain');
    if (frameName) {
      let frame = savedFrames[frameName];
      if (!frame) frame = cfg.presets()[frameName];
      if (frame) {
        const dur = parseInt(document.getElementById('matrix-timeline-duration').value) || 200;
        const idx = insertIdx >= 0 ? insertIdx : timeline.length;
        timeline.splice(idx, 0, { name: frameName, data: cfg.toStorageFrame(frame), dur });
        _renderTimeline();
        return;
      }
    }

    // Animación completa (desde sidebar)
    const animName = e.dataTransfer.getData('application/x-matrix-anim');
    if (animName) {
      const isCustom = e.dataTransfer.getData('application/x-matrix-anim-custom') === '1';
      const animPresets = cfg.animPresets();
      const anim = isCustom ? savedAnims[animName] : animPresets[animName];
      if (anim && anim.diferida) {
        _cargarDiferida(animName, anim.diferida);
        return;
      }
      if (anim && anim.recurso) {
        const tipo = tipoDeAnimacion(anim);
        if (tipo === 'tab') {
          _toast('Esa animación se edita en su tab: ábrala desde el panel de código.');
          return;
        }
        _cargarRecursoOled(anim.recurso, tipo);
        return;
      }
      if (anim && anim.length > 0) {
        timeline = _entradasDesdeAnimacion(animName, anim);
        _renderTimeline();
        _toast(`Animación "${animName}" cargada (${timeline.length} frames)`);
      }
    }
  });
}

// ── Insert indicator ──

function _updateInsertIndicator(clientX) {
  const track = document.getElementById('matrix-timeline-track');
  const frames = track.querySelectorAll('.matrix-timeline-frame');
  _clearInsertIndicator();

  insertIdx = timeline.length;
  for (let i = 0; i < frames.length; i++) {
    const rect = frames[i].getBoundingClientRect();
    if (clientX < rect.left + rect.width / 2) {
      insertIdx = i;
      frames[i].classList.add('insert-before');
      if (i > 0) frames[i - 1].classList.add('insert-after');
      return;
    }
  }
  const addBtn = track.querySelector('.matrix-timeline-add');
  if (addBtn) addBtn.classList.add('insert-before');
  if (frames.length > 0) frames[frames.length - 1].classList.add('insert-after');
}

function _clearInsertIndicator() {
  const track = document.getElementById('matrix-timeline-track');
  track.querySelectorAll('.insert-before, .insert-after').forEach(el => {
    el.classList.remove('insert-before', 'insert-after');
  });
}

// ═══ Playback ═══════════════════════════════════

function _playTimeline() {
  if (timeline.length === 0) return;
  _stopTimeline();
  playIndex = 0;
  _showTimelineFrame(playIndex);
  playTimer = setInterval(() => {
    playIndex++;
    if (playIndex >= timeline.length) { _stopTimeline(); return; }
    _showTimelineFrame(playIndex);
  }, timeline[playIndex].dur || 200);
}

function _stopTimeline() {
  if (playTimer) { clearInterval(playTimer); playTimer = null; }
  playIndex = 0;
}

function _showTimelineFrame(idx) {
  if (idx < 0 || idx >= timeline.length) return;
  const f = timeline[idx];
  _loadFrameToGrid(f.data);
  _update();
  timelineSelected = idx;

  // Marcar el cuadro sin rehacer la pista: reconstruir 871 nodos en cada
  // cuadro de la reproducción no cabe en 40 ms.
  const track = document.getElementById('matrix-timeline-track');
  const previo = track.querySelector('.matrix-timeline-frame.selected');
  if (previo) previo.classList.remove('selected');
  const el = track.querySelector(`.matrix-timeline-frame[data-idx="${idx}"]`);
  if (el) el.classList.add('selected');
  document.getElementById('matrix-timeline-duration').value = f.dur;
}

// ═══ Events ════════════════════════════════════

function _bindEvents() {
  document.getElementById('matrix-clear-grid').addEventListener('click', () => {
    _clearAll(); _update();
  });
  document.getElementById('matrix-invert-grid').addEventListener('click', () => {
    _invertAll(); _update();
  });

  // Guardar frame
  document.getElementById('matrix-save-frame').addEventListener('click', () => {
    const nameInput = document.getElementById('matrix-frame-name');
    const name = nameInput.value.trim();
    if (!name) { _toast('Escribe un nombre para el frame'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(name)) { _toast('Solo letras, números y _'); return; }
    const data = cfg.encode(frameData);
    savedFrames[name] = cfg.toStorageFrame(data);
    _saveFrames();
    selectedFrame = name;
    _renderFrameList();
    nameInput.value = '';
    _toast(`Frame "${name}" guardado`);
  });

  // Copiar C++
  document.getElementById('matrix-use-frame').addEventListener('click', () => {
    const data = cfg.encode(frameData);
    const code = cfg.copyCode(data);
    navigator.clipboard.writeText(code).then(() => _toast('Copiado: ' + code));
  });

  // Recurso empaquetado del modo OLED
  const btnBadApple = document.getElementById('matrix-load-badapple');
  if (btnBadApple) {
    btnBadApple.addEventListener('click', () => _cargarRecursoOled('badapple'));
  }

  // Timeline duration
  document.getElementById('matrix-timeline-duration').addEventListener('change', function() {
    if (timelineSelected >= 0 && timelineSelected < timeline.length) {
      timeline[timelineSelected].dur = parseInt(this.value) || 200;
      _renderTimeline();
    }
  });

  // Timeline play/stop/clear
  document.getElementById('matrix-timeline-play').addEventListener('click', _playTimeline);
  document.getElementById('matrix-timeline-stop').addEventListener('click', _stopTimeline);
  document.getElementById('matrix-timeline-clear').addEventListener('click', () => {
    timeline = [];
    timelineSelected = -1;
    _renderTimeline();
  });

  // Guardar animación
  document.getElementById('matrix-save-animation').addEventListener('click', () => {
    const nameInput = document.getElementById('matrix-anim-name');
    const name = nameInput.value.trim();
    if (!name) { _toast('Escribe un nombre para la animación'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(name)) { _toast('Solo letras, números y _'); return; }
    if (timeline.length === 0) { _toast('La línea de tiempo está vacía'); return; }

    // Una animación propia viaja dentro del .ino como tabla. Si no cabe, va
    // como tabs .h —el mismo reparto que el recurso— y el bloque la reproduce
    // desde los dos arreglos.
    let tabsEnTabs = null;
    if (cfg.canvas) {
      const bytes = encodeCuadros(timeline.map(f => Uint8Array.from(f.data)));
      if (cabeEnIno(bytes)) {
        delete enTabs[name];
      } else {
        tabsEnTabs = _guardarAnimsEnTabs(name, bytes);
      }
    }

    savedAnims[name] = timeline.map(f => cfg.toAnimFrame(f));
    _saveAnims();
    _renderAnimList();
    nameInput.value = '';
    if (tabsEnTabs) {
      _toast(name + ': ' + timeline.length + ' cuadros en ' + tabsEnTabs.length
        + ' tabs .h (' + tabsEnTabs.join(', ') + ')');
    } else {
      _toast(`Animación "${name}" guardada (${timeline.length} frames)`);
    }
  });
}

// ═══ Presets ════════════════════════════════════

function _populatePresets() {
  const select = document.getElementById('matrix-preset');
  select.innerHTML = '<option value="">— Cargar ícono —</option>';
  const presets = cfg.presets();
  const names = Object.keys(presets);
  for (const name of names) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  }
  select.onchange = () => {
    const key = select.value;
    if (key && presets[key]) {
      _loadFrameToGrid(presets[key]);
      _update();
    }
  };
}

// ═══ Helpers ════════════════════════════════════

function _toast(msg) {
  if (window._showToast) window._showToast(msg);
}

function _esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
