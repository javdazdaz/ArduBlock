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

import { MATRIX_FRAMES, MATRIX_ANIMATIONS } from './blocks/ledmatrix.js';
import { MAX7219_FRAMES } from './blocks/max7219.js';

// ═══ Configuración por modo ════════════════════

const MODES = {
  r4: {
    label: 'R4 12×8',
    cols: 12,
    framesKey: 'ardublock:matrix-frames',
    animsKey: 'ardublock:matrix-animations',
    presets: () => MATRIX_FRAMES,
    animPresets: () => MATRIX_ANIMATIONS,
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
  _bindEvents();
  _bindModeTabs();
  _update();
}

export function initPanelModeTabs() {
  const tabCode = document.getElementById('panel-tab-code');
  const tabAnim = document.getElementById('panel-tab-anim');
  const codeViews = document.getElementById('code-view-ino');
  const hView = document.getElementById('code-edit-h');
  const animView = document.getElementById('code-view-animation');
  const codeTabs = document.getElementById('code-tabs');
  const arduinoToolbar = document.querySelector('.arduino-toolbar');
  const headerTitle = document.querySelector('.panel-header h2');

  function switchMode(mode) {
    tabCode.classList.toggle('active', mode === 'code');
    tabAnim.classList.toggle('active', mode === 'animation');

    const editorPanel = document.getElementById('editor-panel');
    const resizer = document.getElementById('panel-resizer');
    const codePanel = document.getElementById('code-panel');

    if (mode === 'code') {
      headerTitle.textContent = 'Código Arduino (C++)';
      codeTabs.style.display = '';
      if (arduinoToolbar) arduinoToolbar.style.display = '';
      animView.style.display = 'none';
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
      headerTitle.textContent = 'Matriz LED — Editor de frames';
      codeTabs.style.display = 'none';
      if (arduinoToolbar) arduinoToolbar.style.display = 'none';
      codeViews.style.display = 'none';
      hView.style.display = 'none';
      animView.style.display = '';
      if (editorPanel) editorPanel.style.display = 'none';
      if (resizer) resizer.style.display = 'none';
      if (codePanel) codePanel.style.flex = '1';
    }

    const lc = document.getElementById('line-count');
    if (lc) lc.style.display = mode === 'code' ? '' : 'none';
    const collapseBtn = document.getElementById('btn-collapse-code');
    if (collapseBtn) collapseBtn.style.display = mode === 'code' ? '' : 'none';
  }

  tabCode.addEventListener('click', () => switchMode('code'));
  tabAnim.addEventListener('click', () => switchMode('animation'));
}

// ═══ Modo ════════════════════════════════════════

function _initMode() {
  try {
    const saved = localStorage.getItem('ardublock:matrix-editor-mode');
    if (saved === 'max7219' || saved === 'r4' || saved === 'direct') mode = saved;
  } catch (_) {}
  _applyMode();
}

function _applyMode() {
  cfg = MODES[mode];
  frameData = new Array(8).fill(0).map(() => new Array(cfg.cols).fill(0));

  // Actualizar tabs visuales
  document.querySelectorAll('.matrix-mode-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });

  // Mostrar/ocultar hex display según modo
  const hexR4 = document.getElementById('matrix-hex-r4');
  const hex7219 = document.getElementById('matrix-hex-max7219');
  if (hexR4) hexR4.style.display = mode === 'r4' ? '' : 'none';
  if (hex7219) hex7219.style.display = (mode === 'max7219' || mode === 'direct') ? '' : 'none';

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

function _loadStorage() {
  try {
    savedFrames = JSON.parse(localStorage.getItem(cfg.framesKey)) || {};
    savedAnims = JSON.parse(localStorage.getItem(cfg.animsKey)) || {};
  } catch (_) {
    savedFrames = {};
    savedAnims = {};
  }
}

function _saveFrames() {
  localStorage.setItem(cfg.framesKey, JSON.stringify(savedFrames));
}

function _saveAnims() {
  localStorage.setItem(cfg.animsKey, JSON.stringify(savedAnims));
}

// ═══ Grid ═══════════════════════════════════════

function _buildGrid() {
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${cfg.cols}, 28px)`;
  cells = [];
  for (let row = 0; row < 8; row++) {
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

function _toggleCell(row, col) {
  frameData[row][col] = frameData[row][col] ? 0 : 1;
  _update();
}

function _clearAll() {
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < cfg.cols; col++)
      frameData[row][col] = 0;
}

function _invertAll() {
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < cfg.cols; col++)
      frameData[row][col] = frameData[row][col] ? 0 : 1;
}

function _loadFrameToGrid(data) {
  // data is the encoded format (u32 array or byte array)
  frameData = cfg.decode(data);
}

// ═══ Render ═════════════════════════════════════

function _update() {
  const data = cfg.encode(frameData);

  // Grid cells
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < cfg.cols; col++)
      cells[row][col].classList.toggle('on', frameData[row][col] === 1);

  // Hex display
  cfg.renderHex(data);

  // Two-way binding: sincronizar timeline selection
  if (timelineSelected >= 0 && timelineSelected < timeline.length) {
    timeline[timelineSelected].data = cfg.toStorageFrame(data);
    _syncTimelineCanvas(timelineSelected);
  }
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
  const cw = w / cfg.cols, ch = h / 8;
  const fd = cfg.decode(data);
  for (let row = 0; row < 8; row++) {
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
    const fc = anim ? anim.length : 0;
    html += `<div class="matrix-frame-item" data-anim="${name}" draggable="true">
      <span class="frame-item-name">📦 ${_esc(name)}</span>
      <span style="font-size:0.6rem;opacity:0.5;margin-left:auto">${fc}f</span>
    </div>`;
  }

  // Custom del usuario (eliminables)
  for (const name of customNames) {
    const anim = savedAnims[name];
    const fc = anim ? anim.length : 0;
    html += `<div class="matrix-frame-item" data-anim="${name}" data-custom="1" draggable="true">
      <span class="frame-item-name">🎞 ${_esc(name)}</span>
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
      if (anim && anim.length > 0) {
        timeline = anim.map((f, i) => {
          // R4 format: [u32_0, u32_1, u32_2, dur]
          // MAX7219 format: [b0..b7, dur]
          const dur = f[cfg.cols === 12 ? 3 : 8] || 200;
          const data = cfg.cols === 12
            ? [f[0], f[1], f[2]]
            : f.slice(0, 8);
          return { name, data, dur };
        });
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

// ═══ Timeline ═══════════════════════════════════

function _renderTimeline() {
  const track = document.getElementById('matrix-timeline-track');

  if (timeline.length === 0) {
    track.innerHTML = '<div class="matrix-timeline-empty">Arrastrá frames desde el panel lateral o usá el botón +</div>';
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
  track.innerHTML = html;

  // Dibujar canvas de cada frame
  track.querySelectorAll('.matrix-timeline-frame canvas').forEach((canvas, i) => {
    if (i < timeline.length) _drawTimelineCanvas(canvas, timeline[i].data);
  });

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
}

function _addCurrentToTimeline() {
  const dur = parseInt(document.getElementById('matrix-timeline-duration').value) || 200;
  const empty = cfg.cols === 12 ? [0, 0, 0] : [0,0,0,0,0,0,0,0];
  timeline.push({ name: 'blank', data: [...empty], dur });
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
      if (anim && anim.length > 0) {
        timeline = anim.map((f) => {
          const dur = f[cfg.cols === 12 ? 3 : 8] || 200;
          const data = cfg.cols === 12 ? [f[0], f[1], f[2]] : f.slice(0, 8);
          return { name: animName, data, dur };
        });
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
  document.getElementById('matrix-timeline-duration').value = f.dur;
  _renderTimeline();
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
    savedAnims[name] = timeline.map(f => cfg.toAnimFrame(f));
    _saveAnims();
    _renderAnimList();
    nameInput.value = '';
    _toast(`Animación "${name}" guardada (${timeline.length} frames)`);
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
