/**
 * ArduBlock — Sistema de Ejemplos de Arduino.
 * Carga ejemplos convertidos a bloques (Tier 1) y explora
 * sketches originales + no convertibles via API (Tier 2).
 */

import { basicsExamples }   from './examples-data.js';
import { digitalSimple }    from './examples-digital-simple.js';
import { analogControlExamples } from './examples-analog-control.js';
import { analog2 }          from './examples-analog2.js';
import { analog3 }          from './examples-analog3.js';
import { communicationExamples } from './examples-communication.js';
import { controlExamples }  from './examples-control.js';
import { remainingExamples } from './examples-remaining.js';
import { missingExamples }   from './examples-missing.js';
import { escapeHtml }       from './project-manager.js';
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

// Solo los convertidos (con state, no reason)
const convertibleExamples = allExamples.filter(e => !e.reason || e.reason !== 'NOT_CONVERTIBLE');

// Los no convertibles (con reason)
const notConvertibleExamples = allExamples.filter(e => e.reason === 'NOT_CONVERTIBLE');

let workspace, examplesModal, examplesList, showToast, updateCodeFn, projectInput;

export function initExamples(deps) {
  workspace     = deps.workspace;
  examplesModal = deps.examplesModal;
  examplesList  = deps.examplesList;
  showToast     = deps.showToast;
  updateCodeFn  = deps.updateCode;
  projectInput  = deps.projectInput;

  document.getElementById('btn-examples').addEventListener('click', openExamples);
  document.getElementById('examples-close').addEventListener('click', closeExamples);
  examplesModal.addEventListener('click', (e) => { if (e.target === examplesModal) closeExamples(); });
}

async function openExamples() {
  examplesModal.classList.remove('hidden');

  // Agrupar convertidos por categoría
  const cats = {};
  for (const ex of convertibleExamples) {
    const cat = ex.category || 'Sin categoría';
    if (!cats[cat]) cats[cat] = [];
    cats[cat].push(ex);
  }

  // Ordenar categorías
  const sortedCats = Object.keys(cats).sort();

  let html = '';
  for (const cat of sortedCats) {
    html += `<div class="example-category">${cat}</div>`;
    for (const ex of cats[cat]) {
      html += `<div class="example-item" data-name="${ex.name.replace(/"/g, '&quot;')}">
        <span>${escapeHtml(ex.name)}</span>
        <span class="example-desc">${escapeHtml(ex.description || '')}</span>
      </div>`;
    }
  }

  // No convertibles (solo referencia, no cargables)
  if (notConvertibleExamples.length > 0) {
    const notByCat = {};
    for (const ex of notConvertibleExamples) {
      const cat = ex.category || 'Sin categoría';
      if (!notByCat[cat]) notByCat[cat] = [];
      notByCat[cat].push(ex);
    }
    html += `<div class="example-category" style="opacity:0.6">No disponibles como bloques</div>`;
    for (const [cat, items] of Object.entries(notByCat).sort()) {
      html += `<div class="example-category-sub">${cat} (${items.length})</div>`;
      for (const ex of items) {
        const hasTabs = ex.tabs && ex.tabs.length > 0;
        const cls = hasTabs ? 'example-item' : 'example-item example-item-disabled';
        const title = escapeHtml(ex.note || 'No convertible');
        html += `<div class="${cls}" data-name="${ex.name.replace(/"/g, '&quot;')}" title="${title}">
          <span>${escapeHtml(ex.name)}${hasTabs ? ' 📎' : ''}</span>
          <span class="example-desc" style="font-size:0.7rem;opacity:0.6">${title}</span>
        </div>`;
      }
    }
  }

  html += `<div class="example-category">Más ejemplos (código)</div>
    <div class="example-item" data-name="__browse__">
      <span>📂 Explorar todos los sketches...</span>
      <span class="example-desc">81 sketches originales de Arduino</span>
    </div>`;

  examplesList.innerHTML = html;

  examplesList.querySelectorAll('.example-item:not(.example-item-disabled)').forEach(el => {
    el.addEventListener('click', () => {
      const name = el.dataset.name;
      if (name === '__browse__') loadBrowseExamples();
      else {
        // Puede ser convertible o NOT_CONVERTIBLE con tabs
        const ex = allExamples.find(e => e.name === name);
        if (ex && ex.state) {
          loadPresetExample(name);
        } else if (ex && ex.tabs && ex.tabs.length > 0) {
          // NOT_CONVERTIBLE con tabs: solo cargar tabs, no tocar workspace
          if (window._tabManager) window._tabManager.loadTabs(ex.tabs);
          showToast(`Archivos de "${ex.name}" cargados como tabs`);
          closeExamples();
        }
      }
    });
  });
}

function loadPresetExample(name) {
  const ex = convertibleExamples.find(e => e.name === name);
  if (!ex) return;

  workspace.clear();
  Blockly.serialization.workspaces.load(ex.state, workspace);

  // Elegir idioma del comentario según settings
  let lang = 'es';
  try {
    const raw = localStorage.getItem('ardublock:settings');
    if (raw) lang = JSON.parse(raw).language || 'es';
  } catch (_) { /* default es */ }
  const comment = (typeof ex.comment === 'object') ? (ex.comment[lang] || ex.comment.en || '') : (ex.comment || '');

  window._exampleComment = comment;
  updateCodeFn();
  projectInput.value = '';
  if (window._tabManager) window._tabManager.loadTabs(ex.tabs || []);
  closeExamples();
  showToast(`Ejemplo "${ex.name}" cargado`);
}

async function loadBrowseExamples() {
  examplesList.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-dim)">Cargando ejemplos...</div>';
  try {
    const res = await fetch('/api/examples');
    const examples = await res.json();

    const cats = {};
    for (const ex of examples) {
      const cat = ex.path.split('/')[0].replace(/^\d+\./, '');
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(ex);
    }

    let html = `<div class="example-category" style="cursor:pointer" id="back-to-presets">← Volver a ejemplos con bloques</div>`;
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

    document.getElementById('back-to-presets').addEventListener('click', openExamples);
    examplesList.querySelectorAll('.example-item').forEach(el => {
      el.addEventListener('click', () => loadBrowseExample(el.dataset.path));
    });
  } catch (e) {
    examplesList.innerHTML = '<div style="padding:2rem;text-align:center;color:#e94560">Error</div>';
  }
}

async function loadBrowseExample(path) {
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
      <button class="btn-copy-example" style="margin-top:0.5rem;padding:0.3rem 0.8rem;background:var(--accent);color:#fff;border:none;border-radius:4px;cursor:pointer;font-family:inherit;font-size:0.75rem">📋 Copiar a portapapeles</button>`;
    codePanel.querySelector('.btn-copy-example').addEventListener('click', () => {
      navigator.clipboard.writeText(data.content).then(() => showToast('Código copiado'));
    });
    codePanel.scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    showToast('Error al cargar ejemplo');
  }
}

export function closeExamples() {
  examplesModal.classList.add('hidden');
}
