import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('blockly', () => ({
  serialization: {
    workspaces: {
      save: () => ({ state: { blocks: {} }, tabs: [] }),
    },
  },
}));
vi.mock('../frontend/js/thumbnail.js', () => ({
  captureWorkspaceThumbnail: vi.fn(async () => null),
}));
vi.mock('../frontend/js/workspace-restore.js', () => ({
  restoreWorkspaceState: vi.fn(),
}));
vi.mock('../frontend/js/csrf.js', () => ({
  csrfFetch: vi.fn(),
}));

function setupDom() {
  document.body.innerHTML = `
    <input id="project-name">
    <button id="btn-save"></button>
    <button id="btn-load"></button>
    <button id="btn-delete"></button>
    <div id="project-list" class="hidden"></div>
    <div id="conflict-modal" class="hidden">
      <span id="conflict-revision"></span>
      <button id="conflict-reload"></button>
      <button id="conflict-save-copy"></button>
      <button id="conflict-cancel"></button>
    </div>
  `;
  window.IS_GUEST_MODE = false;
  window._tabManager = { getTabs: () => [] };
  window._forceUndoPush = undefined;
}

function fakeWorkspace() {
  return {
    addChangeListener: vi.fn(),
    clear: vi.fn(),
  };
}

describe('project-manager revisions', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    setupDom();
  });

  it('sends the loaded revision and adopts the server revision after save', async () => {
    const { csrfFetch } = await import('../frontend/js/csrf.js');
    const fetchMock = vi.mocked(csrfFetch);
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        id: 8,
        name: 'proyecto.ino',
        revision: 4,
        data: JSON.stringify({ state: { blocks: {} }, tabs: [] }),
      }),
    }));
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 8, name: 'proyecto.ino', revision: 5 }),
    });

    const manager = await import('../frontend/js/project-manager.js');
    manager.initProjectManager({
      workspace: fakeWorkspace(),
      projectInput: document.getElementById('project-name'),
      projectList: document.getElementById('project-list'),
      showToast: vi.fn(),
      LS_PREFIX: 'test:',
      LAST_KEY: 'test:last',
    });
    await manager.loadProject(8);
    await manager.saveProject('proyecto.ino');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(options.body).revision).toBe(4);
  });

  it('opens conflict UI and keeps the local workspace on 409', async () => {
    const { csrfFetch } = await import('../frontend/js/csrf.js');
    const fetchMock = vi.mocked(csrfFetch);
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        id: 8,
        name: 'proyecto.ino',
        revision: 4,
        data: JSON.stringify({ state: { blocks: {} }, tabs: [] }),
      }),
    }));
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'conflict',
        current_revision: 5,
        project: {
          id: 8,
          name: 'remoto.ino',
          revision: 5,
          data: JSON.stringify({ state: { blocks: {} }, tabs: [] }),
        },
      }),
    });

    const manager = await import('../frontend/js/project-manager.js');
    const workspace = fakeWorkspace();
    manager.initProjectManager({
      workspace,
      projectInput: document.getElementById('project-name'),
      projectList: document.getElementById('project-list'),
      showToast: vi.fn(),
      LS_PREFIX: 'test:',
      LAST_KEY: 'test:last',
    });
    await manager.loadProject(8);
    await manager.saveProject('proyecto.ino');

    expect(document.getElementById('conflict-modal').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('conflict-revision').textContent).toBe('5');
    expect(workspace.clear).not.toHaveBeenCalled();
  });
});
