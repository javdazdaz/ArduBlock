/**
 * ArduBlock — Gestión de Tabs de Código (CodeMirror 6)
 *
 * Maneja la barra de tabs: sketch.ino (readonly, fijo) + .h (editables).
 * Usa CodeMirror 6 para syntax highlighting (C++) y números de línea.
 * Sincroniza contenido entre editor y estado interno, expone getTabs()
 * para el generador, upload y project-manager.
 */

import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';

let tabs, activeFilename, tabBar, lineCount;
let inoView, hView;           // CodeMirror EditorView instances
let inoContainer, hContainer;  // DOM parents

// ═══ Tema dinámico (light/dark) ══════════════════

const themeCompartment = new Compartment();

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
  cpp(),
  themeCompartment.of([...oneDark]),  // default: dark
  lineNumbers(),
  highlightActiveLineGutter(),
];

const editableExtensions = [
  ...sharedExtensions,
  history(),
  keymap.of([...defaultKeymap, ...historyKeymap]),
  highlightActiveLine(),
  EditorView.updateListener.of((update) => {
    if (update.docChanged) _syncContent();
  }),
];

// ═══ Inicialización ══════════════════════════════

export function initTabManager(deps = {}) {
  tabs = [
    { filename: 'sketch.ino', content: '', readonly: true }
  ];
  activeFilename = 'sketch.ino';
  tabBar    = document.getElementById('code-tabs');
  inoContainer = document.getElementById('code-view-ino');
  hContainer   = document.getElementById('code-edit-h');
  lineCount = document.getElementById('line-count');

  // CodeMirror: editor .ino (readonly)
  inoView = new EditorView({
    doc: '',
    extensions: [
      ...sharedExtensions,
      EditorState.readOnly.of(true),
    ],
    parent: inoContainer,
  });

  // CodeMirror: editor .h (editable, oculto al inicio)
  hView = new EditorView({
    doc: '',
    extensions: editableExtensions,
    parent: hContainer,
  });

  // Aplicar tema inicial según settings (dark por defecto)
  let isDark = true;
  try {
    const raw = localStorage.getItem('ardublock:settings');
    if (raw) isDark = JSON.parse(raw).theme !== 'light';
  } catch (_) { /* default dark */ }
  if (!isDark) setCodeTheme(false);

  _bindEvents();
  _showActiveTab();
}

// ── Eventos ──────────────────────────────────────

function _bindEvents() {
  const addBtn = document.getElementById('btn-add-tab');
  if (addBtn) addBtn.addEventListener('click', () => _addTab());

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

function _addTab() {
  const name = prompt('Nombre del archivo (ej: config.h):');
  if (!name || !name.trim()) return;

  let filename = name.trim();
  if (!filename.endsWith('.h') && !filename.endsWith('.hpp')) {
    filename += '.h';
  }

  if (!/^[a-zA-Z0-9_-]+\.(h|hpp)$/.test(filename)) {
    alert('Nombre inválido. Usá solo letras, números, guiones y underscore (ej: config.h).');
    return;
  }

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

function _switchTab(filename) {
  if (activeFilename === filename) return;

  // Guardar contenido del tab actual antes de salir
  _syncContent();

  activeFilename = filename;
  const tab = tabs.find(t => t.filename === filename);
  if (!tab) return;

  if (tab.readonly) {
    inoContainer.style.display = '';
    hContainer.style.display = 'none';
    if (typeof window.updateCode === 'function') window.updateCode();
  } else {
    inoContainer.style.display = 'none';
    hContainer.style.display = '';
    // Actualizar contenido del editor .h
    hView.dispatch({
      changes: {
        from: 0,
        to: hView.state.doc.length,
        insert: tab.content
      }
    });
    hView.focus();
    _updateLineCount();
  }

  _renderTabs();
}

// ── Sincronización ───────────────────────────────

function _syncContent() {
  const tab = tabs.find(t => t.filename === activeFilename);
  if (tab && tab.readonly) return;
  if (tab && !tab.readonly) {
    tab.content = hView.state.doc.toString();
    _updateLineCount();
  }
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
 * Devuelve los tabs .h con su contenido para guardar/cargar.
 */
export function getTabs() {
  _syncContent();
  return tabs
    .filter(t => !t.readonly)
    .map(t => ({ filename: t.filename, content: t.content }));
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
    ...tabData.map(t => ({
      filename: t.filename,
      content: t.content || '',
      readonly: false
    }))
  ];

  activeFilename = name;
  _renderTabs();
  _showActiveTab();
}

/**
 * Actualiza el nombre del tab del sketch sin recargar tabs .h.
 */
export function setSketchName(name) {
  if (!tabs || !tabs.length) return;
  tabs[0].filename = name;
  if (activeFilename === tabs[0].filename || activeFilename === 'sketch.ino') {
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
  if (hView)   hView.dispatch({ effects: themeCompartment.reconfigure(theme) });
}

// ── Helpers internos ─────────────────────────────

function _showActiveTab() {
  const tab = tabs.find(t => t.filename === activeFilename);
  if (tab && tab.readonly) {
    inoContainer.style.display = '';
    hContainer.style.display = 'none';
    if (typeof window.updateCode === 'function') window.updateCode();
  } else {
    inoContainer.style.display = 'none';
    hContainer.style.display = '';
    if (tab) {
      hView.dispatch({
        changes: {
          from: 0,
          to: hView.state.doc.length,
          insert: tab.content
        }
      });
    }
    hView.focus();
    _updateLineCount();
  }
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
