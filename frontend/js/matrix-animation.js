/**
 * ArduBlock — Editor visual de Matriz LED (12×8)
 *
 * Grid interactivo para diseñar frames de la matriz LED del R4.
 * Genera los 3 valores uint32_t correspondientes.
 */

import { MATRIX_FRAMES } from './blocks/ledmatrix.js';

let grid, cells, previewCtx;
let frameData = new Array(8).fill(0).map(() => new Array(12).fill(0));

export function initMatrixEditor() {
  grid = document.getElementById('matrix-grid');
  const presetSelect = document.getElementById('matrix-preset');
  const clearBtn = document.getElementById('matrix-clear-grid');
  const invertBtn = document.getElementById('matrix-invert-grid');
  const useBtn = document.getElementById('matrix-use-frame');
  const previewCanvas = document.getElementById('matrix-preview-canvas');

  previewCtx = previewCanvas.getContext('2d');

  // Build 12×8 grid
  _buildGrid();

  // Populate preset dropdown
  _populatePresets(presetSelect);

  // Events
  clearBtn.addEventListener('click', () => { _clearAll(); _update(); });
  invertBtn.addEventListener('click', () => { _invertAll(); _update(); });
  presetSelect.addEventListener('change', () => {
    const key = presetSelect.value;
    if (key && MATRIX_FRAMES[key]) {
      _loadFrame(MATRIX_FRAMES[key]);
      _update();
    }
  });
  useBtn.addEventListener('click', _useFrame);

  // Initial render
  _update();
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
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 12; col++) {
      frameData[row][col] = 0;
    }
  }
}

function _invertAll() {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 12; col++) {
      frameData[row][col] = frameData[row][col] ? 0 : 1;
    }
  }
}

// ═══ Frame encoding (MSB-first, row-major) ═════

function _encodeFrame() {
  // Pack 8 rows × 12 bits into 96 bits: row 0 at MSB, row 7 at LSB
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

// ═══ Update ═════════════════════════════════════

function _update() {
  const u32 = _encodeFrame();

  // Update grid cells
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 12; col++) {
      cells[row][col].classList.toggle('on', frameData[row][col] === 1);
    }
  }

  // Update hex display
  document.getElementById('matrix-hex-0').textContent = '0x' + u32[0].toString(16);
  document.getElementById('matrix-hex-1').textContent = '0x' + u32[1].toString(16);
  document.getElementById('matrix-hex-2').textContent = '0x' + u32[2].toString(16);

  // Update canvas preview
  _drawPreview();
}

function _drawPreview() {
  const w = 120, h = 80;
  previewCtx.clearRect(0, 0, w, h);
  const cw = w / 12, ch = h / 8;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 12; col++) {
      previewCtx.fillStyle = frameData[row][col] ? '#e94560' : '#1a1a2e';
      previewCtx.fillRect(col * cw, row * ch, cw - 1, ch - 1);
    }
  }
}

// ═══ Presets ════════════════════════════════════

function _populatePresets(select) {
  const names = Object.keys(MATRIX_FRAMES);
  for (const name of names) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  }
}

function _loadFrame(u32) {
  frameData = _decodeFrame(u32);
}

// ═══ Use frame: inserta como bloque custom en workspace ═══

function _useFrame() {
  const u32 = _encodeFrame();
  const hex = `{ 0x${u32[0].toString(16)}, 0x${u32[1].toString(16)}, 0x${u32[2].toString(16)} }`;

  // Copiar al portapapeles como código C++
  const code = `matrix.loadFrame(${hex});`;
  navigator.clipboard.writeText(code).then(() => {
    if (window._showToast) {
      window._showToast('Frame copiado: ' + hex);
    }
  }).catch(() => {
    // Fallback: mostrar en un alert
    alert('Frame generado:\n' + code);
  });
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

    if (mode === 'code') {
      headerTitle.textContent = 'Código Arduino (C++)';
      codeTabs.style.display = '';
      if (arduinoToolbar) arduinoToolbar.style.display = '';
      animView.style.display = 'none';
      // Restaurar vista de código activa
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
    }

    // Actualizar line count
    const lc = document.getElementById('line-count');
    if (lc) lc.style.display = mode === 'code' ? '' : 'none';
  }

  tabCode.addEventListener('click', () => switchMode('code'));
  tabAnim.addEventListener('click', () => switchMode('animation'));

  return { switchMode, getMode: () => currentMode };
}
