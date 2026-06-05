/**
 * ArduBlock — Gestión de Proyectos (localStorage)
 *
 * saveProject, loadProject, deleteProject, renderProjectList.
 * Recibe dependencias vía init() para evitar acoplamiento circular.
 */

import * as Blockly from 'blockly';

let workspace, projectInput, projectList, showToast;
let LS_PREFIX, LAST_KEY, autoSaveTimer;
let workspaceDirty = false;   // cambios desde el último autosave

export function cancelAutoSave() {
  clearTimeout(autoSaveTimer);
}

export function initProjectManager(deps) {
  workspace     = deps.workspace;
  projectInput  = deps.projectInput;
  projectList   = deps.projectList;
  showToast     = deps.showToast;
  LS_PREFIX     = deps.LS_PREFIX;
  LAST_KEY      = deps.LAST_KEY;

  // Event listeners
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

  // Cerrar dropdown al clickear afuera
  document.addEventListener('click', (e) => {
    if (!projectList.classList.contains('hidden') &&
        !e.target.closest('#btn-load') &&
        !e.target.closest('#project-list')) {
      projectList.classList.add('hidden');
    }
  });

  // Auto-guardar con debounce 2s
  autoSaveTimer = null;
  workspace.addChangeListener(() => {
    workspaceDirty = true;
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      const name = projectInput.value.trim();
      if (name) { saveProject(name); workspaceDirty = false; }
    }, 2000);
  });

  // Sincronizar nombre del tab .ino con el input
  projectInput.addEventListener('input', () => {
    const name = projectInput.value.trim();
    if (name && window._tabManager) {
      const withIno = name.endsWith('.ino') ? name : name + '.ino';
      window._tabManager.setSketchName(withIno);
    }
  });
}

export function isWorkspaceDirty() {
  return workspaceDirty;
}

export function getProjectName() {
  const raw = projectInput.value.trim();
  let name = raw || 'sin-nombre';
  if (!name.endsWith('.ino')) name += '.ino';
  return name;
}

export function lsKey(name) {
  const sanitized = name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-.]/g, '')
    .substring(0, 64)
    || 'sin-nombre';
  return LS_PREFIX + sanitized;
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function saveProject(name) {
  name = name || getProjectName();
  if (!name.endsWith('.ino')) name += '.ino';
  projectInput.value = name;

  const state = Blockly.serialization.workspaces.save(workspace);
  const tabs = window._tabManager ? window._tabManager.getTabs() : [];
  const activityMeta = window._activityMeta ? window._activityMeta() : null;
  const record = { name, saved: Date.now(), state, tabs };
  if (activityMeta) record.activityMeta = activityMeta;
  try {
    localStorage.setItem(lsKey(name), JSON.stringify(record));
    localStorage.setItem(LAST_KEY, name);
    showToast(`Proyecto "${name}" guardado`);
  } catch (e) {
    showToast('Error al guardar: memoria llena');
  }
}

export function loadProject(name) {
  if (!name) return;
  try {
    const raw = localStorage.getItem(lsKey(name));
    if (!raw) { showToast(`Proyecto "${name}" no encontrado`); return; }
    const record = JSON.parse(raw);
    workspace.clear();
    Blockly.serialization.workspaces.load(record.state, workspace);
    let displayName = record.name;
    if (!displayName.endsWith('.ino')) displayName += '.ino';
    projectInput.value = displayName;
    window._exampleComment = null;

    // Restaurar tabs .h del proyecto
    if (window._tabManager && record.tabs) {
      window._tabManager.loadTabs(record.tabs, displayName);
    }

    // Restaurar metadatos de actividad
    if (window._clearActivityMeta) window._clearActivityMeta();
    if (record.activityMeta && window._applyActivityMeta) {
      window._applyActivityMeta(record.activityMeta);
    }

    localStorage.setItem(LAST_KEY, record.name);
    showToast(`Proyecto "${record.name}" cargado`);
  } catch (e) {
    showToast(`Error al cargar: ${e.message}`);
  }
  projectList.classList.add('hidden');
}

export function deleteProject(name) {
  if (!name) return;
  if (!confirm(`¿Eliminar proyecto "${name}"?`)) return;
  localStorage.removeItem(lsKey(name));
  if (localStorage.getItem(LAST_KEY) === name) {
    localStorage.removeItem(LAST_KEY);
  }
  if (projectInput.value.trim() === name) {
    workspace.clear();
    projectInput.value = '';
    if (window._tabManager) window._tabManager.loadTabs([]);
  }
  showToast(`Proyecto "${name}" eliminado`);
  projectList.classList.add('hidden');
}

export function renderProjectList() {
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
    const btn = document.getElementById('btn-load');
    const rect = btn.getBoundingClientRect();
    projectList.style.top = (rect.bottom + 4) + 'px';
    projectList.style.left = rect.left + 'px';
    projectList.classList.remove('hidden');
  } else {
    projectList.classList.add('hidden');
  }
}
