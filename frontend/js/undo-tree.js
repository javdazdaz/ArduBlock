/**
 * ArduBlock — Árbol de Undo/Redo (Backend de Historial)
 *
 * Mantiene un árbol de snapshots del proyecto completo.
 * Cada nodo guarda: workspace Blockly, tabs .h, nombre, placa, nivel.
 *
 * Árbol (no pila lineal):
 *   - undo() → sube al padre
 *   - redo() → baja al último hijo
 *   - push() desde un nodo con hijos crea una nueva rama
 *   - Las ramas alternativas se preservan (no se pierden)
 *
 * Persiste en localStorage bajo LS_KEY. Límite: MAX_NODES snapshots.
 */

import * as Blockly from 'blockly';

const LS_KEY = 'ardublock:undo-tree';
const MAX_NODES = 30;

// ═══ Tipos ═════════════════════════════════════

/**
 * @typedef {Object} TreeNode
 * @property {string} id
 * @property {string|null} parentId
 * @property {string[]} children — ids ordenados por antigüedad (último = más reciente)
 * @property {Snapshot} state
 * @property {number} timestamp
 */

/**
 * @typedef {Object} Snapshot
 * @property {Object} workspace — Blockly serialization JSON
 * @property {Array<{filename:string, content:string}>} tabs
 * @property {string} name — nombre del proyecto (.ino)
 * @property {string} board — FQBN de la placa
 * @property {string} level — 'basic' | 'intermediate' | 'advanced'
 * @property {Object|null} activityMeta
 */

// ═══ Estado interno ════════════════════════════

/** @type {Map<string, TreeNode>} */
let nodes = new Map();

/** @type {string} */
let rootId = null;

/** @type {string} */
let currentId = null;

let workspace = null;       // referencia al workspace Blockly

// Debounce: no pushear más de una vez cada COOLDOWN_MS
const COOLDOWN_MS = 2500;
let lastPushTime = 0;
let pendingPush = null;
let restoring = false;  // suprime push durante restoreSnapshot

// ═══ Persistencia ══════════════════════════════

function saveTree() {
  try {
    const data = {
      rootId,
      currentId,
      nodes: Array.from(nodes.entries()),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[UndoTree] No se pudo guardar el árbol:', e.message);
  }
}

function loadTree() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    rootId = data.rootId;
    currentId = data.currentId;
    nodes = new Map(data.nodes);
    return nodes.size > 0;
  } catch (e) {
    console.warn('[UndoTree] No se pudo cargar el árbol:', e.message);
    return false;
  }
}

// ═══ Operaciones del árbol ════════════════════

/**
 * Captura el estado actual del proyecto.
 * @returns {Snapshot}
 */
function captureState() {
  if (!workspace) return null;
  const state = Blockly.serialization.workspaces.save(workspace);
  const name = document.getElementById('project-name')?.value?.trim() || 'sin-nombre';
  const board = (() => {
    try {
      const raw = localStorage.getItem('ardublock:settings');
      return raw ? JSON.parse(raw).board || 'arduino:avr:uno' : 'arduino:avr:uno';
    } catch (_) { return 'arduino:avr:uno'; }
  })();
  const level = (() => {
    try {
      const raw = localStorage.getItem('ardublock:settings');
      return raw ? JSON.parse(raw).level || 'basic' : 'basic';
    } catch (_) { return 'basic'; }
  })();
  const tabs = window._tabManager ? window._tabManager.getTabs() : [];
  const activityMeta = window._activityMeta ? window._activityMeta() : null;

  return { workspace: state, tabs, name, board, level, activityMeta };
}

/**
 * Compara dos snapshots para decidir si son idénticos.
 */
function statesEqual(a, b) {
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Crea un nodo raíz con el estado inicial.
 */
function createRoot() {
  const id = _uid();
  const node = {
    id,
    parentId: null,
    children: [],
    state: captureState() || { workspace: {}, tabs: [], name: 'sin-nombre', board: 'arduino:avr:uno', level: 'basic', activityMeta: null },
    timestamp: Date.now(),
  };
  nodes.set(id, node);
  rootId = id;
  currentId = id;
  saveTree();
}

/**
 * Elimina los nodos más antiguos si se excede MAX_NODES.
 * Preserva la rama activa (camino de root → current).
 */
function pruneOldNodes() {
  if (nodes.size <= MAX_NODES) return;

  // Recolectar ids en la rama activa
  const activeSet = new Set();
  let cursor = currentId;
  while (cursor) {
    activeSet.add(cursor);
    const node = nodes.get(cursor);
    cursor = node ? node.parentId : null;
  }

  // Eliminar nodos no activos, más antiguos primero
  const candidates = [];
  for (const [id, node] of nodes) {
    if (!activeSet.has(id)) {
      candidates.push({ id, timestamp: node.timestamp });
    }
  }
  candidates.sort((a, b) => a.timestamp - b.timestamp);

  const toRemove = candidates.slice(0, nodes.size - MAX_NODES);
  for (const { id } of toRemove) {
    // Quitar de children del padre
    const node = nodes.get(id);
    if (node && node.parentId) {
      const parent = nodes.get(node.parentId);
      if (parent) {
        parent.children = parent.children.filter(cid => cid !== id);
      }
    }
    nodes.delete(id);
  }
}

/**
 * Push: agrega un nuevo snapshot como hijo del nodo actual.
 * Si current ya tiene hijos, la nueva rama se agrega como
 * un hijo adicional (branching).
 *
 * @param {Snapshot} state
 * @returns {string} id del nuevo nodo
 */
function pushState(state) {
  if (!state) return null;

  const current = nodes.get(currentId);
  if (!current) { createRoot(); return pushState(state); }

  // Si el estado es igual al actual, no crear nodo
  if (statesEqual(state, current.state)) return currentId;

  const id = _uid();
  const node = {
    id,
    parentId: currentId,
    children: [],
    state,
    timestamp: Date.now(),
  };

  nodes.set(id, node);
  current.children.push(id);
  currentId = id;

  pruneOldNodes();
  saveTree();
  return id;
}

/**
 * Debounced push: llama a pushState tras COOLDOWN_MS de inactividad.
 * Si se llama antes, resetea el timer.
 */
export function schedulePush() {
  if (restoring) return;
  const now = Date.now();
  // Si ya pasó el cooldown, pushear inmediatamente
  if (now - lastPushTime >= COOLDOWN_MS) {
    lastPushTime = now;
    clearTimeout(pendingPush);
    pendingPush = setTimeout(() => {
      const state = captureState();
      if (state) pushState(state);
    }, COOLDOWN_MS);
  } else {
    // Extender el timer
    clearTimeout(pendingPush);
    pendingPush = setTimeout(() => {
      const state = captureState();
      if (state) pushState(state);
      lastPushTime = Date.now();
    }, COOLDOWN_MS);
  }
}

/**
 * Forzar push inmediato (ej: al cambiar de proyecto, antes de cargar).
 */
export function forcePush() {
  clearTimeout(pendingPush);
  const state = captureState();
  if (state) pushState(state);
  lastPushTime = Date.now();
}

// ═══ Navegación ═══════════════════════════════

/**
 * Undo: retrocede al nodo padre.
 * @returns {Snapshot|null} estado a restaurar, o null si no hay undo
 */
export function undo() {
  const current = nodes.get(currentId);
  if (!current || !current.parentId) return null;

  currentId = current.parentId;
  saveTree();
  return nodes.get(currentId).state;
}

/**
 * Redo: avanza al último hijo del nodo actual.
 * @returns {Snapshot|null} estado a restaurar, o null si no hay redo
 */
export function redo() {
  const current = nodes.get(currentId);
  if (!current || !current.children.length) return null;

  // Último hijo = más reciente
  currentId = current.children[current.children.length - 1];
  saveTree();
  return nodes.get(currentId).state;
}

/**
 * ¿Hay undo disponible?
 */
export function canUndo() {
  const current = nodes.get(currentId);
  return !!(current && current.parentId);
}

/**
 * ¿Hay redo disponible?
 */
export function canRedo() {
  const current = nodes.get(currentId);
  return !!(current && current.children.length > 0);
}

// ═══ API de ramas (inspección, no navegación) ═

/**
 * Devuelve los ids de los hijos alternativos del nodo actual
 * (todos menos el último, que es por donde avanza redo).
 */
export function getAlternateBranches() {
  const current = nodes.get(currentId);
  if (!current || current.children.length <= 1) return [];
  return current.children.slice(0, -1).map(id => ({
    id,
    timestamp: nodes.get(id)?.timestamp || 0,
  }));
}

/**
 * Salta a una rama alternativa por id.
 */
export function jumpToBranch(nodeId) {
  if (!nodes.has(nodeId)) return null;
  currentId = nodeId;
  saveTree();
  return nodes.get(currentId).state;
}

/**
 * Número total de nodos en el árbol.
 */
export function treeSize() {
  return nodes.size;
}

// ═══ Gestión del ciclo de vida ════════════════

/**
 * Inicializa el árbol de undo. Carga del localStorage o crea raíz.
 * @param {Object} deps
 * @param {Object} deps.workspace — workspace Blockly
 */
export function initUndoTree(deps) {
  workspace = deps.workspace;

  if (!loadTree()) {
    createRoot();
  }

  // Escuchar cambios en el workspace para schedulear push
  workspace.addChangeListener(() => {
    schedulePush();
  });

  // Escuchar cambios en el nombre del proyecto
  const projectInput = document.getElementById('project-name');
  if (projectInput) {
    projectInput.addEventListener('input', () => {
      schedulePush();
    });
  }
}

/**
 * Reinicia el árbol (nuevo proyecto).
 */
export function resetTree() {
  nodes.clear();
  rootId = null;
  currentId = null;
  clearTimeout(pendingPush);
  createRoot();
}

/**
 * Restaura un snapshot completo en el workspace y tabs.
 * No modifica el árbol — solo aplica el estado.
 * @param {Snapshot} snap
 */
export function restoreSnapshot(snap) {
  if (!snap || !workspace) return;

  restoring = true;

  // Workspace
  workspace.clear();
  Blockly.serialization.workspaces.load(snap.workspace, workspace);

  // Tabs .h
  if (window._tabManager) {
    window._tabManager.loadTabs(snap.tabs || [], snap.name || 'sketch.ino');
  }

  // Nombre del proyecto
  const projectInput = document.getElementById('project-name');
  if (projectInput) {
    projectInput.value = snap.name || '';
  }

  // Activity metadata
  if (window._clearActivityMeta) window._clearActivityMeta();
  if (snap.activityMeta && window._applyActivityMeta) {
    window._applyActivityMeta(snap.activityMeta);
  }

  // Board y level: actualizar settings en localStorage sin recargar
  if (snap.board || snap.level) {
    try {
      const raw = localStorage.getItem('ardublock:settings') || '{}';
      const s = JSON.parse(raw);
      if (snap.board) s.board = snap.board;
      if (snap.level) s.level = snap.level;
      localStorage.setItem('ardublock:settings', JSON.stringify(s));
    } catch (_) { /* ignorar */ }
  }

  restoring = false;
}

// ═══ Helpers ══════════════════════════════════

let _uidCounter = 0;
function _uid() {
  return `u${Date.now().toString(36)}_${(_uidCounter++).toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
