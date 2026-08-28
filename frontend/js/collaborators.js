import { csrfFetch } from './csrf.js';

export function initCollaboratorsUI({ getProjectId, showToast }) {
  const button = document.getElementById('btn-collaborators');
  const modal = document.getElementById('collaborators-modal');
  const close = document.getElementById('collaborators-close');
  const form = document.getElementById('collaborator-form');
  const list = document.getElementById('collaborators-list');
  const presence = document.getElementById('collaborators-presence');
  if (!button || !modal || !form || !list) return;

  const escape = (value) => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));

  function refreshVisibility() {
    button.hidden = window.IS_GUEST_MODE !== false || !getProjectId();
  }

  async function load() {
    const projectId = getProjectId();
    if (!projectId) return;
    const response = await fetch(`/api/projects/${projectId}/collaborators`);
    if (!response.ok) { showToast?.('No se pudieron cargar los colaboradores'); return; }
    const collaborators = await response.json();
    list.innerHTML = collaborators.length ? collaborators.map(row => `
      <div class="collaborator-row" data-user-id="${row.user_id}">
        <span>${escape(row.email)} <small>(${escape(row.role)})</small></span>
        <button type="button" class="btn-danger collaborator-remove" data-user-id="${row.user_id}">Revocar</button>
      </div>`).join('') : '<p class="muted">No hay colaboradores.</p>';
  }

  button.addEventListener('click', async () => {
    refreshVisibility();
    if (button.hidden) return;
    modal.classList.remove('hidden');
    await load();
  });
  close?.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', event => { if (event.target === modal) modal.classList.add('hidden'); });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const projectId = getProjectId();
    const email = document.getElementById('collaborator-email').value.trim();
    const role = document.getElementById('collaborator-role').value;
    const response = await csrfFetch(`/api/projects/${projectId}/collaborators`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });
    if (!response.ok) { showToast?.('No se pudo actualizar el colaborador'); return; }
    event.target.reset();
    await load();
    showToast?.('Colaborador actualizado');
  });

  list.addEventListener('click', async event => {
    const remove = event.target.closest('.collaborator-remove');
    if (!remove) return;
    const response = await csrfFetch(`/api/projects/${getProjectId()}/collaborators/${remove.dataset.userId}`, { method: 'DELETE' });
    if (!response.ok) { showToast?.('No se pudo revocar el acceso'); return; }
    await load();
  });

  window.addEventListener('ardublock:presence', event => {
    const peers = event.detail?.peers;
    if (Array.isArray(peers) && presence) presence.textContent = `${peers.length} sesión(es) de texto conectada(s)`;
  });
  window.addEventListener('ardublock:block-presence', event => {
    const peers = event.detail?.peers;
    if (Array.isArray(peers) && presence) presence.textContent = `${peers.length} sesión(es) Blockly conectada(s)`;
  });
  window.addEventListener('ardublock:project-changed', refreshVisibility);
  refreshVisibility();
}
