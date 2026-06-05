/**
 * ArduBlock — Sistema de Actividades (Backend)
 *
 * Aplica protección a bloques marcados como protegidos o placeholders
 * cuando se carga un proyecto con metadatos de actividad.
 *
 * Sin UI de creación — el docente define la metadata externamente.
 * En el futuro, una herramienta con cuentas permitirá crearlas
 * visualmente.
 *
 * Formato de activityMeta:
 *   { protected: [id1, id2], placeholders: [id3, id4] }
 *
 * - protected: bloque fijo, no se borra ni mueve ni edita
 * - placeholder: bloque shadow que el alumno debe reemplazar,
 *   se puede mover pero no borrar
 */

import * as Blockly from 'blockly';

// ═══ Estado ══════════════════════════════════════

let workspace = null;
let activityMeta = null;  // { protected: Set<id>, placeholders: Set<id> }
let cssInjected = false;

// ═══ CSS de indicadores visuales ════════════════

function injectStyles() {
  if (cssInjected) return;
  cssInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    .ardublock-protected > .blocklyBlockBackground {
      stroke: #3498db !important;
      stroke-width: 3px !important;
    }
    .ardublock-placeholder > .blocklyBlockBackground {
      stroke: #f39c12 !important;
      stroke-width: 3px !important;
      stroke-dasharray: 6, 3 !important;
    }
    .ardublock-lock-badge {
      position: absolute; top: -8px; right: -8px;
      width: 18px; height: 18px;
      background: #3498db; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; color: #fff; z-index: 10;
      pointer-events: none; box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    .ardublock-placeholder-badge {
      position: absolute; top: -8px; right: -8px;
      width: 18px; height: 18px;
      background: #f39c12; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; color: #fff; z-index: 10;
      pointer-events: none; box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
  `;
  document.head.appendChild(style);
}

// ═══ Badges ══════════════════════════════════════

const badgeMap = new Map();

function addBadge(block, type) {
  removeBadge(block.id);
  const svg = block.getSvgRoot();
  if (!svg) return;
  svg.style.position = 'relative';

  const badge = document.createElement('div');
  badge.className = type === 'placeholder'
    ? 'ardublock-placeholder-badge' : 'ardublock-lock-badge';
  badge.textContent = type === 'placeholder' ? '⬡' : '🔒';
  badge.title = type === 'placeholder'
    ? 'Placeholder: reemplazá este bloque con tu solución'
    : 'Bloque protegido por el docente';

  svg.appendChild(badge);
  badgeMap.set(block.id, badge);
}

function removeBadge(blockId) {
  const b = badgeMap.get(blockId);
  if (b) { b.remove(); badgeMap.delete(blockId); }
}

// ═══ Aplicar / remover protección ═══════════════

function protectBlock(block) {
  if (!activityMeta) return;
  const id = block.id;

  if (activityMeta.protected.has(id)) {
    block.setDeletable(false);
    block.setMovable(false);
    block.setEditable(false);
    block.getSvgRoot()?.classList.add('ardublock-protected');
    addBadge(block, 'protected');
  } else if (activityMeta.placeholders.has(id)) {
    block.setDeletable(false);
    block.setMovable(true);
    block.setEditable(false);
    block.getSvgRoot()?.classList.add('ardublock-placeholder');
    addBadge(block, 'placeholder');
  }
}

function unprotectBlock(block) {
  block.setDeletable(true);
  block.setMovable(true);
  block.setEditable(true);
  block.getSvgRoot()?.classList.remove('ardublock-protected', 'ardublock-placeholder');
  removeBadge(block.id);
}

function applyAll() {
  if (!workspace || !activityMeta) return;
  for (const block of workspace.getAllBlocks(false)) {
    protectBlock(block);
  }
}

function clearAll() {
  if (!workspace) return;
  for (const block of workspace.getAllBlocks(false)) {
    unprotectBlock(block);
  }
}

// ═══ API pública ═════════════════════════════════

export function initActivityProtection(ws) {
  workspace = ws;
  injectStyles();

  // Re-aplicar protección tras cargar un workspace
  workspace.addChangeListener((event) => {
    if (event.type === Blockly.Events.FINISHED_LOADING) {
      applyAll();
    }
  });
}

export function getActivityMeta() {
  if (!activityMeta) return null;
  return {
    protected: Array.from(activityMeta.protected),
    placeholders: Array.from(activityMeta.placeholders),
  };
}

export function applyActivityMeta(ws, meta) {
  clearAll();
  if (!meta || (!meta.protected?.length && !meta.placeholders?.length)) {
    activityMeta = null;
    return;
  }
  activityMeta = {
    protected: new Set(meta.protected || []),
    placeholders: new Set(meta.placeholders || []),
  };
  applyAll();
}

export function clearActivityMeta() {
  clearAll();
  activityMeta = null;
}

export function isActivityLoaded() {
  return activityMeta !== null;
}
