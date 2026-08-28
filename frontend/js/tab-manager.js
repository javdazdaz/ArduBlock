/**
 * ArduBlock — Gestión de Tabs de Código (CodeMirror 6)
 *
 * Maneja la barra de tabs: sketch.ino (readonly, fijo) + .h/.html (editables).
 * Usa CodeMirror 6 para syntax highlighting (C++) y números de línea.
 * Sincroniza contenido entre editor y estado interno, expone getTabs()
 * para el generador, upload y project-manager.
 *
 * Memoria de línea de trabajo (ago 2026):
 * - Cada tab editable mantiene su propio `EditorState` (doc + selección +
 *   historial de undo independientes). Al cambiar de tab se hace
 *   `hView.setState(tab.state)`, así cursor y undo quedan por archivo.
 * - El scroll vive en el DOM (no en el state), así que se guarda/restaura
 *   manualmente por tab.
 * - El cursor (línea/columna) de los tabs editables se persiste en el
 *   proyecto guardado (campo opcional `cursor`); el scroll y la posición del
 *   .ino (código generado) son solo de sesión.
 *
 * Buscador (ago 2026): @codemirror/search — Ctrl+F en .ino y tabs editables,
 * botón 🔍 en la barra de tabs.
 */

import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { cpp } from '@codemirror/lang-cpp';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { search, searchKeymap, highlightSelectionMatches, openSearchPanel, closeSearchPanel } from '@codemirror/search';
import { changesFromUpdate } from './text-collaboration.js';
import { TextCollaborationClient } from './text-collaboration.js';

let tabs, activeFilename, tabBar, lineCount;
let inoView, hView;           // CodeMirror EditorView instances
let inoContainer, hContainer;  // DOM parents
let collaborationClient = null;
let collaborationClients = new Map();
let collaborationFiles = new Map();

// Posición (sesión) del editor .ino para restaurar al volver a él.
let _inoPos = null;

// ═══ Tema dinámico (light/dark) ══════════════════

const themeCompartment = new Compartment();
const langCompartment = new Compartment();

const lightTheme = [
  EditorView.theme({
    '&': {
      backgroundColor: 'var(--bg-code)',
      color: 'var(--code-text)'
    },
    '.cm-gutters': {
      backgroundColor: 'var(--bg-panel)',
      color: 'var(--text-dim)',
      border: 'none'
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--bg-input)'
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--bg-input)'
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--accent, #0077aa)'
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: '#0077aa40'
    },
    '.cm-matchingBracket': {
      backgroundColor: '#0077aa30',
      outline: '1px solid #0077aa80'
    },
  }, { dark: false }),
  syntaxHighlighting(defaultHighlightStyle),
];

// ═══ Extensiones compartidas ══════════════════════

const sharedExtensions = [
  themeCompartment.of([...oneDark]),  // default: dark
  lineNumbers(),
  highlightActiveLineGutter(),
];

/**
 * Extensiones de un tab editable (un estado por archivo, con su propio
 * historial de undo). `lang` se fija al crear el estado según la extensión.
 */
function _editableExtensions(lang) {
  return [
    langCompartment.of(lang),
    ...sharedExtensions,
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
    highlightActiveLine(),
    highlightSelectionMatches(),
    search({ top: true }),
    EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      const tab = tabs.find(t => t.filename === activeFilename);
      if (tab && !tab.readonly) {
        tab.content = update.state.doc.toString();
        tab.state = update.state;   // mantener la referencia (selección + undo)
        collaborationClient?.enqueue(changesFromUpdate(update));
        _updateLineCount();
        if (window._scheduleUndoPush) window._scheduleUndoPush();
      }
    }),
  ];
}

// ═══ Inicialización ══════════════════════════════

export function initTabManager(_deps = {}) {
  tabs = [
    { filename: 'sketch.ino', content: '', readonly: true }
  ];
  activeFilename = 'sketch.ino';
  tabBar    = document.getElementById('code-tabs');
  inoContainer = document.getElementById('code-view-ino');
  hContainer   = document.getElementById('code-edit-h');
  lineCount = document.getElementById('line-count');

  // CodeMirror: editor .ino (readonly, con búsqueda)
  inoView = new EditorView({
    doc: '',
    extensions: [
      cpp(),
      ...sharedExtensions,
      keymap.of([...defaultKeymap, ...searchKeymap]),
      highlightSelectionMatches(),
      search({ top: true }),
      EditorState.readOnly.of(true),
    ],
    parent: inoContainer,
  });

  // CodeMirror: editor .h/.html (editable, oculto al inicio)
  hView = new EditorView({
    doc: '',
    extensions: _editableExtensions(cpp()),
    parent: hContainer,
  });

  // Aplicar tema inicial según la paleta activa (Calcite = claro)
  let isDark = true;
  try {
    const p = document.documentElement.getAttribute('data-theme') || 'calcite';
    isDark = p !== 'calcite';
  } catch (_) { /* default dark */ }
  if (!isDark) setCodeTheme(false);

  _bindEvents();
  _showActiveTab();
}

// ── Eventos ──────────────────────────────────────

function _bindEvents() {
  const addBtn = document.getElementById('btn-add-tab');
  if (addBtn) addBtn.addEventListener('click', () => _addTab());

  const findBtn = document.getElementById('btn-find');
  if (findBtn) findBtn.addEventListener('click', () => {
    const tab = tabs.find(t => t.filename === activeFilename);
    const view = (tab && !tab.readonly) ? hView : inoView;
    openSearchPanel(view);
  });

  // Delegación de clicks en la barra de tabs
  tabBar.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.code-tab');
    if (!tabBtn) return;

    if (e.target.closest('.tab-close')) {
      e.stopPropagation();
      _closeTab(tabBtn.dataset.tab);
      return;
    }

    _switchTab(tabBtn.dataset.tab);
  });
}

// ── Acciones de tabs ─────────────────────────────

let _newFileDialog, _newFileName, _newFileType;

function _langFor(filename) {
  if (/\.html?$/i.test(filename)) return html();
  return cpp();
}

function _initNewFileDialog() {
  _newFileDialog = document.getElementById('new-file-dialog');
  _newFileName  = document.getElementById('new-file-name');
  _newFileType  = document.getElementById('new-file-type');
  const ok = document.getElementById('new-file-ok');
  const cancel = document.getElementById('new-file-cancel');
  if (ok) ok.addEventListener('click', _confirmAddTab);
  if (cancel) cancel.addEventListener('click', () => { _newFileDialog.style.display = 'none'; });
  if (_newFileDialog) _newFileDialog.addEventListener('click', (e) => {
    if (e.target === _newFileDialog) _newFileDialog.style.display = 'none';
  });
}

function _addTab() {
  if (!_newFileDialog) _initNewFileDialog();
  _newFileName.value = '';
  _newFileType.value = '.h';
  _newFileDialog.style.display = 'flex';
  _newFileName.focus();
}

function _confirmAddTab() {
  let name = _newFileName.value.trim();
  const type = _newFileType.value || '.h';
  name = name.replace(/\.[^.]+$/, '');   // quitar extensión si la escribió
  if (!name) { alert('Escriba un nombre para el archivo.'); return; }
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    alert('Nombre inválido. Use solo letras, números, guiones y underscore.');
    return;
  }
  const filename = name + type;
  if (tabs.find(t => t.filename === filename)) {
    alert(`Ya existe un archivo "${filename}".`);
    return;
  }
  _newFileDialog.style.display = 'none';
  tabs.push(_newTab(filename, ''));
  _renderTabs();
  _switchTab(filename);
}

function _closeTab(filename) {
  const idx = tabs.findIndex(t => t.filename === filename);
  if (idx === -1) return;
  if (tabs[idx].readonly) return;

  if (tabs[idx].content.trim()) {
    if (!confirm(`¿Eliminar "${filename}"? Su contenido se perderá.`)) return;
  }

  if (activeFilename === filename) {
    _switchTab(tabs[0].filename);
  }

  tabs.splice(idx, 1);
  _renderTabs();
}

// ── Cambio de tab (memoria de posición) ──────────

/**
 * Crea un objeto tab editable con los campos de memoria de posición.
 */
function _newTab(filename, content, cursor = null) {
  return {
    filename,
    content: content || '',
    readonly: false,
    state: null,                       // EditorState por archivo (lazy)
    scroll: { top: 0, left: 0 },       // scroll de sesión
    cursor,                            // cursor persistido {line, ch} o null
  };
}

/**
 * Crea el EditorState del tab si aún no existe.
 */
function _ensureState(tab) {
  if (tab.state) return;
  tab.state = EditorState.create({
    doc: tab.content || '',
    extensions: _editableExtensions(_langFor(tab.filename)),
  });
}

/**
 * Guarda la posición (contenido + state + scroll, o posición del .ino) del
 * tab que está saliendo.
 */
function _rememberCurrent() {
  const tab = tabs.find(t => t.filename === activeFilename);
  if (!tab) return;
  if (tab.readonly) {
    _inoPos = {
      head: inoView.state.selection.main.head,
      top: inoView.scrollDOM.scrollTop,
      left: inoView.scrollDOM.scrollLeft,
    };
  } else {
    tab.content = hView.state.doc.toString();
    tab.state = hView.state;
    tab.scroll = { top: hView.scrollDOM.scrollTop, left: hView.scrollDOM.scrollLeft };
  }
}

/**
 * Aplica el cursor persistido (una sola vez) al entrar a un tab cargado de
 * proyecto.
 */
function _applyCursor(tab) {
  if (!tab.cursor) return;
  const { line, ch } = tab.cursor;
  const doc = hView.state.doc;
  const ln = doc.line(Math.min(Math.max(line, 1), doc.lines));
  const pos = ln.from + Math.min(Math.max(ch, 0), ln.length);
  hView.dispatch({ selection: { anchor: pos, head: pos } });
  tab.cursor = null;   // ya aplicado: la próxima vez manda el state
}

/**
 * Restaura la posición del .ino (sesión) tras regenerar el código.
 */
function _restoreInoPos() {
  if (!_inoPos || !inoView) return;
  const len = inoView.state.doc.length;
  const head = Math.min(_inoPos.head, len);
  inoView.dispatch({ selection: { anchor: head, head } });
  const { top, left } = _inoPos;
  requestAnimationFrame(() => {
    inoView.scrollDOM.scrollTop = top;
    inoView.scrollDOM.scrollLeft = left;
  });
  _inoPos = null;
}

/**
 * Muestra el tab indicado en el editor (sin tocar activeFilename).
 */
function _activateTab(tab) {
  // Cerrar búsqueda para no arrastrar resultados de otro archivo.
  if (inoView) closeSearchPanel(inoView);
  if (hView) closeSearchPanel(hView);

  if (tab.readonly) {
    inoContainer.style.display = '';
    hContainer.style.display = 'none';
    if (typeof window.updateCode === 'function') window.updateCode();
    _restoreInoPos();
  } else {
    _ensureState(tab);
    inoContainer.style.display = 'none';
    hContainer.style.display = '';
    hView.setState(tab.state);
    _applyCursor(tab);
    hView.focus();
    const { top, left } = tab.scroll || { top: 0, left: 0 };
    requestAnimationFrame(() => {
      hView.scrollDOM.scrollTop = top;
      hView.scrollDOM.scrollLeft = left;
    });
    _updateLineCount();
  }
}

function _switchTab(filename) {
  if (activeFilename === filename) return;

  // Guardar posición del tab actual antes de salir
  _rememberCurrent();

  activeFilename = filename;
  const tab = tabs.find(t => t.filename === filename);
  if (!tab) return;

  _activateTab(tab);
  collaborationClient?.stop();
  collaborationClient = collaborationClients.get(filename) || null;
  collaborationClient?.connect();
  _renderTabs();
}

// ── Sincronización ───────────────────────────────

function _syncContent() {
  const tab = tabs.find(t => t.filename === activeFilename);
  if (!tab || tab.readonly) return;
  tab.content = hView.state.doc.toString();
  tab.state = hView.state;
  _updateLineCount();
}

// ── Renderizado de la barra de tabs ──────────────

function _renderTabs() {
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
      const dot = hasContent ? ' <span style="color:#27ae60;font-size:10px">●</span>' : '';
      btn.innerHTML = `${icon} ${tab.filename}${dot} <span class="tab-close">&times;</span>`;
    }

    tabBar.insertBefore(btn, addBtn);
  }
}

// ── API pública ──────────────────────────────────

/**
 * Devuelve los tabs editables con su contenido y cursor (para guardar).
 */
export function getTabs() {
  _syncContent();
  return tabs
    .filter(t => !t.readonly)
    .map(t => ({
      filename: t.filename,
      content: t.content,
      cursor: _cursorOf(t),
    }));
}

export function setTextCollaborationClient(client) {
  collaborationClient?.stop();
  collaborationClient = client;
  collaborationClient?.connect();
}

export function configureTextCollaboration(projectId, files) {
  collaborationClients.forEach(client => client.stop());
  collaborationClients = new Map();
  collaborationFiles = new Map((files || []).map(file => [file.filename, file]));
  const clientId = localStorage.getItem('ardublock:client-id') ||
    `tab-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
  localStorage.setItem('ardublock:client-id', clientId);
  for (const file of files || []) {
    const client = new TextCollaborationClient({
      projectId,
      fileId: file.id,
      clientId,
      applyRemote: (changes) => {
        if (activeFilename === file.filename) applyRemoteTextChanges(changes);
      },
      onPresence: (message) => window.dispatchEvent(new CustomEvent('ardublock:presence', { detail: message })),
    });
    client.revision = file.revision || 1;
    collaborationClients.set(file.filename, client);
  }
  collaborationClient = collaborationClients.get(activeFilename) || null;
  collaborationClient?.connect();
}

export function applyRemoteTextChanges(changes) {
  if (!hView || !changes?.length) return;
  if (collaborationClient) collaborationClient.suppressLocal = true;
  try {
    hView.dispatch({ changes });
  } finally {
    if (collaborationClient) collaborationClient.suppressLocal = false;
  }
}

/**
 * Cursor del tab como {line, ch}, o undefined si no hay posición conocida.
 */
function _cursorOf(tab) {
  if (tab.state) {
    const head = tab.state.selection.main.head;
    const line = tab.state.doc.lineAt(head);
    return { line: line.number, ch: head - line.from };
  }
  return tab.cursor || undefined;
}

/**
 * Carga tabs desde datos de proyecto.
 */
export function loadTabs(tabData, sketchName = null) {
  const name = sketchName || (tabs && tabs.length > 0 && tabs[0].filename || 'sketch.ino');

  if (!Array.isArray(tabData) || !tabData.length) {
    tabs = [{ filename: name, content: '', readonly: true }];
    activeFilename = name;
    _renderTabs();
    _showActiveTab();
    return;
  }

  tabs = [
    { filename: name, content: '', readonly: true },
    ...tabData.map(t => _newTab(t.filename, t.content, t.cursor || null))
  ];

  activeFilename = name;
  _renderTabs();
  _showActiveTab();
}

/**
 * Crea un tab .html editable con contenido (usado para clonar presets web).
 * Deduplica el nombre si ya existe (index.html → index-2.html).
 * Devuelve el nombre final del tab creado.
 */
export function createHtmlTab(filename, content) {
  let name = String(filename || 'index.html').trim();
  if (!/\.[^.]+$/.test(name)) name = name + '.html';
  if (!/\.html?$/i.test(name)) name = name + '.html';

  const base = name.replace(/\.[^.]+$/, '');
  const ext = name.slice(name.lastIndexOf('.'));
  let candidate = name;
  let n = 2;
  while (tabs.some(t => t.filename === candidate)) {
    candidate = base + '-' + n + ext;
    n++;
  }

  tabs.push(_newTab(candidate, content));
  _renderTabs();
  _switchTab(candidate);
  return candidate;
}

/**
 * Abre un tab existente (por nombre) en el editor CodeMirror.
 * Devuelve true si el tab existe y se abrió.
 */
export function openTab(filename) {
  if (!tabs.some(t => t.filename === filename)) return false;
  _switchTab(filename);
  return true;
}

/**
 * Actualiza el nombre del tab del sketch sin recargar tabs .h.
 */
export function setSketchName(name) {
  if (!tabs || !tabs.length) return;
  const oldName = tabs[0].filename;
  tabs[0].filename = name;
  // Actualizar activeFilename si apuntaba al tab del sketch
  if (activeFilename === oldName || activeFilename === 'sketch.ino') {
    activeFilename = name;
  }
  _renderTabs();
  _showActiveTab();
}

/**
 * Actualiza el contenido del editor .ino (generado por bloques).
 * Llamado desde main.js updateCode().
 */
export function setInoContent(code) {
  if (!inoView) return;
  inoView.dispatch({
    changes: {
      from: 0,
      to: inoView.state.doc.length,
      insert: code
    }
  });
  _updateInoLineCount(code);
}

/**
 * Devuelve el contenido actual del editor .ino.
 */
export function getInoContent() {
  return inoView ? inoView.state.doc.toString() : '';
}

/**
 * Cambia el tema de CodeMirror (llamado desde settings.js).
 * @param {boolean} isDark — true para tema oscuro, false para claro
 */
export function setCodeTheme(isDark) {
  const theme = isDark ? [...oneDark] : lightTheme;
  if (inoView) inoView.dispatch({ effects: themeCompartment.reconfigure(theme) });

  // Actualizar el tema en cada estado por archivo (preserva doc/selección/undo).
  for (const tab of tabs) {
    if (!tab.readonly && tab.state) {
      tab.state = tab.state.update({ effects: themeCompartment.reconfigure(theme) }).state;
    }
  }
  // Si el tab activo es editable, reflejar el nuevo estado en la vista.
  const tab = tabs.find(t => t.filename === activeFilename);
  if (tab && !tab.readonly && tab.state && hView) {
    hView.setState(tab.state);
  }
}

// ── Helpers internos ─────────────────────────────

function _showActiveTab() {
  const tab = tabs.find(t => t.filename === activeFilename);
  // Si no encuentra el tab, mostrar el .ino por defecto
  if (!tab) {
    inoContainer.style.display = '';
    hContainer.style.display = 'none';
    if (typeof window.updateCode === 'function') window.updateCode();
    return;
  }
  _activateTab(tab);
}

function _updateLineCount() {
  if (!lineCount) return;
  if (activeFilename === tabs[0].filename) return; // .ino: main.js se encarga

  const doc = hView.state.doc;
  const lines = doc.lines;
  const labelEl = lineCount.querySelector('span');
  const label = labelEl ? labelEl.textContent : 'líneas';
  lineCount.childNodes[0].textContent = lines + ' ';
}

function _updateInoLineCount(code) {
  if (!lineCount) return;
  const lines = code ? code.split('\n').length : 0;
  const labelEl = lineCount.querySelector('span');
  const label = labelEl ? labelEl.textContent : 'líneas';
  lineCount.childNodes[0].textContent = lines + ' ';
}
