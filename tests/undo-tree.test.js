import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * El árbol de undo guarda todo su estado en variables de módulo, así que cada
 * caso vuelve a importarlo con vi.resetModules() para partir de cero.
 */
const h = vi.hoisted(() => ({ seq: 0, override: null }));

vi.mock('blockly', () => ({
  serialization: {
    workspaces: {
      save: () => (h.override !== null ? h.override : { seq: h.seq++ }),
    },
  },
}));

const restoreWorkspaceState = vi.hoisted(() => vi.fn());
vi.mock('../frontend/js/workspace-restore.js', () => ({ restoreWorkspaceState }));

const LS_TREE = 'ardublock:undo-tree';
const LS_SETTINGS = 'ardublock:settings';

function fakeWorkspace() {
  return { addChangeListener: vi.fn() };
}

async function loadTree() {
  vi.resetModules();
  return import('../frontend/js/undo-tree.js');
}

function prepareDom() {
  document.body.innerHTML = '<input id="project-name" value="sketch">';
}

describe('undo-tree', () => {
  beforeEach(() => {
    h.seq = 0;
    h.override = null;
    localStorage.clear();
    restoreWorkspaceState.mockClear();
    prepareDom();
  });

  it('crea una raíz vacía al inicializar sin árbol guardado', async () => {
    const tree = await loadTree();
    tree.initUndoTree({ workspace: fakeWorkspace() });

    expect(tree.treeSize()).toBe(1);
    expect(tree.canUndo()).toBe(false);
    expect(tree.canRedo()).toBe(false);
    expect(JSON.parse(localStorage.getItem(LS_TREE)).nodes).toHaveLength(1);
  });

  it('registra el listener de cambios del workspace y del nombre', async () => {
    const tree = await loadTree();
    const workspace = fakeWorkspace();
    tree.initUndoTree({ workspace });

    expect(workspace.addChangeListener).toHaveBeenCalledTimes(1);
    expect(typeof workspace.addChangeListener.mock.calls[0][0]).toBe('function');
  });

  it('agrega un nodo por cada estado distinto', async () => {
    const tree = await loadTree();
    tree.initUndoTree({ workspace: fakeWorkspace() });

    tree.forcePush();
    tree.forcePush();

    expect(tree.treeSize()).toBe(3);
    expect(tree.canUndo()).toBe(true);
    expect(tree.canRedo()).toBe(false);
  });

  it('no agrega un nodo cuando el estado no cambió', async () => {
    h.override = { blocks: [] };
    const tree = await loadTree();
    tree.initUndoTree({ workspace: fakeWorkspace() });

    tree.forcePush();

    expect(tree.treeSize()).toBe(1);
  });

  it('undo sube al padre y redo vuelve al hijo', async () => {
    const tree = await loadTree();
    tree.initUndoTree({ workspace: fakeWorkspace() });
    tree.forcePush();
    tree.forcePush();

    const back = tree.undo();
    expect(back.workspace).toEqual({ seq: 1 });
    expect(tree.canRedo()).toBe(true);

    const forward = tree.redo();
    expect(forward.workspace).toEqual({ seq: 2 });
    expect(tree.treeSize()).toBe(3);
  });

  it('devuelve null al hacer undo en la raíz y redo sin hijos', async () => {
    const tree = await loadTree();
    tree.initUndoTree({ workspace: fakeWorkspace() });

    expect(tree.undo()).toBeNull();
    expect(tree.redo()).toBeNull();
  });

  it('crea una rama alternativa al escribir después de un undo', async () => {
    const tree = await loadTree();
    tree.initUndoTree({ workspace: fakeWorkspace() });
    tree.forcePush();
    tree.undo();
    tree.forcePush();

    expect(tree.treeSize()).toBe(3);

    // La raíz conserva el hijo abandonado; hay que volver a ella para verlo.
    tree.undo();
    expect(tree.getAlternateBranches()).toHaveLength(1);

    // redo avanza por el hijo más reciente, no por la rama abandonada
    expect(tree.redo().workspace).toEqual({ seq: 2 });
  });

  it('salta a una rama alternativa por id y recupera su estado', async () => {
    const tree = await loadTree();
    tree.initUndoTree({ workspace: fakeWorkspace() });
    tree.forcePush();
    tree.undo();
    tree.forcePush();
    tree.undo();

    const [branch] = tree.getAlternateBranches();
    const state = tree.jumpToBranch(branch.id);

    expect(state.workspace).toEqual({ seq: 1 });
    expect(tree.canUndo()).toBe(true);
  });

  it('ignora un salto a un nodo inexistente', async () => {
    const tree = await loadTree();
    tree.initUndoTree({ workspace: fakeWorkspace() });

    expect(tree.jumpToBranch('no-existe')).toBeNull();
    expect(tree.treeSize()).toBe(1);
  });

  it('persiste el árbol y lo recupera al reiniciar', async () => {
    const tree = await loadTree();
    tree.initUndoTree({ workspace: fakeWorkspace() });
    tree.forcePush();

    const saved = JSON.parse(localStorage.getItem(LS_TREE));
    expect(saved.nodes).toHaveLength(2);
    expect(saved.currentId).toBe(saved.nodes[1][0]);

    const reloaded = await loadTree();
    reloaded.initUndoTree({ workspace: fakeWorkspace() });

    expect(reloaded.treeSize()).toBe(2);
    expect(reloaded.canUndo()).toBe(true);
  });

  it('descarta un árbol guardado corrupto y crea uno nuevo', async () => {
    localStorage.setItem(LS_TREE, '{no es json');
    const tree = await loadTree();
    tree.initUndoTree({ workspace: fakeWorkspace() });

    expect(tree.treeSize()).toBe(1);
  });

  it('reinicia el árbol con resetTree', async () => {
    const tree = await loadTree();
    tree.initUndoTree({ workspace: fakeWorkspace() });
    tree.forcePush();
    tree.forcePush();

    tree.resetTree();

    expect(tree.treeSize()).toBe(1);
    expect(tree.canUndo()).toBe(false);
  });

  it('restaura un snapshot sin modificar el árbol', async () => {
    const tree = await loadTree();
    tree.initUndoTree({ workspace: fakeWorkspace() });
    const before = tree.treeSize();

    tree.restoreSnapshot({
      workspace: { blocks: [] },
      tabs: [{ filename: 'sketch.ino', content: 'void setup(){}' }],
      name: 'parpadeo',
      board: 'arduino:avr:nano',
      level: 'advanced',
      activityMeta: null,
    });

    expect(tree.treeSize()).toBe(before);
    expect(restoreWorkspaceState).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sketchName: 'parpadeo' }),
    );
    expect(document.getElementById('project-name').value).toBe('parpadeo');
    expect(JSON.parse(localStorage.getItem(LS_SETTINGS))).toMatchObject({
      board: 'arduino:avr:nano',
      level: 'advanced',
    });
  });

  it('mantiene el árbol dentro del límite de 30 nodos', async () => {
    const tree = await loadTree();
    tree.initUndoTree({ workspace: fakeWorkspace() });

    for (let i = 0; i < 40; i += 1) tree.forcePush();

    expect(tree.treeSize()).toBeLessThanOrEqual(30);
    expect(tree.canUndo()).toBe(true);
  });

  it('agrupa los cambios seguidos en un solo nodo con schedulePush', async () => {
    vi.useFakeTimers();
    try {
      const tree = await loadTree();
      tree.initUndoTree({ workspace: fakeWorkspace() });

      tree.schedulePush();
      tree.schedulePush();
      tree.schedulePush();
      vi.advanceTimersByTime(3000);

      expect(tree.treeSize()).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
