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
import { initProjectManager, lsKey } from './project-manager.js';
import { initSettings, getSetting } from './settings.js';
import { initSerial }        from './serial.js';
import { initUpload }         from './upload.js';
import { initExamples }       from './examples.js';
import { initResize }         from './resize.js';
import { initTabManager, getTabs, loadTabs, setSketchName, setInoContent, getInoContent, setCodeTheme } from './tab-manager.js';
import { t, applyDOMLanguage } from './i18n.js';

// ═══ Toolbox ══════════════════════════════════
import { buildToolboxForBoard } from './blocks.js';

const toolbox = buildToolboxForBoard(getSetting('board'));

// Función para reconstruir toolbox al cambiar de placa
window._rebuildToolbox = function(fqbn) {
  const newToolbox = buildToolboxForBoard(fqbn);
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

document.getElementById('btn-new').addEventListener('click', () => {
  workspace.clear();
  Blockly.serialization.workspaces.load(getDefaultState(), workspace);
  projectInput.value = '';
  window._exampleComment = null;
  if (window._tabManager) window._tabManager.loadTabs([]);
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

// ═══ Aplicar idioma al DOM ═══════════════════
applyDOMLanguage();