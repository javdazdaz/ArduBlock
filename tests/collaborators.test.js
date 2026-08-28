/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initCollaboratorsUI } from '../frontend/js/collaborators.js';

function dom() {
  document.body.innerHTML = `
    <button id="btn-collaborators"></button>
    <div id="collaborators-modal" class="hidden"><div id="collaborators-list"></div><p id="collaborators-presence"></p>
      <button id="collaborators-close"></button>
      <form id="collaborator-form"><input id="collaborator-email"><select id="collaborator-role"><option value="viewer">Lector</option></select></form>
    </div>`;
}

describe('collaborators UI', () => {
  beforeEach(() => { dom(); window.IS_GUEST_MODE = false; });

  it('loads collaborators and escapes email HTML', async () => {
    const fetchImpl = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => [{ user_id: 2, email: '<x>', role: 'viewer' }] });
    initCollaboratorsUI({ getProjectId: () => 7 });
    await document.getElementById('btn-collaborators').click();
    await vi.waitFor(() => expect(document.getElementById('collaborators-list').innerHTML).toContain('&lt;x&gt;'));
    expect(document.getElementById('btn-collaborators').hidden).toBe(false);
    fetchImpl.mockRestore();
  });

  it('hides the button for guest mode and renders presence', () => {
    window.IS_GUEST_MODE = true;
    initCollaboratorsUI({ getProjectId: () => 7 });
    expect(document.getElementById('btn-collaborators').hidden).toBe(true);
    window.dispatchEvent(new CustomEvent('ardublock:presence', { detail: { peers: [{}, {}] } }));
    expect(document.getElementById('collaborators-presence').textContent).toContain('2');
  });
});
