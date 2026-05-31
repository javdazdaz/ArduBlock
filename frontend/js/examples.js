/**
 * ArduBlock — Sistema de Ejemplos de Arduino.
 */

import { basicsExamples } from './examples-data.js';
import { escapeHtml } from './project-manager.js';

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

  const cats = {};
  for (const ex of basicsExamples) {
    if (!cats[ex.category]) cats[ex.category] = [];
    cats[ex.category].push(ex);
  }

  let html = '';
  for (const [cat, items] of Object.entries(cats)) {
    html += `<div class="example-category">${cat}</div>`;
    for (const ex of items) {
      html += `<div class="example-item" data-name="${ex.name.replace(/"/g, '&quot;')}">
        <span>${escapeHtml(ex.name)}</span>
        <span class="example-desc">${escapeHtml(ex.description || '')}</span>
      </div>`;
    }
  }

  html += `<div class="example-category">Más ejemplos (código)</div>
    <div class="example-item" data-name="__browse__">
      <span>📂 Explorar todos los ejemplos...</span>
      <span class="example-desc">81 sketches de Arduino</span>
    </div>`;

  examplesList.innerHTML = html;

  examplesList.querySelectorAll('.example-item').forEach(el => {
    el.addEventListener('click', () => {
      if (el.dataset.name === '__browse__') loadBrowseExamples();
      else loadPresetExample(el.dataset.name);
    });
  });
}

function loadPresetExample(name) {
  const ex = basicsExamples.find(e => e.name === name);
  if (!ex) return;

  workspace.clear();
  const Blockly = globalThis.Blockly;
  Blockly.serialization.workspaces.load(ex.state, workspace);
  window._exampleComment = ex.comment;
  updateCodeFn();
  projectInput.value = '';
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
