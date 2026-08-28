/**
 * ArduBlock — Gestión de Proyectos (localStorage + servidor)
 *
 * Guest mode: localStorage en el navegador.
 * Usuario logueado: API REST del servidor (/api/projects).
 */

import * as Blockly from 'blockly';
import { captureWorkspaceThumbnail } from './thumbnail.js';
import { restoreWorkspaceState } from './workspace-restore.js';
import { csrfFetch } from './csrf.js';

let workspace, projectInput, projectList, showToast;
let LS_PREFIX, LAST_KEY, autoSaveTimer;
let workspaceDirty = false;
let currentProjectId = null;  // ID del proyecto actual en servidor
let readOnly = false;         // modo solo-lectura (profesor viendo proyecto de alumno)
let currentClassId = null;    // clase en la que se crean proyectos (?class=)
let teacherEditId = null;     // id del proyecto de alumno en edición docente
let currentRevision = null;   // revisión confirmada por el servidor
let conflictState = null;     // copia local y proyecto remoto en conflicto
let saveInFlight = false;

export function cancelAutoSave() { clearTimeout(autoSaveTimer); }

export function resetCurrentProject() {
  currentProjectId = null;
  teacherEditId = null;
  currentRevision = null;
  conflictState = null;
  setReadOnly(false);
  delete projectInput?.dataset?.projectId;
}

export function setClassId(id) { currentClassId = id; }

export function isReadOnly() { return readOnly; }

function refreshButtons() {
  const save = document.getElementById('btn-save');
  const del = document.getElementById('btn-delete');
  // Solo-lectura: guardar y eliminar deshabilitados.
  // Edición docente: guardar habilitado, eliminar deshabilitado (no borrar trabajo ajeno).
  if (save) save.disabled = readOnly;
  if (del) del.disabled = readOnly || teacherEditId != null;
}

export function setReadOnly(v) {
  readOnly = v;
  refreshButtons();
}

export function initProjectManager(deps) {
  workspace     = deps.workspace;
  projectInput  = deps.projectInput;
  projectList   = deps.projectList;
  showToast     = deps.showToast;
  LS_PREFIX     = deps.LS_PREFIX;
  LAST_KEY      = deps.LAST_KEY;

  document.getElementById('btn-save').addEventListener('click', () => saveProject());
  document.getElementById('btn-load').addEventListener('click', toggleProjectList);
  document.getElementById('btn-delete').addEventListener('click', () => {
    const name = getProjectName();
    if (!projectInput.value.trim()) { showToast('Escriba el nombre del proyecto a eliminar'); return; }
    deleteProject(name);
  });
  document.getElementById('conflict-reload')?.addEventListener('click', reloadConflictRemote);
  document.getElementById('conflict-save-copy')?.addEventListener('click', saveConflictCopy);
  document.getElementById('conflict-cancel')?.addEventListener('click', closeConflictDialog);

  document.addEventListener('click', (e) => {
    if (!projectList.classList.contains('hidden') &&
        !e.target.closest('#btn-load') && !e.target.closest('#project-list')) {
      projectList.classList.add('hidden');
    }
  });

  autoSaveTimer = null;
  workspace.addChangeListener(() => {
    workspaceDirty = true;
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      if (readOnly) { workspaceDirty = false; return; }
      const name = projectInput.value.trim();
      if (name) saveProject(name);
    }, 2000);
  });

  projectInput.addEventListener('input', () => {
    const name = projectInput.value.trim();
    if (window._tabManager && name) window._tabManager.setSketchName(name);
  });
}


// ═══ Helpers ═════════════════════════════════════

export function getProjectName() { return projectInput.value.trim(); }

function lsKey(name) {
  const sanitized = name.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-.]/g, '').substring(0, 64) || 'sin-nombre';
  return LS_PREFIX + sanitized;
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function isGuest() { return window.IS_GUEST_MODE !== false; }


// ═══ Save ════════════════════════════════════════

export async function saveProject(name) {
  if (readOnly) { showToast('Solo lectura: no se puede guardar'); return; }
  if (saveInFlight) { workspaceDirty = true; return; }
  name = name || getProjectName();
  if (!name.endsWith('.ino')) name += '.ino';
  projectInput.value = name;

  const state = Blockly.serialization.workspaces.save(workspace);
  const tabs = window._tabManager ? window._tabManager.getTabs() : [];
  const record = { name, state, tabs };

  if (isGuest()) {
    record.saved = Date.now();
    try {
      localStorage.setItem(lsKey(name), JSON.stringify(record));
      localStorage.setItem(LAST_KEY, name);
      showToast(`Proyecto "${name}" guardado (local)`);
    } catch (e) { showToast('Error al guardar: memoria llena'); }
    return;
  }

  // Usuario logueado: API
  saveInFlight = true;
  try {
    // Edición docente → endpoint de profesor; proyecto propio → endpoint normal.
    const method = 'PUT';
    const url = teacherEditId
      ? `/api/teacher/projects/${teacherEditId}`
      : (currentProjectId ? `/api/projects/${currentProjectId}` : '/api/projects');
    const isCreate = !teacherEditId && !currentProjectId;
    const thumbnail = await captureWorkspaceThumbnail(workspace);
    const body = { name, data: record, thumbnail };
    if (isCreate && currentClassId) body.class_id = currentClassId;
    if (!isCreate && currentRevision != null) body.revision = currentRevision;
    const res = await csrfFetch(url, {
      method: isCreate ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const saved = await res.json();
      if (isCreate) currentProjectId = saved.id;
      currentRevision = saved.revision ?? 1;
      conflictState = null;
      workspaceDirty = false;
      projectInput.dataset.projectId = teacherEditId || currentProjectId || '';
      showToast(teacherEditId
        ? `Trabajo del estudiante guardado`
        : `Proyecto "${name}" guardado en servidor`);
      localStorage.setItem(LAST_KEY, name);
    } else if (res.status === 409) {
      const conflict = await res.json();
      conflictState = {
        localRecord: record,
        remoteProject: conflict.project,
        remoteRevision: conflict.current_revision,
      };
      workspaceDirty = true;
      cancelAutoSave();
      openConflictDialog(conflict.current_revision);
    } else {
      showToast('Error al guardar en servidor');
    }
  } catch (e) { workspaceDirty = true; showToast('Error de conexión al guardar'); }
  finally { saveInFlight = false; }
}


// ═══ Load ════════════════════════════════════════

export function loadProjectByName(name) { loadProject(name); }

export async function loadProject(idOrName) {
  if (!idOrName) return;
  teacherEditId = null;

  let record;
  if (isGuest() || typeof idOrName === 'string') {
    // localStorage
    currentRevision = null;
    try {
      const raw = localStorage.getItem(lsKey(idOrName));
      if (!raw) { showToast(`Proyecto "${idOrName}" no encontrado`); return; }
      record = JSON.parse(raw).state ? JSON.parse(raw) : JSON.parse(raw).data;
      if (!record.state) record = JSON.parse(raw);
    } catch (e) { showToast(`Error al cargar`); return; }
  } else {
    // Servidor
    try {
      const res = await fetch(`/api/projects/${idOrName}`);
      if (!res.ok) { showToast('Proyecto no encontrado'); return; }
      const p = await res.json();
      record = typeof p.data === 'string' ? JSON.parse(p.data) : p.data;
      currentRevision = p.revision ?? 1;
    } catch (e) { showToast('Error de conexión al cargar'); return; }
  }

  if (window._forceUndoPush) window._forceUndoPush();
  let displayName = record.name || 'sin-nombre';
  if (!displayName.endsWith('.ino')) displayName += '.ino';
  // Tabs antes que bloques (ver workspace-restore.js).
  restoreWorkspaceState(workspace, { state: record.state, tabs: record.tabs, sketchName: displayName });
  currentProjectId = (typeof idOrName === 'number') ? idOrName : null;
  if (!isGuest() && currentProjectId && !readOnly && window._tabManager?.configureTextCollaboration) {
    try {
      const filesResponse = await fetch(`/api/projects/${currentProjectId}/files`);
      const files = filesResponse.ok ? await filesResponse.json() : [];
      window._tabManager.configureTextCollaboration(currentProjectId, files);
    } catch (_) {
      // El editor sigue funcionando con el flujo legacy/polling.
    }
  }
  projectInput.value = displayName;
  window._exampleComment = null;
  localStorage.setItem(LAST_KEY, displayName);
  showToast(`Proyecto "${displayName}" cargado`);
  projectList.classList.add('hidden');
}

async function loadForeignProject(id, url, editable) {
  teacherEditId = editable ? id : null;
  setReadOnly(!editable);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      teacherEditId = null;
      setReadOnly(true);
      showToast('No autorizado o proyecto no encontrado');
      return null;
    }
    const p = await res.json();
    const record = typeof p.data === 'string' ? JSON.parse(p.data) : p.data;
    currentRevision = p.revision ?? 1;
    if (window._forceUndoPush) window._forceUndoPush();
    let displayName = record.name || 'sin-nombre';
    if (!displayName.endsWith('.ino')) displayName += '.ino';
    // Tabs antes que bloques (ver workspace-restore.js).
    restoreWorkspaceState(workspace, { state: record.state, tabs: record.tabs, sketchName: displayName });
    currentProjectId = null; // proyecto ajeno: no se guarda como propio
    projectInput.value = displayName;
    window._exampleComment = null;
    localStorage.setItem(LAST_KEY, displayName);
    return displayName;
  } catch (e) {
    teacherEditId = null;
    setReadOnly(true);
    showToast('Error de conexión al cargar');
    return null;
  }
}

export async function loadTeacherProject(id, opts = {}) {
  const editable = !!opts.editable;
  const name = await loadForeignProject(id, `/api/teacher/projects/${id}`, editable);
  if (name) showToast(editable ? `Editando: "${name}"` : `Solo lectura: "${name}"`);
}

export async function loadReferenceProject(id) {
  const name = await loadForeignProject(id, `/api/reference-projects/${id}`, false);
  if (name) showToast(`Referencia: "${name}"`);
}


// ═══ Resolución de conflictos ════════════════════

function openConflictDialog(revision) {
  const modal = document.getElementById('conflict-modal');
  const revisionEl = document.getElementById('conflict-revision');
  if (revisionEl) revisionEl.textContent = String(revision ?? '?');
  modal?.classList.remove('hidden');
}

function closeConflictDialog() {
  document.getElementById('conflict-modal')?.classList.add('hidden');
}

function reloadConflictRemote() {
  if (!conflictState?.remoteProject) return;
  const remote = conflictState.remoteProject;
  const record = typeof remote.data === 'string' ? JSON.parse(remote.data) : remote.data;
  restoreWorkspaceState(workspace, {
    state: record.state,
    tabs: record.tabs,
    sketchName: remote.name || 'sin-nombre.ino',
  });
  currentRevision = conflictState.remoteRevision;
  projectInput.value = remote.name || 'sin-nombre.ino';
  conflictState = null;
  workspaceDirty = false;
  closeConflictDialog();
  showToast('Versión del servidor cargada');
}

async function saveConflictCopy() {
  if (!conflictState) return;
  const baseName = getProjectName().replace(/\.ino$/i, '') || 'proyecto';
  const copyName = `${baseName} - copia local.ino`;
  resetCurrentProject();
  closeConflictDialog();
  await saveProject(copyName);
}

// ═══ Delete ══════════════════════════════════════

export async function deleteProject(idOrName) {
  if (!idOrName) return;
  if (!confirm(`¿Eliminar proyecto "${idOrName}"?`)) return;

  if (isGuest()) {
    localStorage.removeItem(lsKey(idOrName));
    if (localStorage.getItem(LAST_KEY) === idOrName) localStorage.removeItem(LAST_KEY);
  } else {
    try {
      await csrfFetch(`/api/projects/${idOrName}`, { method: 'DELETE' });
    } catch (e) { /* ignore */ }
  }

  if (projectInput.value.trim() === idOrName || String(idOrName) === String(projectInput.dataset.projectId)) {
    workspace.clear();
    projectInput.value = '';
    if (window._tabManager) window._tabManager.loadTabs([]);
  }
  showToast(`Proyecto eliminado`);
  projectList.classList.add('hidden');
}


// ═══ List ════════════════════════════════════════

export async function renderProjectList() {
  projectList.innerHTML = '';
  let items = [];

  if (isGuest()) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key.startsWith(LS_PREFIX) || key === LAST_KEY) continue;
      try {
        const record = JSON.parse(localStorage.getItem(key));
        items.push({ name: record.name, saved: record.saved, id: record.name });
      } catch (e) { /* skip */ }
    }
  } else {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const serverProjects = await res.json();
        items = serverProjects.map(p => ({
          id: p.id, name: p.name, saved: new Date(p.updated_at).getTime()
        }));
      }
    } catch (e) { showToast('Error al cargar lista de proyectos'); return; }
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
    div.addEventListener('click', () => loadProject(p.id || p.name));
    projectList.appendChild(div);
  }
}

function toggleProjectList() {
  if (projectList.classList.contains('hidden')) {
    renderProjectList();
    const btn = document.getElementById('btn-load');
    const rect = btn.getBoundingClientRect();
    projectList.style.top = (rect.bottom + 4) + 'px';
    projectList.style.left = rect.left + 'px';
    projectList.classList.remove('hidden');
  } else {
    projectList.classList.add('hidden');
  }
}

export function isWorkspaceDirty() { return workspaceDirty; }
export { lsKey };
