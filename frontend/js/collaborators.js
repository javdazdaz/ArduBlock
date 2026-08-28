import { csrfFetch } from './csrf.js';

export function initCollaboratorsUI({ getProjectId, showToast }) {
  const button = document.getElementById('btn-collaborators');
  const modal = document.getElementById('collaborators-modal');
  const close = document.getElementById('collaborators-close');
  const form = document.getElementById('collaborator-form');
  const list = document.getElementById('collaborators-list');
  const presence = document.getElementById('collaborators-presence');
  const header = document.getElementById('collaboration-header');
  const headerAvatars = document.getElementById('collaboration-avatars');
  const headerStatus = document.getElementById('collaboration-status');
  if (!button || !modal || !form || !list) return;

  const escape = (value) => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));

  function renderPresence(peers, kind) {
    if (!Array.isArray(peers) || !presence) return;
    const label = kind === 'block' ? 'Blockly' : 'texto';
    const people = peers;
    const avatarMarkup = people.map(peer => `<span class="presence-person" title="${escape(peer.display_name || '')}">${peer.has_avatar ? `<img class="avatar avatar-tiny" src="${escape(peer.avatar_url || '')}" alt="">` : `<span class="presence-initials">${escape((peer.display_name || '?').slice(0, 2).toUpperCase())}</span>`}</span>`).join('');
    const status = people.map(peer => {
      const place = kind === 'block' ? 'trabajando en un bloque' : (peer.filename ? `editando ${peer.filename}` : 'en el editor');
      return `${escape(peer.display_name)}: ${place}`;
    }).join(' · ');
    presence.innerHTML = `${people.length} sesión(es) de ${label} conectada(s) ${avatarMarkup}`;
    if (header && headerAvatars && headerStatus) {
      header.classList.toggle('hidden', people.length === 0);
      headerAvatars.innerHTML = avatarMarkup;
      headerStatus.textContent = status;
    }
  }

  function refreshVisibility() {
    button.hidden = window.IS_GUEST_MODE !== false || !getProjectId();
  }

  async function load() {
    const projectId = getProjectId();
    if (!projectId) return;
    const response = await fetch(`/api/projects/${projectId}/collaborators`);
    if (!response.ok) {
      showToast?.(response.status === 403 ? 'Solo el propietario puede administrar accesos' : 'No se pudieron cargar los colaboradores');
      return;
    }
    const payload = await response.json();
    const currentRole = payload.current_user_role;
    const collaborators = payload.collaborators || [];
    const isAdmin = currentRole === 'owner' || currentRole === 'teacher';
    form.hidden = !isAdmin;
    list.innerHTML = collaborators.length ? collaborators.map(row => `
      <div class="collaborator-row" data-user-id="${row.user_id}">
        <span class="collaborator-identity">${row.has_avatar ? `<img class="avatar avatar-small" src="${escape(row.avatar_url)}" alt="">` : ''}<span><strong>${escape(row.name || row.email)}</strong><br><small>${escape(row.email)} · ${escape(row.role)}</small></span></span>
        ${isAdmin ? `<span class="collaborator-actions">
          <select class="collaborator-role" aria-label="Rol de ${escape(row.email)}">
            <option value="viewer" ${row.role === 'viewer' ? 'selected' : ''}>Lector</option>
            <option value="editor" ${row.role === 'editor' ? 'selected' : ''}>Editor</option>
          </select>
          <button type="button" class="btn-secondary collaborator-update" data-email="${escape(row.email)}">Aplicar</button>
          <button type="button" class="btn-danger collaborator-remove" data-user-id="${row.user_id}">Revocar</button>
        </span>` : ''}
      </div>`).join('') : '<p class="muted">No hay colaboradores.</p>';
    if (!isAdmin) {
      list.insertAdjacentHTML('afterbegin', `<p class="muted">Usted tiene permiso de ${escape(currentRole)}; solo el propietario o el profesor administra accesos.</p>`);
    }
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
    const update = event.target.closest('.collaborator-update');
    if (update) {
      const role = update.parentElement.querySelector('.collaborator-role').value;
      const response = await csrfFetch(`/api/projects/${getProjectId()}/collaborators`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: update.dataset.email, role }),
      });
      if (!response.ok) { showToast?.('Solo el propietario puede cambiar permisos'); return; }
      await load();
      showToast?.('Permiso actualizado');
      return;
    }
    const remove = event.target.closest('.collaborator-remove');
    if (!remove) return;
    const response = await csrfFetch(`/api/projects/${getProjectId()}/collaborators/${remove.dataset.userId}`, { method: 'DELETE' });
    if (!response.ok) { showToast?.('No se pudo revocar el acceso'); return; }
    await load();
  });

  window.addEventListener('ardublock:presence', event => renderPresence(event.detail?.peers, 'text'));
  window.addEventListener('ardublock:block-presence', event => renderPresence(event.detail?.peers, 'block'));
  window.addEventListener('ardublock:project-changed', refreshVisibility);
  refreshVisibility();
}
