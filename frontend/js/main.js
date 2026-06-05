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
document.getElementById('hmenu-settings').addEventListener('click', () => {
  hamburgerMenu.classList.add('hidden');
  document.getElementById('btn-settings').click();
});

document.getElementById('btn-new').addEventListener('click', () => {
  workspace.clear();
  Blockly.serialization.workspaces.load(getDefaultState(), workspace);
  projectInput.value = '';
  window._exampleComment = null;
  if (window._tabManager) window._tabManager.loadTabs([]);
  if (window._clearActivityMeta) window._clearActivityMeta();
  showToast('Proyecto nuevo');
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

    // Instalar cores/libs con feedback
    const boardName = boardSelector.options[boardSelector.selectedIndex]?.text || fqbn;
    showToast(`Instalando ${boardName}...`);
    try {
      const res = await fetch('/api/board/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fqbn })
      });
      const data = await res.json();
      const failed = (data.results || []).filter(r => !r.success);
      if (failed.length === 0) {
        showToast('✅ Placa lista');
      } else {
        showToast(`⚠ ${failed.length} componente(s) fallaron. Revisa la Consola.`);
        console.warn('[ArduBlock] Fallos en instalación:', failed);
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

initResize({
  workspace, resizer, editorPanel, codePanel, floatExpandBtn, collapseBtn
});

// Tab manager: barra de tabs .ino + .h
initTabManager();
window._tabManager = { getTabs, loadTabs, setSketchName, setInoContent, getInoContent, setCodeTheme };
window.updateCode = updateCode;  // para que tab-manager refresque el .ino
window._showToast = showToast;   // para download.js y otros módulos

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

// ═══ beforeunload: confirmar cierre con cambios sin guardar ═══
window.addEventListener('beforeunload', (e) => {
  if (isWorkspaceDirty() && projectInput.value.trim()) {
    e.preventDefault();
  }
});

// ═══ Aplicar idioma al DOM ═══════════════════
applyDOMLanguage();