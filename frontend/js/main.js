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
import { initSettings }      from './settings.js';
import { initSerial }        from './serial.js';
import { initUpload }         from './upload.js';
import { initExamples }       from './examples.js';
import { initResize }         from './resize.js';
import { initTabManager, getTabs, loadTabs } from './tab-manager.js';
import { t, applyDOMLanguage } from './i18n.js';

// ═══ Toolbox ══════════════════════════════════
const toolbox = {
  'kind': 'categoryToolbox',
  'contents': [
    { 'kind': 'category', 'name': '%{BKY_CAT_ARDUINO}', 'colour': '230',
      'contents': [
        { 'kind': 'block', 'type': 'arduino_setup' },
        { 'kind': 'block', 'type': 'arduino_loop' },
        { 'kind': 'block', 'type': 'include_header' }
      ]},
    { 'kind': 'category', 'name': '%{BKY_CAT_PINES}', 'colour': '190',
      'contents': [
        { 'kind': 'block', 'type': 'pin_mode' },
        { 'kind': 'block', 'type': 'digital_write' },
        { 'kind': 'block', 'type': 'digital_read' },
        { 'kind': 'block', 'type': 'analog_write' },
        { 'kind': 'block', 'type': 'analog_read' },
        { 'kind': 'block', 'type': 'pulse_in' },
        { 'kind': 'block', 'type': 'attach_interrupt' }
      ]},
    { 'kind': 'category', 'name': '%{BKY_CAT_TIEMPO}', 'colour': '290',
      'contents': [
        { 'kind': 'block', 'type': 'delay_ms' },
        { 'kind': 'block', 'type': 'millis' }
      ]},
    { 'kind': 'category', 'name': '%{BKY_CAT_SONIDO}', 'colour': '260',
      'contents': [
        { 'kind': 'block', 'type': 'tone_output' },
        { 'kind': 'block', 'type': 'tone_duration' },
        { 'kind': 'block', 'type': 'no_tone_output' }
      ]},
    { 'kind': 'category', 'name': '%{BKY_CAT_LCD}', 'colour': '180',
      'contents': [
        { 'kind': 'block', 'type': 'lcd_create' },
        { 'kind': 'block', 'type': 'lcd_i2c_create' },
        { 'kind': 'block', 'type': 'lcd_print' },
        { 'kind': 'block', 'type': 'lcd_set_cursor' },
        { 'kind': 'block', 'type': 'lcd_clear' }
      ]},
    { 'kind': 'category', 'name': '%{BKY_CAT_SENSORES}', 'colour': '100',
      'contents': [
        { 'kind': 'block', 'type': 'dht_create' },
        { 'kind': 'block', 'type': 'dht_temp' },
        { 'kind': 'block', 'type': 'dht_humidity' },
        { 'kind': 'block', 'type': 'ultrasonic_create' },
        { 'kind': 'block', 'type': 'ultrasonic_read' }
      ]},
    { 'kind': 'category', 'name': '%{BKY_CAT_MOTOR}', 'colour': '310',
      'contents': [
        { 'kind': 'block', 'type': 'stepper_create' },
        { 'kind': 'block', 'type': 'stepper_speed' },
        { 'kind': 'block', 'type': 'stepper_step' }
      ]},
    { 'kind': 'category', 'name': '%{BKY_CAT_SERVO}', 'colour': '40',
      'contents': [
        { 'kind': 'block', 'type': 'servo_create' },
        { 'kind': 'block', 'type': 'servo_write' },
        { 'kind': 'block', 'type': 'servo_write_us' }
      ]},
    { 'kind': 'category', 'name': '%{BKY_CAT_SERIAL}', 'colour': '120',
      'contents': [
        { 'kind': 'block', 'type': 'serial_begin' },
        { 'kind': 'block', 'type': 'serial_print' },
        { 'kind': 'block', 'type': 'serial_println' }
      ]},
    { 'kind': 'sep' },
    { 'kind': 'category', 'name': '%{BKY_CAT_LOGICA}', 'colour': '210',
      'contents': [
        { 'kind': 'block', 'type': 'controls_if' },
        { 'kind': 'block', 'type': 'logic_compare' },
        { 'kind': 'block', 'type': 'logic_operation' },
        { 'kind': 'block', 'type': 'logic_negate' },
        { 'kind': 'block', 'type': 'logic_boolean' }
      ]},
    { 'kind': 'category', 'name': '%{BKY_CAT_BUCLES}', 'colour': '120',
      'contents': [
        { 'kind': 'block', 'type': 'controls_repeat_ext' },
        { 'kind': 'block', 'type': 'controls_whileUntil' },
        { 'kind': 'block', 'type': 'arduino_for_index' }
      ]},
    { 'kind': 'category', 'name': '%{BKY_CAT_MATEMATICAS}', 'colour': '230',
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
    { 'kind': 'category', 'name': '%{BKY_CAT_VARIABLES}', 'colour': '330',
      'contents': [
        { 'kind': 'block', 'type': 'variable_declare' },
        { 'kind': 'block', 'type': 'variable_set' },
        { 'kind': 'block', 'type': 'variable_get' }
      ]},
    { 'kind': 'category', 'name': '%{BKY_CAT_ARRAYS}', 'colour': '330',
      'contents': [
        { 'kind': 'block', 'type': 'array_declare' },
        { 'kind': 'block', 'type': 'array_get' },
        { 'kind': 'block', 'type': 'array_length' }
      ]},
    { 'kind': 'category', 'name': '%{BKY_CAT_FUNCTIONS}', 'colour': '290', 'custom': 'PROCEDURE' },
    { 'kind': 'category', 'name': '%{BKY_CAT_TEXTO}', 'colour': '160',
      'contents': [
        { 'kind': 'block', 'type': 'text' },
        { 'kind': 'block', 'type': 'text_join' },
        { 'kind': 'block', 'type': 'text_print' },
        { 'kind': 'block', 'type': 'text_length' }
      ]},
    { 'kind': 'search', 'name': '%{BKY_CAT_BUSCAR}', 'contents': [] }
  ]
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
const codeOutput = document.getElementById('code-output');
const lineCount  = document.getElementById('line-count');

export function updateCode() {
  try {
    let code = generateArduinoCode(workspace);
    if (window._exampleComment) code = window._exampleComment + '\n' + code;
    codeOutput.textContent = code;
    lineCount.textContent = code.split('\n').length + ' ' + t('panel_lines');
  } catch (e) {
    codeOutput.textContent = '// Error: ' + e.message;
    lineCount.textContent = 'error';
  }
}
workspace.addChangeListener(updateCode);
updateCode();

document.getElementById('btn-copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(codeOutput.textContent); showToast(t('toast_copied')); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = codeOutput.textContent; ta.style.cssText = 'position:fixed;opacity:0';
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
window._tabManager = { getTabs, loadTabs };
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
        projectInput.value = record.name;

        // Restaurar tabs .h del último proyecto
        if (window._tabManager) {
          window._tabManager.loadTabs(record.tabs || []);
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