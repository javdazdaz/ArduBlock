/**
 * ArduBlock — Panel de sitios web (presets single-file HTML).
 *
 * Permite:
 *   - Seleccionar presets de sitios web (servidos por /api/web-presets).
 *   - Ver los sitios .html del proyecto (tabs).
 *   - Analizar el HTML: vista previa (iframe), código fuente y análisis
 *     (tamaño vs presupuesto del R4 WiFi + recursos que no cargan offline).
 *   - Clonar un preset a un tab .html editable (y editar los del proyecto).
 */

import * as Blockly from 'blockly';
import { getTabs, createHtmlTab, openTab } from './tab-manager.js';
import { webPresetProjects, hasWebPresetProject } from './web-preset-projects.js';

const BUDGET_KB = 180; // HTML aprox. para R4 WiFi (256 KB flash − sketch base ~61 KB)

let showToast = () => {};
let workspace;
let presets = [];
let presetsLoaded = false;
let current = null; // { kind: 'preset'|'tab', key, name, content }

let presetList, projectList, iframe, codePre, analyzeBody, btnEdit, btnReload;
let emptyState, webTabs, previewView, codeView, analyzeView;
let activeSubTab = 'preview';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function initWebPresets(deps = {}) {
  showToast = deps.showToast || showToast;
  workspace = deps.workspace;

  presetList  = document.getElementById('web-preset-list');
  projectList = document.getElementById('web-project-list');
  iframe      = document.getElementById('web-iframe');
  codePre     = document.getElementById('web-code-pre');
  analyzeBody = document.getElementById('web-analyze-body');
  btnEdit     = document.getElementById('web-btn-edit');
  btnReload   = document.getElementById('web-btn-reload');

  emptyState  = document.getElementById('web-empty-state');
  webTabs     = document.getElementById('web-tabs');
  previewView = document.getElementById('web-preview');
  codeView    = document.getElementById('web-code');
  analyzeView = document.getElementById('web-analyze');

  if (btnEdit)  btnEdit.addEventListener('click', editCurrent);
  if (btnReload) btnReload.addEventListener('click', reloadPreview);

  // Diálogo "clonar sitio": elegir solo HTML o proyecto completo.
  const cloneDialog = document.getElementById('web-clone-dialog');
  if (cloneDialog) {
    document.getElementById('web-clone-cancel').addEventListener('click', () => { cloneDialog.style.display = 'none'; });
    document.getElementById('web-clone-html').addEventListener('click', () => { cloneDialog.style.display = 'none'; cloneHtmlOnly(); });
    document.getElementById('web-clone-full').addEventListener('click', () => { cloneDialog.style.display = 'none'; cloneFullProject(); });
    cloneDialog.addEventListener('click', (e) => { if (e.target === cloneDialog) cloneDialog.style.display = 'none'; });
  }

  // Al (re)cargar el srcdoc, enfocar el iframe para que los juegos
  // reciban el teclado (Snake/Pong usan addEventListener('keydown')).
  if (iframe) {
    iframe.addEventListener('load', () => {
      try {
        iframe.focus();
        if (iframe.contentWindow) iframe.contentWindow.focus();
      } catch (_) { /* ignore */ }
    });
  }

  document.getElementById('web-tab-preview').addEventListener('click', () => setSubTab('preview'));
  document.getElementById('web-tab-code').addEventListener('click', () => setSubTab('code'));
  document.getElementById('web-tab-analyze').addEventListener('click', () => setSubTab('analyze'));

  window._refreshWebPanel = refreshProjectList;
  refreshProjectList();
  updateViewVisibility();
  loadPresets();
}

// ── Carga de presets ──────────────────────────

async function loadPresets() {
  if (presetsLoaded) return;
  try {
    const res = await fetch('/api/web-presets');
    presets = await res.json();
  } catch (_) {
    presets = [];
  }
  presetsLoaded = true;
  renderPresets();
}

function renderPresets() {
  if (!presetList) return;
  if (!presets.length) {
    presetList.innerHTML = '<div class="web-empty">No hay presets disponibles.</div>';
    return;
  }
  const cats = {};
  for (const p of presets) (cats[p.category] = cats[p.category] || []).push(p);

  let html = '';
  for (const [cat, items] of Object.entries(cats)) {
    html += `<div class="web-sidebar-sub">${esc(cat)}</div>`;
    for (const p of items) {
      html += `<div class="web-item" data-preset="${esc(p.path)}">
        <span class="web-item-name">📦 ${esc(p.name)}</span>
        <span class="web-item-desc">${esc(p.description || '')}</span>
      </div>`;
    }
  }
  presetList.innerHTML = html;
  presetList.querySelectorAll('.web-item[data-preset]').forEach(el => {
    el.addEventListener('click', () => selectPreset(el.dataset.preset));
  });
}

function refreshProjectList() {
  if (!projectList) return;
  const tabs = getTabs() || [];
  const htmlTabs = tabs.filter(t => t.filename && /\.html?$/i.test(t.filename));

  if (!htmlTabs.length) {
    projectList.innerHTML = '<div class="web-empty">Sin sitios todavía. Clone un preset o cree un archivo .html.</div>';
    return;
  }
  let html = '';
  for (const t of htmlTabs) {
    const size = t.content ? (new TextEncoder().encode(t.content).length / 1024).toFixed(1) + ' KB' : 'vacío';
    html += `<div class="web-item" data-tab="${esc(t.filename)}">
      <span class="web-item-name">📝 ${esc(t.filename)}</span>
      <span class="web-item-desc">${size}</span>
    </div>`;
  }
  projectList.innerHTML = html;
  projectList.querySelectorAll('.web-item[data-tab]').forEach(el => {
    el.addEventListener('click', () => selectTab(el.dataset.tab));
  });
}

// ── Selección ─────────────────────────────────

async function selectPreset(path) {
  try {
    const res = await fetch('/api/web-presets/' + encodeURIComponent(path));
    const data = await res.json();
    if (data.error) { showToast(data.error); return; }
    setCurrent({ kind: 'preset', key: path, name: data.name || path, content: data.content || '' });
  } catch (_) {
    showToast('Error al cargar el preset');
  }
}

function selectTab(filename) {
  const tab = (getTabs() || []).find(t => t.filename === filename);
  if (!tab) return;
  setCurrent({ kind: 'tab', key: filename, name: filename, content: tab.content || '' });
}

function setCurrent(c) {
  current = c;
  if (btnEdit)  btnEdit.disabled = !c;
  if (btnReload) btnReload.disabled = !c;

  presetList.querySelectorAll('.web-item').forEach(el => el.classList.remove('selected'));
  projectList.querySelectorAll('.web-item').forEach(el => el.classList.remove('selected'));
  const list = c && c.kind === 'preset' ? presetList : projectList;
  if (c && list) {
    const sel = c.kind === 'preset'
      ? list.querySelector(`.web-item[data-preset="${CSS.escape(c.key)}"]`)
      : list.querySelector(`.web-item[data-tab="${CSS.escape(c.key)}"]`);
    if (sel) sel.classList.add('selected');
  }

  updateViewVisibility();
  if (c) showCurrent();
}

function showCurrent() {
  if (!current) return;
  reloadPreview();
  if (codePre) codePre.textContent = current.content;
  if (analyzeBody) analyzeBody.innerHTML = renderAnalysis(analyzeHtml(current.content));
}

// En la vista previa no hay Arduino: neutralizamos fetch/WebSocket en silencio
// para que las páginas con sondeo (tablero) no llenen la consola con CORS/CSP/404.
// El stub devuelve "—" y no toca la red (cero ruido en consola).
const PREVIEW_STUB = '<script>(function(){var r={text:function(){return Promise.resolve("—")},json:function(){return Promise.resolve({})}};window.fetch=function(){return Promise.resolve(r)};window.WebSocket=function(){this.readyState=3;this.send=function(){};this.close=function(){}}})();</script>';

function reloadPreview() {
  if (!current || !iframe) return;
  let html = current.content;
  const headTag = html.match(/<head[^>]*>/i);
  if (headTag) {
    html = html.replace(headTag[0], headTag[0] + PREVIEW_STUB);
  } else {
    html = PREVIEW_STUB + html;
  }
  iframe.srcdoc = html;
}

// ── Sub-tabs (preview / código / análisis) ─────

function updateViewVisibility() {
  const has = !!current;
  if (emptyState) emptyState.style.display = has ? 'none' : '';
  if (webTabs) webTabs.style.display = has ? '' : 'none';
  if (previewView) previewView.style.display = (has && activeSubTab === 'preview') ? '' : 'none';
  if (codeView) codeView.style.display = (has && activeSubTab === 'code') ? '' : 'none';
  if (analyzeView) analyzeView.style.display = (has && activeSubTab === 'analyze') ? '' : 'none';
}

function setSubTab(which) {
  activeSubTab = which;
  document.getElementById('web-tab-preview').classList.toggle('active', which === 'preview');
  document.getElementById('web-tab-code').classList.toggle('active', which === 'code');
  document.getElementById('web-tab-analyze').classList.toggle('active', which === 'analyze');
  updateViewVisibility();
}

// ── Acciones ──────────────────────────────────

function editCurrent() {
  if (!current) return;

  // Archivo del proyecto: abrir el tab existente en el editor de código.
  if (current.kind === 'tab') {
    if (openTab(current.key) && window._setPanelMode) window._setPanelMode('code');
    return;
  }

  // Preset con proyecto esperado: preguntar si clonar solo HTML o completo.
  if (hasWebPresetProject(current.key)) {
    const dialog = document.getElementById('web-clone-dialog');
    if (dialog) dialog.style.display = 'flex';
    return;
  }

  // Preset simple (sin proyecto): copiar solo el HTML.
  cloneHtmlOnly();
}

function cloneHtmlOnly() {
  if (!current || current.kind !== 'preset') return;
  const name = current.key.split('/').pop() || 'index.html';
  const created = createHtmlTab(name, current.content);
  showToast(`Sitio "${created}" copiado al editor. Publíquelo en la red del Arduino con el bloque "desplegar página de archivo".`);
  refreshProjectList();
  if (window._setPanelMode) window._setPanelMode('code');
}

function cloneFullProject() {
  if (!current || current.kind !== 'preset') return;
  const name = current.key.split('/').pop() || 'index.html';
  const created = createHtmlTab(name, current.content);

  const builder = webPresetProjects[current.key];
  if (!builder) { cloneHtmlOnly(); return; }
  if (!workspace) { showToast('Error: workspace no disponible.'); refreshProjectList(); return; }

  // Cambiar al editor de código ANTES de cargar, para que el workspace esté visible
  // (si está oculto, Blockly renderiza los bloques con dimensiones incorrectas).
  if (window._setPanelMode) window._setPanelMode('code');

  try {
    if (window._forceUndoPush) window._forceUndoPush();
    workspace.clear();
    Blockly.serialization.workspaces.load(builder(created), workspace);
    if (typeof workspace.zoomToFit === 'function') workspace.zoomToFit();
    showToast(`Proyecto "${created}" copiado con sus bloques.`);
  } catch (e) {
    console.error('Error al cargar el proyecto del sitio', e);
    showToast('Error al cargar los bloques: ' + (e && e.message ? e.message : e));
  }

  refreshProjectList();
}

// ── Análisis ──────────────────────────────────

function analyzeHtml(html) {
  const bytes = new TextEncoder().encode(html).length;
  const kb = bytes / 1024;
  const issues = [];

  const extPatterns = [
    { re: /<link[^>]*href\s*=\s*["'](?:https?:|\/\/)[^"']*["']/gi, msg: 'hoja de estilo externa (no carga sin internet)' },
    { re: /<script[^>]*src\s*=\s*["'](?:https?:|\/\/)[^"']*["']/gi, msg: 'script externo (no carga sin internet)' },
    { re: /<img[^>]*src\s*=\s*["'](?:https?:|\/\/)[^"']*["']/gi, msg: 'imagen externa (no carga sin internet)' },
    { re: /@import[^;]*["']?(?:https?:|\/\/)/gi, msg: '@import externo (no carga sin internet)' },
    { re: /url\(\s*["']?(?:https?:|\/\/)/gi, msg: 'url() externa en CSS (no carga sin internet)' },
    { re: /fonts\.(googleapis|gstatic)\.com/gi, msg: 'fuente de Google Fonts (no carga sin internet)' },
  ];
  for (const p of extPatterns) {
    if (p.re.test(html)) issues.push({ level: 'warn', msg: p.msg });
  }

  // Referencias relativas a archivos sueltos (no hay filesystem en el R4).
  const relRe = /(?:href|src)\s*=\s*["'](?!data:|#|https?:|\/\/|javascript:|mailto:)([^"']+)["']/gi;
  const files = [];
  let m;
  while ((m = relRe.exec(html))) {
    const v = m[1].trim();
    if (v && /\.[a-z0-9]{1,5}$/i.test(v) && !/\.html?$/i.test(v) && !files.includes(v)) files.push(v);
  }
  if (files.length) issues.push({ level: 'warn', msg: `referencias a archivos sueltos (${files.join(', ')}) — el R4 no tiene filesystem` });

  const b64 = (html.match(/data:image\/[a-z+.-]+;base64,/gi) || []).length;
  if (b64 > 0) issues.push({ level: 'info', msg: `${b64} imagen(es) embebida(s) en base64 (suma ~33% de su peso)` });

  if (kb > BUDGET_KB) {
    issues.push({ level: 'error', msg: `tamaño ${kb.toFixed(1)} KB supera el presupuesto (~${BUDGET_KB} KB para R4 WiFi)` });
  } else if (kb > BUDGET_KB * 0.8) {
    issues.push({ level: 'warn', msg: `tamaño ${kb.toFixed(1)} KB cerca del límite (~${BUDGET_KB} KB)` });
  }

  return { bytes, kb, issues };
}

function renderAnalysis(a) {
  const pct = Math.min(100, (a.kb / BUDGET_KB) * 100);
  let html = '';
  html += `<div class="web-analyze-size">
    <div class="web-analyze-line"><strong>${a.kb.toFixed(1)} KB</strong> de HTML (${a.bytes.toLocaleString('es')} bytes)</div>
    <div class="web-size-bar"><div class="web-size-fill" style="width:${pct.toFixed(1)}%"></div></div>
    <div class="web-analyze-note">Presupuesto R4 WiFi ≈ ${BUDGET_KB} KB (flash 256 KB − sketch base ~61 KB)</div>
  </div>`;

  if (!a.issues.length) {
    html += `<div class="web-analyze-ok">✓ Sin problemas detectados para publicar en el R4 WiFi.</div>`;
  } else {
    html += `<div class="web-analyze-list">`;
    for (const it of a.issues) {
      const cls = it.level === 'error' ? 'err' : (it.level === 'warn' ? 'warn' : 'info');
      const icon = it.level === 'error' ? '✕' : (it.level === 'warn' ? '⚠' : 'ℹ');
      html += `<div class="web-analyze-item ${cls}"><span class="web-analyze-icon">${icon}</span><span>${esc(it.msg)}</span></div>`;
    }
    html += `</div>`;
  }
  return html;
}
