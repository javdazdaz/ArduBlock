/**
 * ArduBlock — Settings (tema, renderer, fuentes, placa)
 *
 * loadSettings, saveSettings, getSetting, applySettings, applyTheme, applyRenderer.
 */

import * as Blockly from 'blockly';
import DarkTheme from '@blockly/theme-dark';
import { WorkspaceSearch } from '@blockly/plugin-workspace-search';
import { Backpack } from '@blockly/workspace-backpack';
import { shadowBlockConversionChangeListener } from '@blockly/shadow-block-converter';
import { ScrollOptions } from '@blockly/plugin-scroll-options';
import { CrossTabCopyPaste } from '@blockly/plugin-cross-tab-copy-paste';
import { setLanguage, getLanguage } from './i18n.js';

export const SETTINGS_KEY = 'ardublock:settings';
export const defaultSettings = {
  board: 'arduino:avr:uno', baud: 9600,
  theme: 'dark', renderer: 'geras',
  fontUi: 14, fontCode: 13, fontSerial: 12, fontBlocks: 16, fontToolbox: 13
};

let workspace, toolbox, updateCodeFn, initValidatorFn, serialBaud;

export function initSettings(deps) {
  workspace       = deps.workspace;
  toolbox         = deps.toolbox;
  updateCodeFn    = deps.updateCode;
  initValidatorFn  = deps.initValidator;
  serialBaud      = deps.serialBaud;

  // Settings modal
  const settingsModal = document.getElementById('settings-modal');
  document.getElementById('btn-settings').addEventListener('click', () => {
    const s = loadSettings();
    document.getElementById('setting-board').value = s.board;
    document.getElementById('setting-baud').value = s.baud;
    document.getElementById('setting-theme').value = s.theme;
    document.getElementById('setting-renderer').value = s.renderer;
    document.getElementById('setting-language').value = getLanguage();
    document.getElementById('setting-font-ui').value = s.fontUi;
    document.getElementById('setting-font-code').value = s.fontCode;
    document.getElementById('setting-font-serial').value = s.fontSerial;
    document.getElementById('setting-font-blocks').value = s.fontBlocks;
    document.getElementById('setting-font-toolbox').value = s.fontToolbox;
    updateFontLabels();
    initSliderTracks();
    settingsModal.classList.remove('hidden');
  });

  document.getElementById('settings-close').addEventListener('click', () => settingsModal.classList.add('hidden'));
  settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); });

  // Selects & sliders: guardar y aplicar
  document.getElementById('setting-board').addEventListener('change', function() {
    const fqbn = this.value;
    onSettingChange('board', fqbn);

    // Sincronizar toolbar selector
    const toolbarSel = document.getElementById('board-selector');
    if (toolbarSel) toolbarSel.value = fqbn;

    // Reconstruir toolbox si está disponible
    if (window._rebuildToolbox) window._rebuildToolbox(fqbn);

    // Disparar instalación de cores/libs
    fetch('/api/board/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fqbn })
    }).catch(e => console.warn('[ArduBlock] board/install:', e));
  });
  document.getElementById('setting-baud').addEventListener('change', function() { onSettingChange('baud', parseInt(this.value)); });
  document.getElementById('setting-theme').addEventListener('change', function() { onSettingChange('theme', this.value, applyTheme); });
  document.getElementById('setting-renderer').addEventListener('change', function() {
    onSettingChange('renderer', this.value, r => { if (r !== workspace.options.renderer) applyRenderer(r); });
  });
  document.getElementById('setting-language').addEventListener('change', function() {
    setLanguage(this.value);
  });

  ['ui','code','serial','blocks','toolbox'].forEach(k => {
    const el = document.getElementById('setting-font-' + k);
    el.addEventListener('input', () => { updateFontLabels(); updateSliderTrack(el); });
    el.addEventListener('change', () => {
      onSettingChange('font' + k[0].toUpperCase() + k.slice(1), parseInt(el.value), () => applySettings());
    });
  });

  // Sync baud + apply on load
  serialBaud.value = getSetting('baud');

  const s = loadSettings();
  applyTheme(s.theme);
  applySettings(s);
  serialBaud.value = s.baud;
}

export function loadSettings() {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
  } catch(e) { return { ...defaultSettings }; }
}

export function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function getSetting(key) {
  return loadSettings()[key] ?? defaultSettings[key];
}

export function applySettings(s) {
  s = s || loadSettings();

  const uiFont = s.fontUi + 'px';
  document.querySelector('header').style.fontSize = uiFont;
  document.querySelector('.arduino-toolbar') && (document.querySelector('.arduino-toolbar').style.fontSize = uiFont);
  const codeFont = s.fontCode + 'px';
  document.getElementById('code-view-ino').style.fontSize = codeFont;
  document.getElementById('code-edit-h').style.fontSize = codeFont;
  document.getElementById('console-output').style.fontSize = s.fontSerial + 'px';

  const currentTheme = workspace.getTheme();
  if (currentTheme) {
    currentTheme.fontStyle = currentTheme.fontStyle || {};
    currentTheme.fontStyle.family = '"Fira Code", "Consolas", monospace';
    currentTheme.fontStyle.size = s.fontBlocks;
    currentTheme.fontStyle.weight = 'normal';
    workspace.setTheme(currentTheme);
  }

  const state = Blockly.serialization.workspaces.save(workspace);
  const constants = workspace.getRenderer().getConstants();
  if (constants) {
    constants.FIELD_TEXT_FONTSIZE = s.fontBlocks;
    constants.FIELD_BORDER_RECT_HEIGHT = s.fontBlocks + 8;
  }
  workspace.clear();
  Blockly.serialization.workspaces.load(state, workspace);

  const toolboxFont = s.fontToolbox + 'px';
  document.querySelectorAll('.blocklyToolboxCategoryLabel, .blocklyTreeRow, .blocklyTreeLabel').forEach(el => {
    el.style.fontSize = toolboxFont;
  });
}

export function applyTheme(theme) {
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
    if (window._tabManager?.setCodeTheme) window._tabManager.setCodeTheme(false);
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
    if (window._tabManager?.setCodeTheme) window._tabManager.setCodeTheme(true);
  }
}

export function applyRenderer(renderer) {
  const state = Blockly.serialization.workspaces.save(workspace);
  workspace.dispose();

  const newWs = Blockly.inject('blocklyDiv', {
    toolbox, theme: workspace.getTheme(), renderer,
    scrollbars: true, trashcan: true,
    zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 2.5, minScale: 0.3, scaleSpeed: 1.2, pinch: true },
    move: { scrollbars: true, drag: true, wheel: true }
  });
  Object.assign(workspace, newWs);
  Blockly.serialization.workspaces.load(state, workspace);

  new WorkspaceSearch(workspace).init();
  new Backpack(workspace).init();
  workspace.addChangeListener(shadowBlockConversionChangeListener);
  new ScrollOptions(workspace).init({ enableBlockDragging: true, enableScroll: true });
  new CrossTabCopyPaste().init({ contextMenu: true, shortcut: true });
  workspace.addChangeListener(updateCodeFn);
  updateCodeFn();
  if (initValidatorFn) initValidatorFn(workspace);
  applySettings();
}

export function updateSliderTrack(el) {
  const pct = ((el.value - el.min) / (el.max - el.min)) * 100;
  el.style.background = `linear-gradient(to right, var(--slider-fill) ${pct}%, var(--slider-track) ${pct}%)`;
}

export function initSliderTracks() {
  document.querySelectorAll('.setting-row input[type="range"]').forEach(updateSliderTrack);
}

export function updateFontLabels() {
  document.getElementById('setting-font-ui-val').textContent = document.getElementById('setting-font-ui').value + 'px';
  document.getElementById('setting-font-code-val').textContent = document.getElementById('setting-font-code').value + 'px';
  document.getElementById('setting-font-serial-val').textContent = document.getElementById('setting-font-serial').value + 'px';
  document.getElementById('setting-font-blocks-val').textContent = document.getElementById('setting-font-blocks').value + 'px';
  document.getElementById('setting-font-toolbox-val').textContent = document.getElementById('setting-font-toolbox').value + 'px';
}

function onSettingChange(key, value, applyFn) {
  const s = loadSettings(); s[key] = value; saveSettings(s);
  if (applyFn) applyFn(value);
}
