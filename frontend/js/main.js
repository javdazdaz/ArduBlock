/**
 * ArduBlock — Orquestador Principal
 *
 * Inicializa el workspace, plugins, y conecta todos los módulos:
 *   project-manager.js — guardar/cargar/eliminar proyectos
 *   settings.js        — tema, renderer, fuentes, placa
 *   serial.js          — monitor serial
 *   upload.js          — compilación + upload a Arduino
 *   examples.js        — ejemplos de Arduino
 *   resize.js          — redimensión de paneles
 *   validator.js       — validación pedagógica de bloques
 */

import * as Blockly from 'blockly';
import DarkTheme from '@blockly/theme-dark';
import './blocks.js';
import { generateArduinoCode } from './generator.js';
import { initValidator }       from './validator.js';

// Plugins
import { WorkspaceSearch }     from '@blockly/plugin-workspace-search';
import { Backpack }            from '@blockly/workspace-backpack';
import { shadowBlockConversionChangeListener } from '@blockly/shadow-block-converter';
import '@blockly/toolbox-search';
import { CrossTabCopyPaste }   from '@blockly/plugin-cross-tab-copy-paste';
import { ScrollOptions, ScrollBlockDragger, ScrollMetricsManager }
  from '@blockly/plugin-scroll-options';

// ═══ Plugins compuestos ═════════════════════════
// fixed-edges + scroll-options compiten por plugins.metricsManager.
// Clase compuesta: hereda el caching de ScrollMetricsManager + bordes fijos.
class FixedEdgesScrollMetricsManager extends ScrollMetricsManager {
  constructor(workspace) {
    super(workspace);
  }

  static _fixedEdges = {};

  static setFixedEdges(edges) {
    FixedEdgesScrollMetricsManager._fixedEdges = {
      top: !!edges.top, bottom: !!edges.bottom,
      left: !!edges.left, right: !!edges.right,
    };
  }

  hasFixedEdges() { return true; }

  getComputedFixedEdges_(cachedViewMetrics) {
    const v = cachedViewMetrics || this.getViewMetrics(false);
    const fe = FixedEdgesScrollMetricsManager._fixedEdges;
    const hScroll = this.workspace_.isMovableHorizontally();
    const vScroll = this.workspace_.isMovableVertically();

    const edges = {
      top: fe.top ? 0 : undefined,
      bottom: fe.bottom ? 0 : undefined,
      left: fe.left ? 0 : undefined,
      right: fe.right ? 0 : undefined,
    };
    if (fe.top && fe.bottom) edges.bottom = v.height;
    if (fe.left && fe.right) edges.right = v.width;

    if (!vScroll) {
      if (edges.top !== undefined) edges.bottom = edges.top + v.height;
      else if (edges.bottom !== undefined) edges.top = edges.bottom - v.height;
      else { edges.top = v.top; edges.bottom = v.top + v.height; }
    }
    if (!hScroll) {
      if (edges.left !== undefined) edges.right = edges.left + v.width;
      else if (edges.right !== undefined) edges.left = edges.right - v.width;
      else { edges.left = v.left; edges.right = v.left + v.width; }
    }
    return edges;
  }
}

// Configurar bordes fijos: evitar que el workspace se expanda
// infinitamente al arrastrar bloques hacia arriba o izquierda.
FixedEdgesScrollMetricsManager.setFixedEdges({ top: true, left: true });

// Módulos de la aplicación
import { initProjectManager, lsKey, isWorkspaceDirty } from './project-manager.js';
import { initSettings, getSetting } from './settings.js';
import { initSerial }        from './serial.js';
import { initUpload }         from './upload.js';
import { initExamples }  from './examples.js';
import { initResize }   from './resize.js';
import { exportSketch } from './download.js';
import { initTabManager, getTabs, loadTabs, setSketchName, setInoContent, getInoContent, setCodeTheme } from './tab-manager.js';
import { t, applyDOMLanguage } from './i18n.js';
import { initActivityProtection, getActivityMeta, applyActivityMeta, clearActivityMeta, isActivityLoaded } from './activity-protection.js';
import { initUndoTree, undo as treeUndo, redo as treeRedo, canUndo, canRedo, schedulePush, forcePush, restoreSnapshot, resetTree } from './undo-tree.js';
import { initActivities, getActivityList, loadActivity } from './activities.js';

// ═══ Toolbox ══════════════════════════════════
import { buildToolboxForBoard, getBlockLevel } from './blocks.js';

const toolbox = buildToolboxForBoard(getSetting('board'), getSetting('level'));

// Función para reconstruir toolbox al cambiar de placa o nivel
window._rebuildToolbox = function(fqbn, level) {
  const currentLevel = level ?? getSetting('level');
  const newToolbox = buildToolboxForBoard(fqbn, currentLevel);
  workspace.updateToolbox(newToolbox);
};

// ═══ Workspace ════════════════════════════════
const workspace = Blockly.inject('blocklyDiv', {
  toolbox,
  theme: DarkTheme,
  renderer: 'geras',
  scrollbars: true, trashcan: true,
  zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 2.5, minScale: 0.3, scaleSpeed: 1.2, pinch: true },
  move: { scrollbars: true, drag: true, wheel: true },
  plugins: { blockDragger: ScrollBlockDragger, metricsManager: FixedEdgesScrollMetricsManager }
});

// ═══ Tema: paleta App Inventor para bloques compartidos ═══
// Los bloques built-in de Blockly que App Inventor también usa
// deben verse idénticos. Overrideamos los 7 estilos de bloque
// con los hex exactos de App Inventor (saturación alta, vibrantes).
// Esto cubre ~25 bloques de 5 categorías sin código manual.
const AI = {
  loop_blocks:      { colourPrimary: '#cfac4b', colourSecondary: '#9b8138', colourTertiary: '#332b12' },  // Control — ámbar
  logic_blocks:     { colourPrimary: '#88b652', colourSecondary: '#66883d', colourTertiary: '#222d14' },  // Lógica — verde
  math_blocks:      { colourPrimary: '#4f86c2', colourSecondary: '#3b6491', colourTertiary: '#132130' },  // Matemáticas — azul
  text_blocks:      { colourPrimary: '#c24471', colourSecondary: '#913354', colourTertiary: '#30111c' },  // Texto — rosa
  list_blocks:      { colourPrimary: '#58b5dc', colourSecondary: '#4287a5', colourTertiary: '#162d37' },  // Arreglos — celeste
  variable_blocks:  { colourPrimary: '#db743a', colourSecondary: '#a4572b', colourTertiary: '#361d0e' },  // Variables — naranja
  procedure_blocks: { colourPrimary: '#8f6997', colourSecondary: '#6b4e71', colourTertiary: '#231a25' },  // Funciones — violeta
};

const theme = workspace.getTheme();
for (const [name, style] of Object.entries(AI)) {
  theme.setBlockStyle(name, style);
}

// ═══ Plugins ═════════════════════════════════
new WorkspaceSearch(workspace).init();
new Backpack(workspace).init();
workspace.addChangeListener(shadowBlockConversionChangeListener);
new ScrollOptions(workspace).init({ enableBlockDragging: true, enableScroll: true });

new CrossTabCopyPaste().init({ contextMenu: true, shortcut: true });

// ═══ UI: Código ══════════════════════════════
const lineCount = document.getElementById('line-count');

export function updateCode() {
  try {
    let code = generateArduinoCode(workspace);
    if (window._exampleComment) code = window._exampleComment + '\n' + code;
    setInoContent(code);
    lineCount.textContent = code.split('\n').length + ' ' + t('panel_lines');
  } catch (e) {
    setInoContent('// Error: ' + e.message);
    lineCount.textContent = 'error';
  }
}
workspace.addChangeListener(updateCode);
updateCode();

document.getElementById('btn-copy').addEventListener('click', async () => {
  const code = getInoContent();
  try { await navigator.clipboard.writeText(code); showToast(t('toast_copied')); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = code; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    showToast(t('toast_copied'));
  }
});

document.getElementById('btn-export').addEventListener('click', exportSketch);

// ═══ Menú hamburguesa ══════════════════════════

const hamburgerBtn  = document.getElementById('btn-hamburger');
const hamburgerMenu = document.getElementById('hamburger-menu');

// Toggle menú
hamburgerBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isHidden = hamburgerMenu.classList.contains('hidden');
  if (isHidden) {
    const rect = hamburgerBtn.getBoundingClientRect();
    hamburgerMenu.style.top = (rect.bottom + 4) + 'px';
    hamburgerMenu.style.left = rect.left + 'px';
  }
  hamburgerMenu.classList.toggle('hidden');
});

// Cerrar menú al clickear afuera
document.addEventListener('click', (e) => {
  if (!hamburgerMenu.classList.contains('hidden') &&
      !hamburgerMenu.contains(e.target) &&
      e.target !== hamburgerBtn) {
    hamburgerMenu.classList.add('hidden');
  }
});

// Cerrar menú con Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hamburgerMenu.classList.add('hidden');
});

// ═══ Undo/Redo vía árbol de historial ═══════

const undoBtn = document.getElementById('btn-undo');
const redoBtn = document.getElementById('btn-redo');

// Tooltips según idioma
undoBtn.title = t('btn_undo');
redoBtn.title = t('btn_redo');

function updateUndoRedoButtons() {
  undoBtn.disabled = !canUndo();
  redoBtn.disabled = !canRedo();
}

undoBtn.addEventListener('click', () => {
  const snap = treeUndo();
  if (snap) restoreSnapshot(snap);
  updateUndoRedoButtons();
});

redoBtn.addEventListener('click', () => {
  const snap = treeRedo();
  if (snap) restoreSnapshot(snap);
  updateUndoRedoButtons();
});

// Exponer para que tab-manager y otros módulos puedan disparar snapshot
window._scheduleUndoPush = schedulePush;
window._forceUndoPush = forcePush;
window._updateUndoRedoButtons = updateUndoRedoButtons;

// Items del menú → disparan los botones originales
document.getElementById('hmenu-new').addEventListener('click', () => {
  hamburgerMenu.classList.add('hidden');
  document.getElementById('btn-new').click();
});
document.getElementById('hmenu-open').addEventListener('click', () => {
  hamburgerMenu.classList.add('hidden');
  document.getElementById('btn-load').click();
});
document.getElementById('hmenu-examples').addEventListener('click', () => {
  hamburgerMenu.classList.add('hidden');
  document.getElementById('btn-examples').click();
});
document.getElementById('hmenu-export').addEventListener('click', () => {
  hamburgerMenu.classList.add('hidden');
  document.getElementById('btn-export').click();
});
document.getElementById('hmenu-activities').addEventListener('click', () => {
  hamburgerMenu.classList.add('hidden');
  showActivityModal();
});
document.getElementById('hmenu-settings').addEventListener('click', () => {
  hamburgerMenu.classList.add('hidden');
  document.getElementById('btn-settings').click();
});

document.getElementById('btn-new').addEventListener('click', () => {
  resetTree();
  workspace.clear();
  Blockly.serialization.workspaces.load(getDefaultState(), workspace);
  projectInput.value = '';
  window._exampleComment = null;
  if (window._tabManager) window._tabManager.loadTabs([]);
  if (window._clearActivityMeta) window._clearActivityMeta();
  showToast('Proyecto nuevo');
  updateUndoRedoButtons();
});

export function showToast(msg) {
  const old = document.querySelector('.toast'); if (old) old.remove();
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2000);
}

// ═══ Estado inicial ═══════════════════════════
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
                          block: { type: 'delay_ms', id: 'L5', fields: { MS: 1000 } }
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

// ═══ Referencias DOM compartidas ══════════════
const projectInput  = document.getElementById('project-name');
const projectList   = document.getElementById('project-list');
const examplesModal = document.getElementById('examples-modal');
const examplesList  = document.getElementById('examples-list');
const arduinoConsole  = document.getElementById('arduino-console');
const consoleOutput   = document.getElementById('console-output');
const btnConnect      = document.getElementById('serial-connect');
const btnConsoleToggle = document.getElementById('btn-console-toggle');
const serialBaud      = document.getElementById('serial-baud');
const btnUpload       = document.getElementById('btn-upload');
const resizer         = document.getElementById('panel-resizer');
const editorPanel     = document.getElementById('editor-panel');
const codePanel       = document.getElementById('code-panel');
const floatExpandBtn  = document.getElementById('float-expand-code');
const collapseBtn     = document.getElementById('btn-collapse-code');

const LS_PREFIX = 'ardublock:';
const LAST_KEY  = LS_PREFIX + '__last__';

// ═══ Inicializar módulos ══════════════════════

initProjectManager({
  workspace, projectInput, projectList, showToast, LS_PREFIX, LAST_KEY
});

initSettings({
  workspace, toolbox, updateCode, initValidator, serialBaud
});

// ── Selector de placa en toolbar ─────────────────
import { loadSettings, saveSettings } from './settings.js';

const boardSelector = document.getElementById('board-selector');
if (boardSelector) {
  // Sincronizar valor inicial desde settings
  boardSelector.value = getSetting('board');

  boardSelector.addEventListener('change', async () => {
    const fqbn = boardSelector.value;
    const s = loadSettings();
    s.board = fqbn;
    saveSettings(s);

    // Sincronizar settings modal
    const settingsBoard = document.getElementById('setting-board');
    if (settingsBoard) settingsBoard.value = fqbn;

    // Reconstruir toolbox
    if (window._rebuildToolbox) window._rebuildToolbox(fqbn);

    // Verificar compatibilidad con chip detectado
    try {
      const brd = await fetch('/api/boards').then(r => r.json());
      const ports = brd.detected_ports || [];
      for (const p of ports) {
        const matching = p.matching_boards || [];
        if (matching.length > 0) continue; // placa oficial identificada, todo bien
        const compat = p.compatible_fqbns || [];
        if (compat.length > 0 && !compat.includes(fqbn)) {
          const compatNames = compat.map(f => {
            const opt = boardSelector.querySelector(`option[value="${f}"]`);
            return opt ? opt.textContent : f;
          }).join(', ');
          showToast(`⚠ La placa "${boardSelector.options[boardSelector.selectedIndex]?.text || fqbn}" puede no ser compatible con el chip detectado (${p.chip_label || 'desconocido'}). Compatibles: ${compatNames}`);
        }
      }
    } catch (_) { /* ignorar */ }

    // Instalar cores/libs con feedback (solo lo que falte)
    const boardName = boardSelector.options[boardSelector.selectedIndex]?.text || fqbn;
    try {
      const res = await fetch('/api/board/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fqbn })
      });
      const data = await res.json();
      const results = data.results || [];
      const failed = results.filter(r => !r.success);
      const installed = results.filter(r => r.success && !r.already_installed);
      const skipped = data.skipped || 0;
      
      if (failed.length > 0) {
        console.warn('[ArduBlock] Fallos en instalación:', failed);
        if (installed.length > 0) {
          showToast(`⚠ ${installed.length} instalado(s), ${failed.length} fallo(s)`);
        } else {
          showToast(`⚠ ${failed.length} componente(s) fallaron. Revisa la Consola.`);
        }
      } else if (installed.length > 0) {
        showToast(`✅ ${boardName} lista (${installed.length} nuevo(s))`);
      } else if (skipped > 0) {
        // Todo ya estaba instalado — sin toast ruidoso
        console.log(`[ArduBlock] ${boardName}: ${skipped} dependencia(s) ya instaladas`);
      }
    } catch (e) {
      showToast('⚠ Error de conexión al instalar dependencias');
      console.warn('[ArduBlock] board/install:', e);
    }
  });
}

// ── Selector de nivel ──────────────────────────
const levelSelector = document.getElementById('level-selector');
if (levelSelector) {
  // Sincronizar valor inicial desde settings
  levelSelector.value = getSetting('level');

  levelSelector.addEventListener('change', () => {
    const level = parseInt(levelSelector.value, 10);
    const s = loadSettings();
    s.level = level;
    saveSettings(s);

    // Reconstruir toolbox con el nuevo nivel
    if (window._rebuildToolbox) {
      window._rebuildToolbox(getSetting('board'), level);
    }

    // Aplicar protección de nivel a los bloques cargados
    applyLevelProtection(level);

    showToast(`Nivel: ${levelSelector.options[levelSelector.selectedIndex]?.text || level}`);
  });
}

initSerial({
  arduinoConsole, consoleOutput, btnConnect, btnConsoleToggle, serialBaud
});

initUpload({
  workspace, arduinoConsole, btnConsoleToggle, consoleOutput, btnUpload
});

initExamples({
  workspace, examplesModal, examplesList, showToast, updateCode, projectInput
});

initActivities({
  workspace, showToast
});

function showActivityModal() {
  const activities = getActivityList();
  if (!activities.length) {
    showToast('No hay actividades disponibles');
    return;
  }

  const modal = document.getElementById('examples-modal');
  const list = document.getElementById('examples-list');
  const closeBtn = document.getElementById('examples-close');

  const lang = (() => {
    try { const s = JSON.parse(localStorage.getItem('ardublock:settings') || '{}'); return s.language || 'es'; }
    catch (_) { return 'es'; }
  })();

  const title = lang === 'es' ? '📋 Actividades — Fundación BH' : '📋 Activities — Fundación BH';
  const subtitle1 = lang === 'es' ? 'Tarea 1: Movimientos' : 'Task 1: Movements';
  const subtitle2 = lang === 'es' ? 'Tarea 2: Sensor Ultrasónico' : 'Task 2: Ultrasonic Sensor';

  let html = `<div class="example-category">${title}</div>`;
  html += `<div class="example-category" style="margin-top:0.5rem;font-size:0.8rem;opacity:0.7">${subtitle1}</div>`;

  // Tarea 1 (indices 0-4)
  for (let i = 0; i < 5 && i < activities.length; i++) {
    const a = activities[i];
    html += `<div class="example-item activity-click" data-idx="${i}">
      <span>${a.name}</span>
      <span class="example-desc">${a.description}</span>
    </div>`;
  }

  html += `<div class="example-category" style="margin-top:0.5rem;font-size:0.8rem;opacity:0.7">${subtitle2}</div>`;

  // Tarea 2 (indices 5-9)
  for (let i = 5; i < activities.length; i++) {
    const a = activities[i];
    html += `<div class="example-item activity-click" data-idx="${i}">
      <span>${a.name}</span>
      <span class="example-desc">${a.description}</span>
    </div>`;
  }

  list.innerHTML = html;
  modal.classList.remove('hidden');

  // Click handlers
  list.querySelectorAll('.activity-click').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.idx, 10);
      loadActivity(idx);
      modal.classList.add('hidden');
    });
  });

  // Close button
  closeBtn.onclick = () => modal.classList.add('hidden');

  // Click outside to close
  const outsideHandler = (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
      modal.removeEventListener('click', outsideHandler);
    }
  };
  modal.addEventListener('click', outsideHandler);
}

initResize({
  workspace, resizer, editorPanel, codePanel, floatExpandBtn, collapseBtn
});

// Tab manager: barra de tabs .ino + .h
initTabManager();
window._tabManager = { getTabs, loadTabs, setSketchName, setInoContent, getInoContent, setCodeTheme };
window.updateCode = updateCode;  // para que tab-manager refresque el .ino
window._showToast = showToast;   // para download.js y otros módulos

// Undo tree: historial completo del proyecto (workspace + tabs + nombre + placa)
initUndoTree({ workspace });
updateUndoRedoButtons();

// Activity protection: bloques protegidos + placeholders (backend)
initActivityProtection(workspace);

const activityBadge = document.getElementById('activity-badge');
const _origApply = (meta) => applyActivityMeta(workspace, meta);
const _origClear = () => clearActivityMeta();

window._activityMeta = () => getActivityMeta();
window._applyActivityMeta = (meta) => {
  _origApply(meta);
  activityBadge.classList.toggle('hidden', !isActivityLoaded());
};
window._clearActivityMeta = () => {
  _origClear();
  activityBadge.classList.add('hidden');
};
window._isActivityLoaded = isActivityLoaded;

// ═══ Toolbox dinámico: Motor AF solo si hay AFMotor_R4.h ═══
workspace.registerToolboxCategoryCallback('CAT_AFMOTOR', function(_ws) {
  const allBlocks = _ws.getAllBlocks(false);
  const hasAfmotor = allBlocks.some(b =>
    b.type === 'library_include' && b.getFieldValue('LIB') === 'AFMotor_R4.h'
  );
  if (!hasAfmotor) return [];

  return [
    { kind: 'block', type: 'afmotor_dc_create' },
    { kind: 'block', type: 'afmotor_dc_speed' },
    { kind: 'block', type: 'afmotor_dc_run' },
    { kind: 'block', type: 'afmotor_stepper_create' },
    { kind: 'block', type: 'afmotor_stepper_speed' },
    { kind: 'block', type: 'afmotor_stepper_step' },
  ];
});

// Refrescar toolbox cuando cambian los bloques
workspace.addChangeListener((event) => {
  if (event.type === Blockly.Events.BLOCK_CREATE ||
      event.type === Blockly.Events.BLOCK_DELETE ||
      event.type === Blockly.Events.BLOCK_CHANGE) {
    workspace.refreshToolboxSelection();
  }
});

// ═══ Carga inicial del workspace ══════════════
(function initWorkspace() {
  const lastName = localStorage.getItem(LAST_KEY);
  if (lastName) {
    const raw = localStorage.getItem(lsKey(lastName));
    if (raw) {
      try {
        const record = JSON.parse(raw);
        Blockly.serialization.workspaces.load(record.state, workspace);
        let displayName = record.name;
        if (!displayName.endsWith('.ino')) displayName += '.ino';
        projectInput.value = displayName;

        // Restaurar tabs .h del último proyecto
        if (window._tabManager) {
          window._tabManager.loadTabs(record.tabs || [], displayName);
        }

        // Restaurar metadatos de actividad
        if (record.activityMeta && window._applyActivityMeta) {
          window._applyActivityMeta(record.activityMeta);
        }

        return;
      } catch (e) {
        console.warn('[ArduBlock] Último proyecto corrupto, cargando default:', e.message);
      }
    }
  }

  try {
    Blockly.serialization.workspaces.load(getDefaultState(), workspace);
  } catch(e) {
    console.warn('[ArduBlock] Default state:', e.message);
  }
})();

// ═══ Validación pedagógica ═══════════════════
initValidator(workspace);

// ═══ Protección de nivel ══════════════════════
// Recorre todos los bloques y muestra advertencia si
// requieren un nivel superior al actual. No deshabilita.
export function applyLevelProtection(currentLevel) {
  const allBlocks = workspace.getAllBlocks(false);
  const levelNames = { 1: 'Básico', 2: 'Intermedio', 3: 'Avanzado' };

  for (const block of allBlocks) {
    const requiredLevel = getBlockLevel(block.type);
    if (requiredLevel > currentLevel) {
      block.setWarningText(
        `⚠ Este bloque es de nivel ${levelNames[requiredLevel]}. ` +
        `Cambia a ese nivel en el selector para verlo en la toolbox.`
      );
    } else {
      block.setWarningText(null);
    }
  }
}

// Aplicar protección al cargar y cada vez que se cargue
// un proyecto (Blockly.serialization.workspaces.load dispara
// eventos que terminan en este estado)
applyLevelProtection(getSetting('level'));

// Hook: después de cargar workspace (proyectos/ejemplos),
// re-aplicar protección. Usamos un listener genérico.
workspace.addChangeListener((event) => {
  if (event.type === Blockly.Events.FINISHED_LOADING) {
    applyLevelProtection(getSetting('level'));
  }
});

// Exponer para el hook del validador (que limpia warnings en cada cambio)
window._applyLevelProtection = () => applyLevelProtection(getSetting('level'));

// ═══ Diagnóstico del sistema ══════════════════
// Modal de instalación al cargar + modal de diagnóstico en menú hamburguesa

const cliInstallModal  = document.getElementById('cli-install-modal');
const cliInstallBtn    = document.getElementById('cli-install-btn');
const cliInstallLater  = document.getElementById('cli-install-later');
const cliInstallClose  = document.getElementById('cli-install-close');
const cliInstallStatus = document.getElementById('cli-install-status');
const cliInstallPlatform = document.getElementById('cli-install-platform');

const diagnosticsModal = document.getElementById('diagnostics-modal');
const diagnosticsBody  = document.getElementById('diagnostics-body');
const diagnosticsClose = document.getElementById('diagnostics-close');

function closeCliInstallModal() { cliInstallModal.classList.add('hidden'); }

[cliInstallLater, cliInstallClose].forEach(el => {
  if (el) el.addEventListener('click', closeCliInstallModal);
});

cliInstallModal?.addEventListener('click', (e) => {
  if (e.target === cliInstallModal) closeCliInstallModal();
});

async function installCliFromModal() {
  if (!cliInstallBtn) return;
  cliInstallBtn.disabled = true;
  cliInstallBtn.textContent = '⏳ Instalando...';
  cliInstallStatus.textContent = '';
  cliInstallStatus.className = '';
  try {
    const res = await fetch('/api/arduino-cli/install', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      cliInstallBtn.textContent = '✅ Instalado';
      cliInstallBtn.style.background = '#27ae60';
      cliInstallStatus.textContent = 'arduino-cli instalado correctamente.';
      cliInstallStatus.className = 'success';
      setTimeout(closeCliInstallModal, 2000);
    } else {
      cliInstallBtn.disabled = false;
      cliInstallBtn.textContent = '🔧 Reintentar';
      cliInstallStatus.textContent = 'Error: ' + (data.error || 'falló la instalación');
      cliInstallStatus.className = 'error';
    }
  } catch (e) {
    cliInstallBtn.disabled = false;
    cliInstallBtn.textContent = '🔧 Reintentar';
    cliInstallStatus.textContent = 'Error de conexión: ' + e.message;
    cliInstallStatus.className = 'error';
  }
}

cliInstallBtn?.addEventListener('click', installCliFromModal);

// Verificar al cargar la página
(async function checkCliOnLoad() {
  try {
    const res = await fetch('/api/arduino-cli/status');
    const data = await res.json();
    if (data.available) return;
    if (cliInstallModal && cliInstallPlatform) {
      cliInstallPlatform.textContent = data.can_auto_install
        ? `Plataforma: ${data.platform} — instalación automática disponible`
        : `Plataforma: ${data.platform} — requiere instalación manual`;
      if (!data.can_auto_install) {
        cliInstallBtn.textContent = '📖 Abrir guía de instalación';
        cliInstallBtn.onclick = () => window.open('https://arduino.github.io/arduino-cli/installation/', '_blank');
      }
      cliInstallModal.classList.remove('hidden');
    }
  } catch (_) { /* backend no disponible */ }
})();

// ═══ Modal de diagnóstico (menú hamburguesa) ═══

function closeDiagnostics() { diagnosticsModal?.classList.add('hidden'); }

diagnosticsClose?.addEventListener('click', closeDiagnostics);
diagnosticsModal?.addEventListener('click', (e) => {
  if (e.target === diagnosticsModal) closeDiagnostics();
});

async function openDiagnostics() {
  if (!diagnosticsModal || !diagnosticsBody) return;
  diagnosticsModal.classList.remove('hidden');
  diagnosticsBody.innerHTML = '<div class="diag-loading">⏳ Verificando...</div>';

  const [cliStatus, drivers, boards] = await Promise.allSettled([
    fetch('/api/arduino-cli/status').then(r => r.json()).catch(() => null),
    fetch('/api/drivers').then(r => r.json()).catch(() => null),
    fetch('/api/boards').then(r => r.json()).catch(() => null),
  ]);

  const cli = cliStatus.value;
  const drv = drivers.value;
  const brd = boards.value;

  let html = '';

  // ── arduino-cli ──
  html += '<div class="diag-section">';
  html += '<h3>🔧 arduino-cli</h3>';
  if (!cli) {
    html += '<div class="diag-row"><span>Backend no disponible</span><span class="diag-error">✕</span></div>';
  } else if (cli.available) {
    html += `<div class="diag-row"><span>Estado</span><span class="diag-ok">✓ Instalado</span></div>`;
    html += `<div class="diag-row"><span>Ruta</span><span style="font-size:0.7rem;opacity:0.7">${cli.path}</span></div>`;
  } else {
    html += `<div class="diag-row"><span>Estado</span><span class="diag-error">✕ No encontrado</span></div>`;
    if (cli.can_auto_install) {
      html += `<div class="diag-row"><span></span><button class="diag-btn install" id="diag-install-cli">⚡ Instalar ahora</button></div>`;
    } else {
      html += `<div class="diag-row"><span>Plataforma</span><span class="diag-warn">${cli.platform} — manual</span></div>`;
      html += `<div class="diag-row"><span></span><button class="diag-btn refresh" id="diag-manual-install">📖 Abrir guía</button></div>`;
    }
  }
  html += '</div>';

  // ── Drivers USB ──
  html += '<div class="diag-section">';
  html += '<h3>🔌 Drivers USB-Serial</h3>';
  if (!drv || drv.error) {
    html += `<div class="diag-row"><span>${drv?.error || 'No disponible'}</span><span class="diag-warn">⚠</span></div>`;
  } else if (!drv.ports || drv.ports.length === 0) {
    html += '<div class="diag-row"><span>Sin chips detectados</span><span class="diag-ok">✓</span></div>';
  } else {
    for (const p of drv.ports) {
      const icon = p.driver_needed ? '⚠' : '✓';
      const cls = p.driver_needed ? 'diag-warn' : 'diag-ok';
      html += `<div class="diag-row"><span>${p.chip} en ${p.address}</span><span class="${cls}">${icon} ${p.driver_needed ? 'Requiere driver' : 'OK'}</span></div>`;
      if (p.driver_needed) {
        html += `<div class="diag-row"><span></span><a href="${p.driver_url}" target="_blank" class="diag-btn install" style="text-decoration:none;display:inline-block">Descargar driver</a></div>`;
      }
    }
    if (drv.recommendations && drv.recommendations.length > 0) {
      html += '<div class="diag-recommendations">';
      for (const rec of drv.recommendations) {
        html += `<div>💡 ${rec}</div>`;
      }
      html += '</div>';
    }
  }
  html += '</div>';

  // ── Placas ──
  html += '<div class="diag-section">';
  html += '<h3>📟 Placas Arduino</h3>';
  if (!brd || brd.error) {
    html += `<div class="diag-row"><span>${brd?.error || 'No disponible'}</span><span class="diag-warn">⚠</span></div>`;
  } else if (!brd.detected_ports || brd.detected_ports.length === 0) {
    html += '<div class="diag-row"><span>No se detectó ningún Arduino</span><span class="diag-warn">—</span></div>';
    html += '<div class="diag-row"><span style="opacity:0.6">Conectalo por USB</span><span></span></div>';
  } else {
    for (const p of brd.detected_ports) {
      const addr = p.port?.address || p.address || '?';
      const boards = p.matching_boards || [];
      if (boards.length > 0) {
        const names = boards.map(b => b.name || b.fqbn).join(', ');
        html += `<div class="diag-row"><span>${addr}</span><span class="diag-ok">${names}</span></div>`;
      } else if (p.suggested_fqbn && p.compatible_fqbns) {
        // Clon no identificado — ofrecer selector de placa
        const currentBoard = boardSelector?.value || p.suggested_fqbn;
        const label = p.chip_label || 'Clon';
        html += `<div class="diag-row"><span>${addr}</span><span class="diag-warn">${label} — ¿qué placa es?</span></div>`;
        html += `<div class="diag-row" style="flex-wrap:wrap;gap:0.3rem">`;
        for (const f of p.compatible_fqbns) {
          const opt = boardSelector?.querySelector(`option[value="${f}"]`);
          const name = opt ? opt.textContent : f;
          const sel = f === currentBoard ? 'style="background:#27ae60;color:#fff"' : '';
          html += `<button class="diag-btn install diag-board-pick" data-fqbn="${f}" ${sel}>${name}</button>`;
        }
        html += `</div>`;
      } else {
        html += `<div class="diag-row"><span>${addr}</span><span>No identificada</span></div>`;
      }
    }
  }
  html += '</div>';

  html += `<div style="text-align:center;margin-top:0.5rem">
    <button class="diag-btn refresh" id="diag-refresh">🔄 Actualizar</button>
  </div>`;

  diagnosticsBody.innerHTML = html;

  // Event listeners para botones dentro del diagnóstico
  document.getElementById('diag-install-cli')?.addEventListener('click', async () => {
    const btn = document.getElementById('diag-install-cli');
    btn.disabled = true;
    btn.textContent = '⏳ Instalando...';
    try {
      const res = await fetch('/api/arduino-cli/install', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        btn.textContent = '✅ Listo';
        btn.style.background = '#27ae60';
        showToast('arduino-cli instalado');
        setTimeout(() => openDiagnostics(), 1500);
      } else {
        btn.textContent = '❌ Falló';
        showToast('Error: ' + (data.error || 'falló'));
      }
    } catch (e) {
      btn.textContent = '❌ Error';
    }
  });

  document.getElementById('diag-manual-install')?.addEventListener('click', () => {
    window.open('https://arduino.github.io/arduino-cli/installation/', '_blank');
  });

  document.getElementById('diag-refresh')?.addEventListener('click', openDiagnostics);

  // Botones de selección de placa en diagnóstico
  document.querySelectorAll('.diag-board-pick').forEach(btn => {
    btn.addEventListener('click', () => {
      const fqbn = btn.dataset.fqbn;
      if (boardSelector) {
        boardSelector.value = fqbn;
        boardSelector.dispatchEvent(new Event('change'));
      }
      // Actualizar estilo visual
      document.querySelectorAll('.diag-board-pick').forEach(b => {
        b.style.background = '';
        b.style.color = '';
      });
      btn.style.background = '#27ae60';
      btn.style.color = '#fff';
      showToast(`Placa cambiada a ${btn.textContent}`);
    });
  });
}

// Conectar menú hamburguesa
const hmenuDiagnostics = document.getElementById('hmenu-diagnostics');
hmenuDiagnostics?.addEventListener('click', () => {
  document.getElementById('hamburger-menu')?.classList.add('hidden');
  openDiagnostics();
});

// ═══ beforeunload: confirmar cierre con cambios sin guardar ═══
window.addEventListener('beforeunload', (e) => {
  if (isWorkspaceDirty() && projectInput.value.trim()) {
    e.preventDefault();
  }
});

// ═══ Aplicar idioma al DOM ═══════════════════
applyDOMLanguage();