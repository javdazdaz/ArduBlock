/**
 * ArduBlock — Editor visual de Matriz LED (12×8)
 *
 * Grid interactivo, frames guardados en localStorage,
 * línea de tiempo para crear animaciones.
 */

import { MATRIX_FRAMES, MATRIX_ANIMATIONS } from './blocks/ledmatrix.js';

const STORAGE_KEY_FRAMES = 'ardublock:matrix-frames';
const STORAGE_KEY_ANIMS = 'ardublock:matrix-animations';

let grid, cells;
let frameData = new Array(8).fill(0).map(() => new Array(12).fill(0));
let savedFrames = {};      // { name: [u32_0, u32_1, u32_2] }
let savedAnims = {};       // { name: [[u32_0,u32_1,u32_2,dur], ...] }
let timeline = [];          // [{ name, u32, dur }]
let selectedFrame = null;   // nombre del frame seleccionado en sidebar
let timelineSelected = -1;  // índice en timeline
let playTimer = null;
let playIndex = 0;
let insertIdx = -1;         // posición de inserción en timeline durante drag

export function initMatrixEditor() {
  grid = document.getElementById('matrix-grid');

  _loadStorage();
  _buildGrid();
  _populatePresets();
  _renderFrameList();
  _renderAnimList();
  _renderTimeline();
  _setupTimelineDrop();
  _bindEvents();
  _update();
}

// ═══ Storage ═══════════════════════════════════

function _loadStorage() {
  try {
    savedFrames = JSON.parse(localStorage.getItem(STORAGE_KEY_FRAMES)) || {};
    savedAnims = JSON.parse(localStorage.getItem(STORAGE_KEY_ANIMS)) || {};
  } catch (_) {
    savedFrames = {};
    savedAnims = {};
  }
}

function _saveFrames() {
  localStorage.setItem(STORAGE_KEY_FRAMES, JSON.stringify(savedFrames));
}

function _saveAnims() {
  localStorage.setItem(STORAGE_KEY_ANIMS, JSON.stringify(savedAnims));
}

// ═══ Grid ═══════════════════════════════════════

function _buildGrid() {
  grid.innerHTML = '';
  cells = [];
  for (let row = 0; row < 8; row++) {
    cells[row] = [];
    for (let col = 0; col < 12; col++) {
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
    for (let col = 0; col < 12; col++)
      frameData[row][col] = 0;
}

function _invertAll() {
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 12; col++)
      frameData[row][col] = frameData[row][col] ? 0 : 1;
}

// ═══ Frame encoding (MSB-first, row-major) ═════

function _encodeFrame() {
  let bits = 0n;
  for (let row = 0; row < 8; row++) {
    let rowVal = 0;
    for (let col = 0; col < 12; col++) {
      if (frameData[row][col]) rowVal |= (1 << (11 - col));
    }
    bits |= BigInt(rowVal) << BigInt((7 - row) * 12);
  }
  return [
    Number((bits >> 64n) & 0xFFFFFFFFn),
    Number((bits >> 32n) & 0xFFFFFFFFn),
    Number(bits & 0xFFFFFFFFn),
  ];
}

function _decodeFrame(u32) {
  const bits = (BigInt(u32[0]) << 64n) | (BigInt(u32[1]) << 32n) | BigInt(u32[2]);
  const data = [];
  for (let row = 0; row < 8; row++) {
    const rowVal = Number((bits >> BigInt((7 - row) * 12)) & 0xFFFn);
    const cols = [];
    for (let col = 0; col < 12; col++) {
      cols.push((rowVal >> (11 - col)) & 1);
    }
    data.push(cols);
  }
  return data;
}

function _loadFrameToGrid(u32) {
  frameData = _decodeFrame(u32);
}

// ═══ Render ═════════════════════════════════════

function _update() {
  const u32 = _encodeFrame();

  // Grid cells
  for (let row = 0; row < 8; row++)
    for (let col = 0; col < 12; col++)
      cells[row][col].classList.toggle('on', frameData[row][col] === 1);

  // Hex display
  document.getElementById('matrix-hex-0').textContent = '0x' + u32[0].toString(16);
  document.getElementById('matrix-hex-1').textContent = '0x' + u32[1].toString(16);
  document.getElementById('matrix-hex-2').textContent = '0x' + u32[2].toString(16);

  // Two-way binding: si hay frame seleccionado en timeline, sincronizar
  if (timelineSelected >= 0 && timelineSelected < timeline.length) {
    timeline[timelineSelected].u32 = [...u32];
    _syncTimelineCanvas(timelineSelected);
  }
}

function _syncTimelineCanvas(idx) {
  const track = document.getElementById('matrix-timeline-track');
  const frameEl = track.querySelector(`.matrix-timeline-frame[data-idx="${idx}"]`);
  if (frameEl) {
    const canvas = frameEl.querySelector('canvas');
    if (canvas) _drawTimelineCanvas(canvas, timeline[idx].u32);
  }
}

function _drawTimelineCanvas(canvas, u32) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const cw = w / 12, ch = h / 8;
  const data = _decodeFrame(u32);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 12; col++) {
      ctx.fillStyle = data[row][col] ? '#e94560' : '#1a1a2e';
      ctx.fillRect(col * cw, row * ch, cw - 0.5, ch - 0.5);
    }
  }
}

// ═══ Sidebar: frames guardados + drag & drop ══

function _renderFrameList() {
  const list = document.getElementById('matrix-frame-list');
  const names = Object.keys(savedFrames).sort();

  // Update count in category header
  const cat = list.previousElementSibling;
  if (cat && cat.classList.contains('matrix-sidebar-cat')) {
    cat.innerHTML = `📁 Frames <span class="matrix-frame-count">${names.length}</span>`;
  }

  if (names.length === 0) {
    list.innerHTML = '<div class="matrix-frame-empty">Sin frames</div>';
    return;
  }

  list.innerHTML = names.map(name => {
    const sel = name === selectedFrame ? ' selected' : '';
    return `<div class="matrix-frame-item${sel}" data-name="${name}" draggable="true">
      <canvas class="frame-preview" width="54" height="36"></canvas>
      <span class="frame-item-name">${_esc(name)}</span>
      <span class="frame-item-del" data-del="${name}">✕</span>
    </div>`;
  }).join('');

  // Dibujar mini previews
  list.querySelectorAll('.frame-preview').forEach(canvas => {
    const name = canvas.parentElement.dataset.name;
    _drawTimelineCanvas(canvas, savedFrames[name]);
  });

  // Click: seleccionar y cargar en grid
  list.querySelectorAll('.matrix-frame-item').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('frame-item-del')) return;
      const name = el.dataset.name;
      selectedFrame = name;
      _loadFrameToGrid(savedFrames[name]);
      _update();
      _renderFrameList();
    });

    // Drag & drop
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', el.dataset.name);
      e.dataTransfer.effectAllowed = 'copy';
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
    });
  });

  // Click en ✕: eliminar
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

// ═══ Sidebar: animaciones guardadas ═════════════

function _renderAnimList() {
  const list = document.getElementById('matrix-anim-list');
  const customNames = Object.keys(savedAnims).sort();
  const builtinNames = Object.keys(MATRIX_ANIMATIONS);
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
    const anim = MATRIX_ANIMATIONS[name];
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
      const anim = el.dataset.custom ? savedAnims[name] : MATRIX_ANIMATIONS[name];
      if (anim && anim.length > 0) {
        timeline = anim.map(f => ({
          name, u32: [f[0], f[1], f[2]], dur: f[3] || 200
        }));
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
      <canvas width="50" height="50"></canvas>
      <span class="frame-dur">${f.dur}ms</span>
      <span class="timeline-frame-del" data-del="${i}">✕</span>
    </div>`;
  }
  html += '<div class="matrix-timeline-add" title="Añadir frame actual">+</div>';
  track.innerHTML = html;

  // Dibujar canvas de cada frame
  track.querySelectorAll('.matrix-timeline-frame canvas').forEach((canvas, i) => {
    if (i < timeline.length) _drawTimelineCanvas(canvas, timeline[i].u32);
  });

  // Click en frame: seleccionar + dragstart para reordenar
  track.querySelectorAll('.matrix-timeline-frame').forEach(el => {
    el.addEventListener('click', () => {
      timelineSelected = parseInt(el.dataset.idx);
      _renderTimeline();
      const f = timeline[timelineSelected];
      if (f) {
        _loadFrameToGrid(f.u32);
        _update();
        document.getElementById('matrix-timeline-duration').value = f.dur;
      }
    });

    // Drag para reordenar
    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/x-timeline-idx', el.dataset.idx);
      e.dataTransfer.effectAllowed = 'move';
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
    });
  });

  // Botón ✕: borrar frame individual
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
  if (addBtn) {
    addBtn.addEventListener('click', _addCurrentToTimeline);
  }
}

function _addCurrentToTimeline() {
  const u32 = _encodeFrame();
  const dur = parseInt(document.getElementById('matrix-timeline-duration').value) || 200;
  const label = selectedFrame || 'frame' + (timeline.length + 1);
  timeline.push({ name: label, u32: [...u32], dur });
  _renderTimeline();
}

// ── Drop handlers (se registran una sola vez) ──

function _setupTimelineDrop() {
  const track = document.getElementById('matrix-timeline-track');

  track.addEventListener('dragover', (e) => {
    e.preventDefault();

    // Si es arrastre interno (reorden), calcular posición de inserción
    const srcIdx = e.dataTransfer.getData('application/x-timeline-idx');
    if (srcIdx !== '') {
      e.dataTransfer.dropEffect = 'move';
      _updateInsertIndicator(e.clientX);
    } else {
      e.dataTransfer.dropEffect = 'copy';
      track.classList.add('drag-over');
    }
  });

  track.addEventListener('dragleave', () => {
    track.classList.remove('drag-over');
    _clearInsertIndicator();
  });

  track.addEventListener('drop', (e) => {
    e.preventDefault();
    track.classList.remove('drag-over');
    _clearInsertIndicator();

    // Reorden interno
    const srcIdx = e.dataTransfer.getData('application/x-timeline-idx');
    if (srcIdx !== '') {
      const from = parseInt(srcIdx);
      let to = insertIdx >= 0 ? insertIdx : timeline.length;
      // Ajustar: si movemos hacia la derecha, el índice se desplaza
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
      if (!frame) frame = MATRIX_FRAMES[frameName];
      if (frame) {
        const dur = parseInt(document.getElementById('matrix-timeline-duration').value) || 200;
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const frameEl = target?.closest('.matrix-timeline-frame');
        if (frameEl) {
          const idx = parseInt(frameEl.dataset.idx);
          timeline.splice(idx, 0, { name: frameName, u32: [...frame], dur });
        } else {
          timeline.push({ name: frameName, u32: [...frame], dur });
        }
        _renderTimeline();
        return;
      }
    }
    // Animación completa (desde sidebar)
    const animName = e.dataTransfer.getData('application/x-matrix-anim');
    if (animName) {
      const isCustom = e.dataTransfer.getData('application/x-matrix-anim-custom') === '1';
      const anim = isCustom ? savedAnims[animName] : MATRIX_ANIMATIONS[animName];
      if (anim && anim.length > 0) {
        timeline = anim.map(f => ({
          name: animName, u32: [f[0], f[1], f[2]], dur: f[3] || 200
        }));
        _renderTimeline();
        _toast(`Animación "${animName}" cargada (${timeline.length} frames)`);
      }
    }
  });
}

// ── Indicador de inserción para reorden ──

function _updateInsertIndicator(clientX) {
  const track = document.getElementById('matrix-timeline-track');
  const frames = track.querySelectorAll('.matrix-timeline-frame');
  _clearInsertIndicator();

  insertIdx = timeline.length; // default: al final
  for (let i = 0; i < frames.length; i++) {
    const rect = frames[i].getBoundingClientRect();
    const mid = rect.left + rect.width / 2;
    if (clientX < mid) {
      insertIdx = i;
      frames[i].classList.add('insert-before');
      return;
    }
  }
  // Al final: iluminar el botón +
  const addBtn = track.querySelector('.matrix-timeline-add');
  if (addBtn) addBtn.classList.add('insert-before');
}

function _clearInsertIndicator() {
  const track = document.getElementById('matrix-timeline-track');
  track.querySelectorAll('.insert-before').forEach(el => el.classList.remove('insert-before'));
  insertIdx = -1;
}

function _playTimeline() {
  if (timeline.length === 0) return;
  _stopTimeline();
  playIndex = 0;
  _showTimelineFrame(playIndex);
  playTimer = setInterval(() => {
    playIndex++;
    if (playIndex >= timeline.length) {
      _stopTimeline();
      return;
    }
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
  _loadFrameToGrid(f.u32);
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
    const u32 = _encodeFrame();
    savedFrames[name] = [...u32];
    _saveFrames();
    selectedFrame = name;
    _renderFrameList();
    nameInput.value = '';
    _toast(`Frame "${name}" guardado`);
  });

  // Copiar C++
  document.getElementById('matrix-use-frame').addEventListener('click', () => {
    const u32 = _encodeFrame();
    const code = `matrix.loadFrame({0x${u32[0].toString(16)}, 0x${u32[1].toString(16)}, 0x${u32[2].toString(16)}});`;
    navigator.clipboard.writeText(code).then(() => _toast('Copiado: ' + code));
  });

  // Timeline: añadir frame actual
  document.getElementById('matrix-timeline-duration').addEventListener('change', function() {
    if (timelineSelected >= 0 && timelineSelected < timeline.length) {
      timeline[timelineSelected].dur = parseInt(this.value) || 200;
      _renderTimeline();
    }
  });

  // Timeline: play/stop/clear
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
    savedAnims[name] = timeline.map(f => [...f.u32, f.dur]);
    _saveAnims();
    _renderAnimList();
    nameInput.value = '';
    _toast(`Animación "${name}" guardada (${timeline.length} frames)`);
  });
}

// ═══ Presets ════════════════════════════════════

function _populatePresets() {
  const select = document.getElementById('matrix-preset');
  const names = Object.keys(MATRIX_FRAMES);
  for (const name of names) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  }
  select.addEventListener('change', () => {
    const key = select.value;
    if (key && MATRIX_FRAMES[key]) {
      _loadFrameToGrid(MATRIX_FRAMES[key]);
      _update();
    }
  });
}

// ═══ Helpers ════════════════════════════════════

function _toast(msg) {
  if (window._showToast) window._showToast(msg);
}

function _esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ═══ Panel toggle ══════════════════════════════

let currentMode = 'code';

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
    currentMode = mode;
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
  }

  tabCode.addEventListener('click', () => switchMode('code'));
  tabAnim.addEventListener('click', () => switchMode('animation'));

  return { switchMode, getMode: () => currentMode };
}
