/**
 * ArduBlock — Settings (renderer, fuentes, placa)
 *
 * loadSettings, saveSettings, getSetting, applySettings, applyPaletteTheme, applyRenderer.
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
  renderer: 'geras', level: 1,
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
    document.getElementById('board-selector').value = s.board;
    document.getElementById('level-selector').value = s.level;
    document.getElementById('setting-baud').value = s.baud;
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
  document.getElementById('setting-baud').addEventListener('change', function() { onSettingChange('baud', parseInt(this.value)); });
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
  applyPaletteTheme(document.documentElement.getAttribute('data-theme') || 'calcite');
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
  const hamburgerMenu = document.getElementById('hamburger-menu');
  if (hamburgerMenu) hamburgerMenu.style.fontSize = uiFont;
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
  document.querySelectorAll('.blocklyToolboxCategoryLabel, .blocklyToolboxCategory').forEach(el => {
    el.style.fontSize = toolboxFont;
  });
}

/**
 * Aplica el tema de Blockly + CodeMirror según la paleta activa.
 * Los colores CSS los maneja palettes.css vía el atributo data-theme.
 */
export function applyPaletteTheme(palette) {
  const isLight = palette === 'calcite';
  workspace.setTheme(isLight ? Blockly.Themes.Classic : DarkTheme);
  if (window._tabManager?.setCodeTheme) window._tabManager.setCodeTheme(!isLight);
}
if (typeof window !== 'undefined') window.__applyPaletteTheme = applyPaletteTheme;

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
