/**
 * ArduBlock — Gestión de Tabs de Código
 *
 * Maneja la barra de tabs: sketch.ino (readonly, fijo) + .h (editables).
 * Sincroniza contenido entre textarea y estado interno, expone getTabs()
 * para el generador, upload y project-manager.
 *
 * Actualiza #line-count al cambiar de tab y al editar .h.
 */

let tabs, activeFilename, tabBar, preView, textEditor, lineCount;

/**
 * Inicializa el TabManager con referencias del DOM.
 * @param {Object} deps - Dependencias (no requiere dependencias externas por ahora)
 */
export function initTabManager(deps = {}) {
  tabs = [
    { filename: 'sketch.ino', content: '', readonly: true }
  ];
  activeFilename = 'sketch.ino';
  tabBar    = document.getElementById('code-tabs');
  preView   = document.getElementById('code-view-ino');
  textEditor = document.getElementById('code-edit-h');
  lineCount = document.getElementById('line-count');

  _bindEvents();
  _showActiveTab();
}

// ── Eventos ──────────────────────────────────────

function _bindEvents() {
  // Botón "+" para nuevo .h
  const addBtn = document.getElementById('btn-add-tab');
  if (addBtn) addBtn.addEventListener('click', () => _addTab());

  // Sincronizar contenido del textarea al estado
  textEditor.addEventListener('input', () => _syncContent());

  // Delegación de clicks en la barra de tabs
  tabBar.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.code-tab');
    if (!tabBtn) return;

    // ¿Click en el botón de cerrar?
    if (e.target.closest('.tab-close')) {
      e.stopPropagation();
      _closeTab(tabBtn.dataset.tab);
      return;
    }

    _switchTab(tabBtn.dataset.tab);
  });
}

// ── Acciones de tabs ─────────────────────────────

function _addTab() {
  const name = prompt('Nombre del archivo (ej: config.h):');
  if (!name || !name.trim()) return;

  let filename = name.trim();
  // Agregar .h si el usuario no lo puso
  if (!filename.endsWith('.h') && !filename.endsWith('.hpp')) {
    filename += '.h';
  }

  // Validar nombre: solo letras, números, guiones, underscore, punto
  if (!/^[a-zA-Z0-9_-]+\.(h|hpp)$/.test(filename)) {
    alert('Nombre inválido. Usá solo letras, números, guiones y underscore (ej: config.h).');
    return;
  }

  // Duplicados
  if (tabs.find(t => t.filename === filename)) {
    alert(`Ya existe un archivo "${filename}".`);
    return;
  }

  tabs.push({ filename, content: '', readonly: false });
  _renderTabs();
  _switchTab(filename);
}

function _closeTab(filename) {
  const idx = tabs.findIndex(t => t.filename === filename);
  if (idx === -1) return;
  if (tabs[idx].readonly) return; // sketch.ino no se cierra

  // Si tiene contenido, confirmar
  if (tabs[idx].content.trim()) {
    if (!confirm(`¿Eliminar "${filename}"? Su contenido se perderá.`)) return;
  }

  // Si es el tab activo, volver a sketch.ino
  if (activeFilename === filename) {
    _switchTab('sketch.ino');
  }

  tabs.splice(idx, 1);
  _renderTabs();
}

function _switchTab(filename) {
  if (activeFilename === filename) return;

  // Guardar contenido del tab actual antes de salir
  _syncContent();

  activeFilename = filename;
  const tab = tabs.find(t => t.filename === filename);
  if (!tab) return;

  if (tab.readonly) {
    preView.style.display = '';
    textEditor.style.display = 'none';
    // Refrescar código generado al volver a .ino
    if (typeof window.updateCode === 'function') window.updateCode();
  } else {
    preView.style.display = 'none';
    textEditor.style.display = '';
    textEditor.value = tab.content;
    textEditor.focus();
  }

  _renderTabs();
}

// ── Sincronización ───────────────────────────────

function _syncContent() {
  if (activeFilename === 'sketch.ino') return; // readonly, no sincronizar
  const tab = tabs.find(t => t.filename === activeFilename);
  if (tab && !tab.readonly) {
    tab.content = textEditor.value;
    _updateLineCount();
  }
}

// ── Renderizado de la barra de tabs ──────────────

function _renderTabs() {
  // Limpiar tabs existentes (pero no el botón "+")
  const existing = tabBar.querySelectorAll('.code-tab');
  existing.forEach(el => el.remove());

  const addBtn = document.getElementById('btn-add-tab');

  for (const tab of tabs) {
    const btn = document.createElement('button');
    btn.className = 'code-tab';
    btn.dataset.tab = tab.filename;
    btn.dataset.readonly = String(tab.readonly);

    if (tab.filename === activeFilename) {
      btn.classList.add('active');
    }

    const icon = tab.readonly ? '📄' : '📝';
    const hasContent = tab.content && tab.content.trim();

    if (tab.readonly) {
      btn.textContent = `${icon} ${tab.filename}`;
    } else {
      // Indicador visual si tiene contenido (círculo verde)
      const dot = hasContent ? ' <span style="color:#27ae60;font-size:10px">●</span>' : '';
      btn.innerHTML = `${icon} ${tab.filename}${dot} <span class="tab-close">&times;</span>`;
    }

    tabBar.insertBefore(btn, addBtn);
  }
}

// ── API pública ──────────────────────────────────

/**
 * Devuelve los tabs .h con su contenido para guardar/cargar.
 * @returns {Array<{filename: string, content: string}>}
 */
export function getTabs() {
  // Sincronizar el tab activo antes de devolver
  _syncContent();
  return tabs
    .filter(t => !t.readonly)
    .map(t => ({ filename: t.filename, content: t.content }));
}

/**
 * Carga tabs desde datos de proyecto (usado por project-manager).
 * @param {Array<{filename: string, content: string}>} tabData
 */
export function loadTabs(tabData) {
  if (!Array.isArray(tabData) || !tabData.length) {
    // Resetear a estado inicial
    tabs = [{ filename: 'sketch.ino', content: '', readonly: true }];
    activeFilename = 'sketch.ino';
    _renderTabs();
    _showActiveTab();
    return;
  }

  tabs = [
    { filename: 'sketch.ino', content: '', readonly: true },
    ...tabData.map(t => ({
      filename: t.filename,
      content: t.content || '',
      readonly: false
    }))
  ];

  activeFilename = 'sketch.ino';
  _renderTabs();
  _showActiveTab();
}

// ── Helpers internos ─────────────────────────────

function _showActiveTab() {
  if (activeFilename === 'sketch.ino') {
    preView.style.display = '';
    textEditor.style.display = 'none';
  } else {
    preView.style.display = 'none';
    textEditor.style.display = '';
    const tab = tabs.find(t => t.filename === activeFilename);
    if (tab) textEditor.value = tab.content;
    textEditor.focus();
    _updateLineCount();
  }
}

/**
 * Actualiza el contador de líneas según el tab activo.
 * Para .h: cuenta líneas del textarea. Para .ino: lo maneja updateCode() en main.js.
 */
function _updateLineCount() {
  if (!lineCount) return;
  if (activeFilename === 'sketch.ino') return; // main.js se encarga

  const lines = textEditor.value.split('\n').length;
  // Buscar el texto "líneas" / "lines" para preservar i18n
  const labelEl = lineCount.querySelector('span');
  const label = labelEl ? labelEl.textContent : 'líneas';
  lineCount.childNodes[0].textContent = lines + ' ';
}
