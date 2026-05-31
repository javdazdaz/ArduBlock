/**
 * ArduBlock — Punto de Entrada
 */
import * as Blockly from 'blockly';
import DarkTheme from '@blockly/theme-dark';
import './blocks.js';
import { generateArduinoCode } from './generator.js';
import { initValidator }       from './validator.js';
import { basicsExamples }        from './examples-data.js';

// ═══ Imports: Plugins ═════════════════════════
import { WorkspaceSearch }     from '@blockly/plugin-workspace-search';
import { Backpack }            from '@blockly/workspace-backpack';
import { shadowBlockConversionChangeListener } from '@blockly/shadow-block-converter';
import '@blockly/toolbox-search';
import { TypedVariableModal }  from '@blockly/plugin-typed-variable-modal';
import { CrossTabCopyPaste }   from '@blockly/plugin-cross-tab-copy-paste';
import { ScrollOptions, ScrollBlockDragger, ScrollMetricsManager }
  from '@blockly/plugin-scroll-options';

// ═══ Toolbox ══════════════════════════════════
const toolbox = {
  'kind': 'categoryToolbox',
  'contents': [
    { 'kind': 'category', 'name': 'Arduino', 'colour': '230',
      'contents': [
        { 'kind': 'block', 'type': 'arduino_setup' },
        { 'kind': 'block', 'type': 'arduino_loop' }
      ]},
    { 'kind': 'category', 'name': 'Pines', 'colour': '190',
      'contents': [
        { 'kind': 'block', 'type': 'pin_mode' },
        { 'kind': 'block', 'type': 'digital_write' },
        { 'kind': 'block', 'type': 'digital_read' },
        { 'kind': 'block', 'type': 'analog_write' },
        { 'kind': 'block', 'type': 'analog_read' },
        { 'kind': 'block', 'type': 'pulse_in' },
        { 'kind': 'block', 'type': 'attach_interrupt' }
      ]},
    { 'kind': 'category', 'name': 'Tiempo', 'colour': '290',
      'contents': [{ 'kind': 'block', 'type': 'delay_ms' }]},
    { 'kind': 'category', 'name': 'Sonido', 'colour': '260',
      'contents': [
        { 'kind': 'block', 'type': 'tone_output' },
        { 'kind': 'block', 'type': 'tone_duration' },
        { 'kind': 'block', 'type': 'no_tone_output' }
      ]},
    { 'kind': 'category', 'name': 'Pantalla LCD', 'colour': '180',
      'contents': [
        { 'kind': 'block', 'type': 'lcd_create' },
        { 'kind': 'block', 'type': 'lcd_i2c_create' },
        { 'kind': 'block', 'type': 'lcd_print' },
        { 'kind': 'block', 'type': 'lcd_set_cursor' },
        { 'kind': 'block', 'type': 'lcd_clear' }
      ]},
    { 'kind': 'category', 'name': 'Sensores', 'colour': '100',
      'contents': [
        { 'kind': 'block', 'type': 'dht_create' },
        { 'kind': 'block', 'type': 'dht_temp' },
        { 'kind': 'block', 'type': 'dht_humidity' },
        { 'kind': 'block', 'type': 'ultrasonic_create' },
        { 'kind': 'block', 'type': 'ultrasonic_read' }
      ]},
    { 'kind': 'category', 'name': 'Motor', 'colour': '310',
      'contents': [
        { 'kind': 'block', 'type': 'stepper_create' },
        { 'kind': 'block', 'type': 'stepper_speed' },
        { 'kind': 'block', 'type': 'stepper_step' }
      ]},
    { 'kind': 'category', 'name': 'Servo', 'colour': '40',
      'contents': [
        { 'kind': 'block', 'type': 'servo_create' },
        { 'kind': 'block', 'type': 'servo_write' },
        { 'kind': 'block', 'type': 'servo_write_us' }
      ]},
    { 'kind': 'category', 'name': 'Serial', 'colour': '120',
      'contents': [
        { 'kind': 'block', 'type': 'serial_begin' },
        { 'kind': 'block', 'type': 'serial_print' },
        { 'kind': 'block', 'type': 'serial_println' }
      ]},
    { 'kind': 'sep' },
    { 'kind': 'category', 'name': 'Lógica', 'colour': '210',
      'contents': [
        { 'kind': 'block', 'type': 'controls_if' },
        { 'kind': 'block', 'type': 'logic_compare' },
        { 'kind': 'block', 'type': 'logic_operation' },
        { 'kind': 'block', 'type': 'logic_negate' },
        { 'kind': 'block', 'type': 'logic_boolean' }
      ]},
    { 'kind': 'category', 'name': 'Bucles', 'colour': '120',
      'contents': [
        { 'kind': 'block', 'type': 'controls_repeat_ext' },
        { 'kind': 'block', 'type': 'controls_whileUntil' }
      ]},
    { 'kind': 'category', 'name': 'Matemáticas', 'colour': '230',
      'contents': [
        { 'kind': 'block', 'type': 'math_number' },
        { 'kind': 'block', 'type': 'math_arithmetic' },
        { 'kind': 'block', 'type': 'math_single' },
        { 'kind': 'block', 'type': 'math_modulo' },
        { 'kind': 'block', 'type': 'math_random_int' },
        { 'kind': 'block', 'type': 'math_constrain' },
        { 'kind': 'block', 'type': 'map_value' },
        { 'kind': 'block', 'type': 'math_number_property' }
      ]},
    { 'kind': 'category', 'name': 'Variables', 'colour': '330', 'custom': 'VARIABLE' },
    { 'kind': 'category', 'name': 'Texto', 'colour': '160',
      'contents': [
        { 'kind': 'block', 'type': 'text' },
        { 'kind': 'block', 'type': 'text_join' },
        { 'kind': 'block', 'type': 'text_print' },
        { 'kind': 'block', 'type': 'text_length' }
      ]},
    { 'kind': 'search', 'name': 'Buscar', 'contents': [] }
  ]
};

// ═══ Workspace ════════════════════════════════
const workspace = Blockly.inject('blocklyDiv', {
  toolbox: toolbox,
  theme: DarkTheme,
  renderer: 'geras',
  scrollbars: true, trashcan: true,
  zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 2.5, minScale: 0.3, scaleSpeed: 1.2, pinch: true },
  move: { scrollbars: true, drag: true, wheel: true },
  plugins: {
    blockDragger: ScrollBlockDragger,
    metricsManager: ScrollMetricsManager
  }
});

// ═══ Inicializar plugins ═════════════════════
new WorkspaceSearch(workspace).init();
new Backpack(workspace).init();
workspace.addChangeListener(shadowBlockConversionChangeListener);
new ScrollOptions(workspace).init({ enableBlockDragging: true, enableScroll: true });

// Typed variable modal — disponible pero no reemplaza la categoría estándar
const typedVarModal = new TypedVariableModal(workspace, 'createTypedVariable', [
  ['INT', 'int'], ['FLOAT', 'float'], ['STRING', 'String'], ['BOOL', 'bool']
]);
typedVarModal.init();

// Copy/paste entre pestañas
new CrossTabCopyPaste().init({ contextMenu: true, shortcut: true });

// ═══ Proyectos: Guardar / Cargar / Eliminar (localStorage) ═══

const LS_PREFIX  = 'ardublock:';
const LAST_KEY   = LS_PREFIX + '__last__';
const projectInput = document.getElementById('project-name');
const projectList  = document.getElementById('project-list');

function getProjectName() {
  const raw = projectInput.value.trim();
  return raw || 'sin-nombre';
}

function lsKey(name) {
  return LS_PREFIX + name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
}

function saveProject(name) {
  name = name || getProjectName();
  projectInput.value = name;

  const state = Blockly.serialization.workspaces.save(workspace);
  const record = {
    name: name,
    saved: Date.now(),
    state: state
  };
  try {
    localStorage.setItem(lsKey(name), JSON.stringify(record));
    localStorage.setItem(LAST_KEY, name);  // recordar último
    showToast(`Proyecto "${name}" guardado`);
  } catch (e) {
    showToast('Error al guardar: memoria llena');
  }
}

function loadProject(name) {
  if (!name) return;
  try {
    const raw = localStorage.getItem(lsKey(name));
    if (!raw) { showToast(`Proyecto "${name}" no encontrado`); return; }
    const record = JSON.parse(raw);
    workspace.clear();
    Blockly.serialization.workspaces.load(record.state, workspace);
    projectInput.value = record.name;
    window._exampleComment = null;  // limpiar comentario de ejemplo
    localStorage.setItem(LAST_KEY, record.name);  // recordar último
    showToast(`Proyecto "${record.name}" cargado`);
  } catch (e) {
    showToast(`Error al cargar: ${e.message}`);
  }
  projectList.classList.add('hidden');
}

function deleteProject(name) {
  if (!name) return;
  if (!confirm(`¿Eliminar proyecto "${name}"?`)) return;
  localStorage.removeItem(lsKey(name));
  if (localStorage.getItem(LAST_KEY) === name) {
    localStorage.removeItem(LAST_KEY);
  }
  if (projectInput.value.trim() === name) {
    workspace.clear();
    projectInput.value = '';
  }
  showToast(`Proyecto "${name}" eliminado`);
  projectList.classList.add('hidden');
}

function renderProjectList() {
  projectList.innerHTML = '';
  const items = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key.startsWith(LS_PREFIX) || key === LAST_KEY) continue;
    try {
      const record = JSON.parse(localStorage.getItem(key));
      items.push({ name: record.name, saved: record.saved });
    } catch (e) { /* skip corrupted */ }
  }

  items.sort((a, b) => b.saved - a.saved);

  if (!items.length) {
    projectList.innerHTML = '<div class="project-dropdown-empty">Sin proyectos guardados</div>';
    return;
  }

  for (const p of items) {
    const date = new Date(p.saved);
    const dateStr = date.toLocaleDateString('es-AR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
    const div = document.createElement('div');
    div.className = 'project-dropdown-item';
    div.innerHTML = `<span>${escapeHtml(p.name)}</span><span class="project-date">${dateStr}</span>`;
    div.addEventListener('click', () => loadProject(p.name));
    projectList.appendChild(div);
  }
}

function toggleProjectList() {
  if (projectList.classList.contains('hidden')) {
    renderProjectList();
    // Posicionar debajo del botón Cargar
    const btn = document.getElementById('btn-load');
    const rect = btn.getBoundingClientRect();
    projectList.style.top = (rect.bottom + 4) + 'px';
    projectList.style.left = rect.left + 'px';
    projectList.classList.remove('hidden');
  } else {
    projectList.classList.add('hidden');
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Cerrar dropdown al clickear afuera
document.addEventListener('click', (e) => {
  if (!projectList.classList.contains('hidden') &&
      !e.target.closest('#btn-load') &&
      !e.target.closest('#project-list')) {
    projectList.classList.add('hidden');
  }
});

// Botones
document.getElementById('btn-save').addEventListener('click', () => saveProject());
document.getElementById('btn-load').addEventListener('click', toggleProjectList);
document.getElementById('btn-delete').addEventListener('click', () => {
  const name = getProjectName();
  if (!projectInput.value.trim()) {
    showToast('Escribí el nombre del proyecto a eliminar');
    return;
  }
  deleteProject(name);
});

// Auto-guardar al modificar el workspace (debounce 2s)
let autoSaveTimer = null;
workspace.addChangeListener(() => {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    const name = projectInput.value.trim();
    if (name) saveProject(name);
  }, 2000);
});

// ═══ UI ═══════════════════════════════════════
const codeOutput = document.getElementById('code-output');
const lineCount  = document.getElementById('line-count');

function updateCode() {
  try {
    let code = generateArduinoCode(workspace);
    // Prepend example comment if loaded
    if (window._exampleComment) {
      code = window._exampleComment + '\n' + code;
    }
    codeOutput.textContent = code;
    lineCount.textContent = code.split('\n').length + ' líneas';
  } catch (e) {
    codeOutput.textContent = '// Error: ' + e.message;
    lineCount.textContent = 'error';
  }
}
workspace.addChangeListener(updateCode);
updateCode();

document.getElementById('btn-copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(codeOutput.textContent); showToast('¡Copiado!'); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = codeOutput.textContent; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    showToast('¡Copiado!');
  }
});
document.getElementById('btn-new').addEventListener('click', () => {
  workspace.clear();
  Blockly.serialization.workspaces.load(getDefaultState(), workspace);
  projectInput.value = '';
  window._exampleComment = null;
  showToast('Proyecto nuevo');
});
function showToast(msg) {
  const old = document.querySelector('.toast'); if (old) old.remove();
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2000);
}

// ═══ Carga inicial: último proyecto o default ═══
function getDefaultState() {
  return {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: 'arduino_setup', id: 'S1', x: 20, y: 20,
          inputs: {
            BODY: {
              block: {
                type: 'serial_begin', id: 'S2',
                fields: { BAUD: '9600' },
                next: {
                  block: {
                    type: 'pin_mode', id: 'S3',
                    fields: { PIN: 13, MODE: 'OUTPUT' }
                  }
                }
              }
            }
          }
        },
        {
          type: 'arduino_loop', id: 'L1', x: 20, y: 160,
          inputs: {
            BODY: {
              block: {
                type: 'digital_write', id: 'L2',
                fields: { PIN: 13, VALUE: 'HIGH' },
                next: {
                  block: {
                    type: 'delay_ms', id: 'L3',
                    fields: { MS: 1000 },
                    next: {
                      block: {
                        type: 'digital_write', id: 'L4',
                        fields: { PIN: 13, VALUE: 'LOW' },
                        next: {
                          block: {
                            type: 'delay_ms', id: 'L5',
                            fields: { MS: 1000 }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      ]
    }
  };
}

(function initWorkspace() {
  console.log('[ArduBlock] Inicializando workspace...');
  const lastName = localStorage.getItem(LAST_KEY);

  if (lastName) {
    const raw = localStorage.getItem(lsKey(lastName));
    if (raw) {
      try {
        const record = JSON.parse(raw);
        Blockly.serialization.workspaces.load(record.state, workspace);
        projectInput.value = record.name;
        console.log('[ArduBlock] Último proyecto cargado:', record.name);
        return;
      } catch (e) {
        console.warn('[ArduBlock] Último proyecto corrupto, cargando default:', e.message);
      }
    }
  }

  // Fallback: default state
  try {
    Blockly.serialization.workspaces.load(getDefaultState(), workspace);
    console.log('[ArduBlock] Default state cargado.');
  } catch(e) {
    console.warn('[ArduBlock] Default state:', e.message);
  }
})();

// ═══ Ejemplos de Arduino ═══════════════════════════

const examplesModal = document.getElementById('examples-modal');
const examplesList  = document.getElementById('examples-list');

document.getElementById('btn-examples').addEventListener('click', openExamples);
document.getElementById('examples-close').addEventListener('click', closeExamples);
examplesModal.addEventListener('click', (e) => { if (e.target === examplesModal) closeExamples(); });

async function openExamples() {
  examplesModal.classList.remove('hidden');

  // Agrupar por categoría
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

  // Botón para el resto de ejemplos (solo código)
  html += `<div class="example-category">Más ejemplos (código)</div>
    <div class="example-item" data-name="__browse__">
      <span>📂 Explorar todos los ejemplos...</span>
      <span class="example-desc">81 sketches de Arduino</span>
    </div>`;

  examplesList.innerHTML = html;

  // Click en un ejemplo con preset
  examplesList.querySelectorAll('.example-item').forEach(el => {
    el.addEventListener('click', () => {
      if (el.dataset.name === '__browse__') {
        loadBrowseExamples();
      } else {
        loadPresetExample(el.dataset.name);
      }
    });
  });
}

function loadPresetExample(name) {
  const ex = basicsExamples.find(e => e.name === name);
  if (!ex) return;

  workspace.clear();
  Blockly.serialization.workspaces.load(ex.state, workspace);
  window._exampleComment = ex.comment;
  updateCode();
  projectInput.value = '';
  closeExamples();
  showToast(`Ejemplo "${ex.name}" cargado`);
}

// Fallback: explorar ejemplos por API (código en panel)
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

function closeExamples() {
  examplesModal.classList.add('hidden');
}

// ═══ Serial Monitor ════════════════════════════════

const arduinoConsole  = document.getElementById('arduino-console');
const consoleOutput   = document.getElementById('console-output');
const btnConnect      = document.getElementById('serial-connect');
const btnConsoleToggle = document.getElementById('btn-console-toggle');
const serialBaud      = document.getElementById('serial-baud');
let serialPollTimer   = null;
let serialConnected   = false;

document.getElementById('console-close').addEventListener('click', toggleConsole);
btnConsoleToggle.addEventListener('click', toggleConsole);

function toggleConsole() {
  if (arduinoConsole.classList.contains('hidden')) {
    arduinoConsole.classList.remove('hidden');
    btnConsoleToggle.classList.add('active');
    btnConsoleToggle.textContent = '🔌 Consola';
  } else {
    if (serialConnected) disconnectSerial();
    arduinoConsole.classList.add('hidden');
    btnConsoleToggle.classList.remove('active');
    btnConsoleToggle.textContent = '🔌 Consola';
  }
}

document.getElementById('serial-clear').addEventListener('click', () => {
  consoleOutput.textContent = '';
});

function consoleLog(msg, cls = '') {
  const span = cls ? `<span class="${cls}">${escapeHtml(msg)}</span>` : escapeHtml(msg);
  consoleOutput.innerHTML += span + '\n';
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

async function connectSerial() {
  if (serialConnected) return;
  arduinoConsole.classList.remove('hidden');
  btnConnect.disabled = true;
  const baud = serialBaud.value || getSetting('baud');

  try {
    const res = await fetch('/api/serial/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baud: parseInt(baud) })
    });
    const data = await res.json();

    if (data.error) {
      consoleLog(data.error, 'error');
      btnConnect.disabled = false;
      return;
    }

    serialConnected = true;
    btnConnect.disabled = false;
    btnConnect.textContent = '🔌 Desconectar';
    btnConnect.className = 'console-btn connected';
    consoleLog(`✓ Conectado a ${data.port || '?'} @ ${data.baud || '?'} baud`, 'success');

    // Polling cada 200ms
    serialPollTimer = setInterval(async () => {
      try {
        const r = await fetch('/api/serial/read');
        const d = await r.json();
        if (d.data) {
          consoleOutput.textContent += d.data;
          consoleOutput.scrollTop = consoleOutput.scrollHeight;
        }
      } catch(e) {}
    }, 200);
  } catch (e) {
    consoleLog('Error: ' + e.message, 'error');
    btnConnect.disabled = false;
  }
}

async function disconnectSerial() {
  serialConnected = false;
  if (serialPollTimer) { clearInterval(serialPollTimer); serialPollTimer = null; }
  try { await fetch('/api/serial/close', { method: 'POST' }); } catch(e) {}
  btnConnect.disabled = false;
  btnConnect.textContent = '🔌 Conectar';
  btnConnect.className = 'console-btn connect';
  consoleLog('Desconectado', 'info');
}

btnConnect.addEventListener('click', () => {
  if (serialConnected) disconnectSerial();
  else connectSerial();
});

// ═══ Subir al Arduino ═════════════════════════════

const btnUpload = document.getElementById('btn-upload');

async function uploadToArduino() {
  arduinoConsole.classList.remove('hidden');
  btnConsoleToggle.classList.add('active');
  consoleOutput.innerHTML = '';
  btnUpload.disabled = true;

  // Desconectar serial durante el upload
  if (serialConnected) disconnectSerial();

  const code = generateArduinoCode(workspace);
  consoleLog('🔍 Buscando Arduino...', 'info');

  // Detectar placa
  let port = '';
  let fqbn = getSetting('board');
  try {
    const boardRes = await fetch('/api/boards');
    const boardData = await boardRes.json();
    if (boardData.detected_ports && boardData.detected_ports.length > 0) {
      const p = boardData.detected_ports[0];
      port = p.port.address || p.address || '';
      if (p.matching_boards && p.matching_boards.length > 0) {
        fqbn = p.matching_boards[0].fqbn || fqbn;
      }
      consoleLog(`✓ Placa detectada: ${port} (${fqbn})`, 'success');
    } else {
      consoleLog('✕ No se detectó ningún Arduino. Conectalo por USB.', 'error');
      btnUpload.disabled = false;
      return;
    }
  } catch (e) {
    consoleLog('✕ Error al buscar placa: ' + e.message, 'error');
    btnUpload.disabled = false;
    return;
  }

  consoleLog('⚙ Compilando...', 'info');

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, port, fqbn })
    });
    const data = await res.json();

    if (data.stdout) {
      // Filtrar líneas irrelevantes
      const lines = data.stdout.split('\n').filter(l => l.trim());
      for (const line of lines) {
        if (line.includes('error') || line.includes('Error')) {
          consoleLog(line, 'error');
        } else if (line.includes('done') || line.includes('upload') || line.includes('SUCCESS')) {
          consoleLog(line, 'success');
        } else {
          consoleLog(line);
        }
      }
    }

    if (data.stderr) {
      for (const line of data.stderr.split('\n').filter(l => l.trim())) {
        consoleLog(line, 'error');
      }
    }

    if (data.success) {
      consoleLog('✅ ¡Sketch subido correctamente!', 'success');
      // Reconectar serial automáticamente
      setTimeout(() => connectSerial(), 1500);
    } else {
      consoleLog('❌ Falló: ' + (data.stage || 'desconocido'), 'error');
    }
  } catch (e) {
    consoleLog('Error de conexión: ' + e.message, 'error');
  }

  btnUpload.disabled = false;
}

btnUpload.addEventListener('click', uploadToArduino);

// ═══ Settings ══════════════════════════════════════

const SETTINGS_KEY = 'ardublock:settings';
const defaultSettings = {
  board: 'arduino:avr:uno', baud: 9600,
  theme: 'dark', renderer: 'geras',
  fontUi: 14, fontCode: 13, fontSerial: 12, fontBlocks: 16, fontToolbox: 13
};

function loadSettings() {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
  } catch(e) { return { ...defaultSettings }; }
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function getSetting(key) {
  return loadSettings()[key] ?? defaultSettings[key];
}

function applySettings(s) {
  s = s || loadSettings();

  // Font sizes: header + arduino toolbar
  const uiFont = s.fontUi + 'px';
  document.querySelector('header').style.fontSize = uiFont;
  document.querySelector('.arduino-toolbar') && (document.querySelector('.arduino-toolbar').style.fontSize = uiFont);
  document.getElementById('code-output').style.fontSize = s.fontCode + 'px';
  document.getElementById('console-output').style.fontSize = s.fontSerial + 'px';

  // Blockly fonts
  const currentTheme = workspace.getTheme();
  if (currentTheme) {
    currentTheme.fontStyle = currentTheme.fontStyle || {};
    currentTheme.fontStyle.family = '"Fira Code", "Consolas", monospace';
    currentTheme.fontStyle.size = s.fontBlocks;   // ← tamaño de BLOQUES
    currentTheme.fontStyle.weight = 'normal';
    workspace.setTheme(currentTheme);
  }
  // Forzar re-render de bloques con nueva fuente
  const state = Blockly.serialization.workspaces.save(workspace);
  const constants = workspace.getRenderer().getConstants();
  if (constants) {
    constants.FIELD_TEXT_FONTSIZE = s.fontBlocks;
    constants.FIELD_BORDER_RECT_HEIGHT = s.fontBlocks + 8;
  }
  workspace.clear();
  Blockly.serialization.workspaces.load(state, workspace);

  // Toolbox: aplicar a todos los selectores posibles
  const toolboxFont = s.fontToolbox + 'px';
  document.querySelectorAll('.blocklyToolboxCategoryLabel, .blocklyTreeRow, .blocklyTreeLabel').forEach(el => {
    el.style.fontSize = toolboxFont;
  });
}

function applyTheme(theme) {
  const root = document.documentElement.style;
  if (theme === 'light') {
    root.setProperty('--bg', '#f0f0f5');
    root.setProperty('--bg-panel', '#e8e8f0');
    root.setProperty('--bg-header', '#d0d0e0');
    root.setProperty('--bg-input', '#fff');
    root.setProperty('--bg-code', '#f8f8fc');
    root.setProperty('--code-text', '#1a6e1a');
    root.setProperty('--slider-fill', '#0077aa');
    root.setProperty('--slider-track', '#ccc');
    root.setProperty('--slider-thumb', '#0077aa');
    root.setProperty('--status-warn', '#b8860b');
    root.setProperty('--status-warn-msg', '#8B6914');
    root.setProperty('--bg-console', '#f0f0f5');
    root.setProperty('--bg-dropdown', '#fff');
    root.setProperty('--text', '#1a1a2e');
    root.setProperty('--text-dim', '#666');
    root.setProperty('--border', '#ccc');
    root.setProperty('--btn-secondary-bg', '#0077aa');
    root.setProperty('--btn-secondary-text', '#fff');
    root.setProperty('--btn-danger-bg', '#ddd');
    root.setProperty('--btn-danger-text', '#333');
    root.setProperty('--console-border', '#e67e22');
    workspace.setTheme(Blockly.Themes.Classic);
  } else {
    root.setProperty('--bg', '#1a1a2e');
    root.setProperty('--bg-panel', '#16213e');
    root.setProperty('--bg-header', '#0f3460');
    root.setProperty('--bg-input', '#2a2a3e');
    root.setProperty('--bg-code', '#0d0d1a');
    root.setProperty('--code-text', '#a8d8a8');
    root.setProperty('--slider-fill', '#00b4d8');
    root.setProperty('--slider-track', '#3a3a5a');
    root.setProperty('--slider-thumb', '#00b4d8');
    root.setProperty('--status-warn', '#f0c040');
    root.setProperty('--status-warn-msg', '#d4a017');
    root.setProperty('--bg-console', '#0a0a14');
    root.setProperty('--bg-dropdown', '#1a1a2e');
    root.setProperty('--text', '#e0e0e0');
    root.setProperty('--text-dim', '#888');
    root.setProperty('--border', '#2a2a4a');
    root.setProperty('--btn-secondary-bg', '#00b4d8');
    root.setProperty('--btn-secondary-text', '#000');
    root.setProperty('--btn-danger-bg', '#444');
    root.setProperty('--btn-danger-text', '#ddd');
    root.setProperty('--console-border', '#e67e22');
    workspace.setTheme(DarkTheme);
  }
}

function applyRenderer(renderer) {
  const state = Blockly.serialization.workspaces.save(workspace);
  workspace.dispose();

  // Reinject with new renderer
  const newWs = Blockly.inject('blocklyDiv', {
    toolbox: toolbox,
    theme: workspace.getTheme(),
    renderer: renderer,
    scrollbars: true, trashcan: true,
    zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 2.5, minScale: 0.3, scaleSpeed: 1.2, pinch: true },
    move: { scrollbars: true, drag: true, wheel: true }
  });
  // Reemplazar global workspace
  Object.assign(workspace, newWs);
  Blockly.serialization.workspaces.load(state, workspace);
  // Re-init plugins on new workspace
  new WorkspaceSearch(workspace).init();
  new Backpack(workspace).init();
  workspace.addChangeListener(shadowBlockConversionChangeListener);
  new ScrollOptions(workspace).init({ enableBlockDragging: true, enableScroll: true });
  new CrossTabCopyPaste().init({ contextMenu: true, shortcut: true });
  workspace.addChangeListener(updateCode);
  updateCode();
  initValidator(workspace);
  applySettings();
}

// UI: abrir modal
const settingsModal = document.getElementById('settings-modal');
document.getElementById('btn-settings').addEventListener('click', () => {
  const s = loadSettings();
  document.getElementById('setting-board').value = s.board;
  document.getElementById('setting-baud').value = s.baud;
  document.getElementById('setting-theme').value = s.theme;
  document.getElementById('setting-renderer').value = s.renderer;
  document.getElementById('setting-font-ui').value = s.fontUi;
  document.getElementById('setting-font-code').value = s.fontCode;
  document.getElementById('setting-font-serial').value = s.fontSerial;
  document.getElementById('setting-font-blocks').value = s.fontBlocks;
  document.getElementById('setting-font-toolbox').value = s.fontToolbox;
  updateFontLabels();
  // Inicializar color de tracks
  initSliderTracks();
  settingsModal.classList.remove('hidden');
});

function updateSliderTrack(el) {
  const pct = ((el.value - el.min) / (el.max - el.min)) * 100;
  el.style.background = `linear-gradient(to right, var(--slider-fill) ${pct}%, var(--slider-track) ${pct}%)`;
}

// Inicializar tracks al abrir settings
function initSliderTracks() {
  document.querySelectorAll('.setting-row input[type="range"]').forEach(updateSliderTrack);
}

function updateFontLabels() {  document.getElementById('setting-font-ui-val').textContent = document.getElementById('setting-font-ui').value + 'px';
  document.getElementById('setting-font-code-val').textContent = document.getElementById('setting-font-code').value + 'px';
  document.getElementById('setting-font-serial-val').textContent = document.getElementById('setting-font-serial').value + 'px';
  document.getElementById('setting-font-blocks-val').textContent = document.getElementById('setting-font-blocks').value + 'px';
  document.getElementById('setting-font-toolbox-val').textContent = document.getElementById('setting-font-toolbox').value + 'px';
}

document.getElementById('settings-close').addEventListener('click', () => settingsModal.classList.add('hidden'));
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); });

// Selects & sliders: guardar y aplicar
function onSettingChange(key, value, applyFn) {
  const s = loadSettings(); s[key] = value; saveSettings(s);
  if (applyFn) applyFn(value);
}

document.getElementById('setting-board').addEventListener('change', function() { onSettingChange('board', this.value); });
document.getElementById('setting-baud').addEventListener('change', function() { onSettingChange('baud', parseInt(this.value)); });
document.getElementById('setting-theme').addEventListener('change', function() { onSettingChange('theme', this.value, applyTheme); });
document.getElementById('setting-renderer').addEventListener('change', function() { onSettingChange('renderer', this.value, r => { if (r !== workspace.options.renderer) applyRenderer(r); }); });

['ui','code','serial','blocks','toolbox'].forEach(k => {
  const el = document.getElementById('setting-font-' + k);
  el.addEventListener('input', () => {
    updateFontLabels();
    updateSliderTrack(el);
  });
  el.addEventListener('change', () => {
    onSettingChange('font' + k[0].toUpperCase() + k.slice(1), parseInt(el.value), () => applySettings());
  });
});

// Sync baud
serialBaud.value = getSetting('baud');

// Apply on load
(function initSettings() {
  const s = loadSettings();
  applyTheme(s.theme);
  applySettings(s);
  serialBaud.value = s.baud;
})();

// ═══ Init ════════════════════════════════════════

// Panel resizer (código)
const resizer = document.getElementById('panel-resizer');
const editorPanel = document.getElementById('editor-panel');
const codePanel = document.getElementById('code-panel');
let isResizing = false;
let resizeTarget = null;

resizer.addEventListener('mousedown', (e) => {
  isResizing = true;
  resizeTarget = 'code';
  resizer.classList.add('active');
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

// Toolbox resizer — click en el borde del toolbox
function setupToolboxResize() {
  const toolbox = document.querySelector('.blocklyToolbox');
  if (!toolbox || toolbox.dataset.resizerReady) return;
  toolbox.dataset.resizerReady = '1';

  toolbox.addEventListener('mousedown', (e) => {
    const rect = toolbox.getBoundingClientRect();
    const onEdge = (rect.right - e.clientX) < 14;
    if (!onEdge) return;

    isResizing = true;
    resizeTarget = 'toolbox';
    toolbox.style.borderRightColor = 'var(--accent2)';
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
    e.stopPropagation();
  });

  // Doble click en el borde → colapsar/expandir toolbox
  toolbox.addEventListener('dblclick', (e) => {
    const rect = toolbox.getBoundingClientRect();
    const onEdge = (rect.right - e.clientX) < 14;
    if (!onEdge) return;
    const collapsed = toolbox.dataset.collapsed === '1';
    if (collapsed) {
      toolbox.style.width = toolbox.dataset.prevWidth || '';
      toolbox.style.minWidth = '';
      toolbox.style.overflow = '';
      toolbox.dataset.collapsed = '0';
    } else {
      toolbox.dataset.prevWidth = toolbox.style.width || getComputedStyle(toolbox).width;
      toolbox.dataset.collapsed = '1';
      toolbox.style.width = '5px';
      toolbox.style.minWidth = '5px';
      toolbox.style.overflow = 'hidden';
    }
    Blockly.svgResize(workspace);
  });
}

setTimeout(setupToolboxResize, 300);
setTimeout(setupToolboxResize, 1000);
workspace.addChangeListener(() => setTimeout(setupToolboxResize, 50));

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;

  if (resizeTarget === 'code') {
    const main = document.querySelector('main');
    const rect = main.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const total = rect.width - resizer.offsetWidth;
    const editorPct = (x / total) * 100;
    editorPanel.style.flex = editorPct;
    codePanel.style.flex = 100 - editorPct;
  } else if (resizeTarget === 'toolbox') {
    const toolbox = document.querySelector('.blocklyToolbox');
    if (toolbox) {
      const w = Math.max(60, Math.min(400, e.clientX - toolbox.getBoundingClientRect().left));
      toolbox.style.width = w + 'px';
    }
  }
  Blockly.svgResize(workspace);
});

document.addEventListener('mouseup', () => {
  if (!isResizing) return;
  isResizing = false;
  resizeTarget = null;
  resizer.classList.remove('active');
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  Blockly.svgResize(workspace);
});

resizer.addEventListener('dblclick', () => {
  if (!codeCollapsed) collapseCode();
});
let codeCollapsed = false;
const floatExpandBtn = document.getElementById('float-expand-code');
const collapseBtn = document.getElementById('btn-collapse-code');

function collapseCode() {
  codeCollapsed = true;
  codePanel.dataset.prevFlex = codePanel.style.flex || '1';
  codePanel.style.flex = '0 0 0';
  codePanel.classList.add('collapsed');
  collapseBtn.textContent = '▶';
  // Posicionar botón flotante a la altura del panel header
  const headerRect = codePanel.querySelector('.panel-header').getBoundingClientRect();
  floatExpandBtn.style.top = headerRect.top + 'px';
  floatExpandBtn.classList.add('visible');
  setTimeout(() => Blockly.svgResize(workspace), 100);
}

function expandCode() {
  codeCollapsed = false;
  codePanel.style.flex = codePanel.dataset.prevFlex || '1';
  codePanel.classList.remove('collapsed');
  collapseBtn.textContent = '◀';
  floatExpandBtn.classList.remove('visible');
  setTimeout(() => Blockly.svgResize(workspace), 100);
}

collapseBtn.addEventListener('click', () => {
  if (codeCollapsed) expandCode(); else collapseCode();
});
floatExpandBtn.addEventListener('click', expandCode);

initValidator(workspace);
