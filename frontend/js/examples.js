/**
 * ArduBlock — Sistema de Ejemplos de Arduino.
 *
 * Navegación en 2 niveles:
 *   Nivel 1: Selector de fuente (Arduino Examples, futuras fuentes...)
 *   Nivel 2: Categorías + ejemplos convertidos + no convertibles + explorar .ino
 */

import { sources }          from './examples-sources.js';
import { basicsExamples }   from './examples-data.js';
import { digitalSimple }    from './examples-digital-simple.js';
import { analogControlExamples } from './examples-analog-control.js';
import { analog2 }          from './examples-analog2.js';
import { analog3 }          from './examples-analog3.js';
import { communicationExamples } from './examples-communication.js';
import { controlExamples }  from './examples-control.js';
import { remainingExamples } from './examples-remaining.js';
import { missingExamples }   from './examples-missing.js';
import { escapeHtml, cancelAutoSave } from './project-manager.js';
import * as Blockly from 'blockly';

// ── Consolidar todos los ejemplos ─────────────────
const allExamples = [
  ...basicsExamples,
  ...digitalSimple,
  ...analogControlExamples,
  ...analog2,
  ...analog3,
  ...communicationExamples,
  ...controlExamples,
  ...remainingExamples,
  ...missingExamples,
];

let workspace, examplesModal, examplesList, showToast, updateCodeFn, projectInput;

export function initExamples(deps) {
  workspace     = deps.workspace;
  examplesModal = deps.examplesModal;
  examplesList  = deps.examplesList;
  showToast     = deps.showToast;
  updateCodeFn  = deps.updateCode;
  projectInput  = deps.projectInput;

  document.getElementById('btn-examples').addEventListener('click', openSourceSelector);
  document.getElementById('examples-close').addEventListener('click', closeExamples);
  examplesModal.addEventListener('click', (e) => { if (e.target === examplesModal) closeExamples(); });
}

// ── Helpers de idioma ────────────────────────────

function getLang() {
  try {
    const raw = localStorage.getItem('ardublock:settings');
    if (raw) return JSON.parse(raw).language || 'es';
  } catch (_) { /* default */ }
  return 'es';
}

function i18n(obj, lang) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.en || Object.values(obj)[0] || '';
}

// ═══════════════════════════════════════════════════
//  NIVEL 1: Selector de fuente
// ═══════════════════════════════════════════════════

function openSourceSelector() {
  examplesModal.classList.remove('hidden');
  const lang = getLang();

  let html = `<div class="example-category">${lang === 'es' ? '📚 Fuente de ejemplos' : '📚 Example source'}</div>`;

  for (const src of sources) {
    html += `<div class="example-item example-source-item" data-source="${src.id}">
      <span>${i18n(src.label, lang)}</span>
      <span class="example-desc">${i18n(src.description, lang)}</span>
    </div>`;
  }

  // También ofrecer explorar sketches .ino directamente
  html += `<div class="example-category" style="margin-top:1rem">${lang === 'es' ? '📂 Directo' : '📂 Direct'}</div>
    <div class="example-item" data-source="__browse__">
      <span>📂 ${lang === 'es' ? 'Explorar todos los sketches...' : 'Browse all sketches...'}</span>
      <span class="example-desc">${lang === 'es' ? '81 sketches originales de Arduino' : '81 original Arduino sketches'}</span>
    </div>`;

  examplesList.innerHTML = html;

  examplesList.querySelectorAll('.example-item').forEach(el => {
    el.addEventListener('click', () => {
      const srcId = el.dataset.source;
      if (srcId === '__browse__') {
        loadBrowseExamples();
      } else {
        openSource(srcId);
      }
    });
  });
}

// ═══════════════════════════════════════════════════
//  NIVEL 2: Categorías de una fuente
// ═══════════════════════════════════════════════════

function openSource(sourceId) {
  const lang = getLang();
  const source = sources.find(s => s.id === sourceId);

  // Filtrar ejemplos por source
  const sourceExamples = allExamples.filter(e => e.source === sourceId);

  // Convertidos (con state, sin reason NOT_CONVERTIBLE)
  const convertible = sourceExamples.filter(e => !e.reason || e.reason !== 'NOT_CONVERTIBLE');

  // No convertibles
  const notConvertible = sourceExamples.filter(e => e.reason === 'NOT_CONVERTIBLE');

  let html = `<div class="example-category" style="cursor:pointer" id="back-to-sources">← ${lang === 'es' ? 'Volver a fuentes' : 'Back to sources'}</div>`;

  if (source) {
    html += `<div class="example-category">${i18n(source.label, lang)}</div>`;
  }

  // Agrupar convertidos por categoría
  const cats = {};
  for (const ex of convertible) {
    const cat = ex.category || (lang === 'es' ? 'Sin categoría' : 'Uncategorized');
    if (!cats[cat]) cats[cat] = [];
    cats[cat].push(ex);
  }

  const sortedCats = Object.keys(cats).sort();

  for (const cat of sortedCats) {
    // Mostrar nombre localizado de la categoría si existe en sources
    const catLabel = source?.categories?.find(c => c.id === cat);
    const catDisplay = catLabel ? i18n(catLabel.label, lang) : cat;
    html += `<div class="example-category">${catDisplay}</div>`;

    for (const ex of cats[cat]) {
      const desc = i18n(ex.description, lang);
      html += `<div class="example-item" data-name="${ex.name.replace(/"/g, '&quot;')}">
        <span>${escapeHtml(ex.name)}</span>
        <span class="example-desc">${escapeHtml(desc)}</span>
      </div>`;
    }
  }

  // No convertibles
  if (notConvertible.length > 0) {
    const notByCat = {};
    for (const ex of notConvertible) {
      const cat = ex.category || (lang === 'es' ? 'Sin categoría' : 'Uncategorized');
      if (!notByCat[cat]) notByCat[cat] = [];
      notByCat[cat].push(ex);
    }
    html += `<div class="example-category" style="opacity:0.6">${lang === 'es' ? 'No disponibles como bloques' : 'Not available as blocks'}</div>`;
    for (const [cat, items] of Object.entries(notByCat).sort()) {
      const catLabel = source?.categories?.find(c => c.id === cat);
      const catDisplay = catLabel ? i18n(catLabel.label, lang) : cat;
      html += `<div class="example-category-sub">${catDisplay} (${items.length})</div>`;
      for (const ex of items) {
        const hasTabs = ex.tabs && ex.tabs.length > 0;
        const cls = hasTabs ? 'example-item' : 'example-item example-item-disabled';
        const title = escapeHtml(ex.note || (lang === 'es' ? 'No convertible' : 'Not convertible'));
        html += `<div class="${cls}" data-name="${ex.name.replace(/"/g, '&quot;')}" title="${title}">
          <span>${escapeHtml(ex.name)}${hasTabs ? ' 📎' : ''}</span>
          <span class="example-desc" style="font-size:0.7rem;opacity:0.6">${title}</span>
        </div>`;
      }
    }
  }

  // Link para explorar sketches .ino
  html += `<div class="example-category">${lang === 'es' ? 'Más ejemplos (código)' : 'More examples (code)'}</div>
    <div class="example-item" data-name="__browse__">
      <span>📂 ${lang === 'es' ? 'Explorar todos los sketches...' : 'Browse all sketches...'}</span>
      <span class="example-desc">${lang === 'es' ? '81 sketches originales de Arduino' : '81 original Arduino sketches'}</span>
    </div>`;

  examplesList.innerHTML = html;

  // Back button
  document.getElementById('back-to-sources').addEventListener('click', openSourceSelector);

  // Click handlers
  examplesList.querySelectorAll('.example-item:not(.example-item-disabled)').forEach(el => {
    el.addEventListener('click', () => {
      const name = el.dataset.name;
      if (name === '__browse__') {
        loadBrowseExamples();
      } else {
        const ex = sourceExamples.find(e => e.name === name);
        if (ex && ex.state) {
          loadPresetExample(ex);
        } else if (ex && ex.tabs && ex.tabs.length > 0) {
          if (window._tabManager) window._tabManager.loadTabs(ex.tabs);
          showToast(`${lang === 'es' ? 'Archivos de' : 'Files from'} "${ex.name}" ${lang === 'es' ? 'cargados como tabs' : 'loaded as tabs'}`);
          closeExamples();
        }
      }
    });
  });
}

// ═══════════════════════════════════════════════════
//  Cargar ejemplo en el workspace
// ═══════════════════════════════════════════════════

function loadPresetExample(ex) {
  if (!ex || !ex.state) return;

  // Guardar estado actual en el árbol de undo antes de limpiar
  if (window._forceUndoPush) window._forceUndoPush();
  workspace.clear();
  Blockly.serialization.workspaces.load(ex.state, workspace);

  const lang = getLang();
  const comment = i18n(ex.comment, lang);

  window._exampleComment = comment;
  updateCodeFn();
  projectInput.value = ex.name + '.ino';
  if (window._tabManager) window._tabManager.loadTabs(ex.tabs || [], ex.name + '.ino');
  cancelAutoSave();
  closeExamples();
  showToast(`${lang === 'es' ? 'Ejemplo' : 'Example'} "${ex.name}" ${lang === 'es' ? 'cargado' : 'loaded'}`);
}

// ═══════════════════════════════════════════════════
//  Explorar sketches .ino via API
// ═══════════════════════════════════════════════════

async function loadBrowseExamples() {
  const lang = getLang();
  examplesList.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--text-dim)">${lang === 'es' ? 'Cargando ejemplos...' : 'Loading examples...'}</div>`;
  try {
    const res = await fetch('/api/examples');
    const examples = await res.json();

    const cats = {};
    for (const ex of examples) {
      const cat = ex.path.split('/')[0].replace(/^\d+\./, '');
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(ex);
    }

    let html = `<div class="example-category" style="cursor:pointer" id="back-to-presets">← ${lang === 'es' ? 'Volver a ejemplos con bloques' : 'Back to block examples'}</div>`;
    for (const [cat, items] of Object.entries(cats)) {
      html += `<div class="example-category">${cat}</div>`;
      for (const ex of items) {
        html += `<div class="example-item" data-path="${ex.path.replace(/"/g, '&quot;')}">
          <span>${escapeHtml(ex.name)}</span>
          <span class="example-desc">${escapeHtml(ex.description || '')}</span>
        </div>`;
      }
    }
    examplesList.innerHTML = html;

    document.getElementById('back-to-presets').addEventListener('click', openSourceSelector);
    examplesList.querySelectorAll('.example-item').forEach(el => {
      el.addEventListener('click', () => loadBrowseExample(el.dataset.path));
    });
  } catch (e) {
    examplesList.innerHTML = `<div style="padding:2rem;text-align:center;color:#e94560">${lang === 'es' ? 'Error' : 'Error'}</div>`;
  }
}

async function loadBrowseExample(path) {
  const lang = getLang();
  try {
    const res = await fetch('/api/examples/' + encodeURIComponent(path));
    const data = await res.json();
    if (data.error) { showToast(data.error); return; }

    let codePanel = examplesList.querySelector('.example-code-panel');
    if (!codePanel) {
      codePanel = document.createElement('div');
      codePanel.className = 'example-code-panel';
      examplesList.appendChild(codePanel);
    }
    codePanel.innerHTML = `<pre>${escapeHtml(data.content)}</pre>
      <button class="btn-copy-example" style="margin-top:0.5rem;padding:0.3rem 0.8rem;background:var(--accent);color:#fff;border:none;border-radius:4px;cursor:pointer;font-family:inherit;font-size:0.75rem">📋 ${lang === 'es' ? 'Copiar a portapapeles' : 'Copy to clipboard'}</button>`;
    codePanel.querySelector('.btn-copy-example').addEventListener('click', () => {
      navigator.clipboard.writeText(data.content).then(() => showToast(lang === 'es' ? 'Código copiado' : 'Code copied'));
    });
    codePanel.scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    showToast(lang === 'es' ? 'Error al cargar ejemplo' : 'Error loading example');
  }
}

// ═══════════════════════════════════════════════════

export function closeExamples() {
  examplesModal.classList.add('hidden');
}
