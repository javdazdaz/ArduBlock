import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('blockly', () => ({
  serialization: { workspaces: { load: vi.fn() } },
}));

import * as Blockly from 'blockly';
import { restoreWorkspaceState } from '../frontend/js/workspace-restore.js';

function fakeWorkspace() {
  return { clear: vi.fn() };
}

describe('restoreWorkspaceState', () => {
  let loadTabs;

  beforeEach(() => {
    loadTabs = vi.fn();
    window._tabManager = { loadTabs };
    Blockly.serialization.workspaces.load.mockClear();
  });

  it('limpia los tabs cuando el registro no trae la lista', () => {
    const ws = fakeWorkspace();

    restoreWorkspaceState(ws, { state: { blocks: {} }, sketchName: 'otro.ino' });

    expect(loadTabs).toHaveBeenCalledWith([], 'otro.ino');
  });

  it('limpia los tabs cuando la lista no es un arreglo', () => {
    restoreWorkspaceState(fakeWorkspace(), { state: {}, tabs: null });

    expect(loadTabs).toHaveBeenCalledWith([], null);
  });

  it('carga los tabs del proyecto cuando existen', () => {
    const tabs = [{ filename: 'a.html', content: '<p>a</p>' }];

    restoreWorkspaceState(fakeWorkspace(), { state: {}, tabs, sketchName: 'sketch.ino' });

    expect(loadTabs).toHaveBeenCalledWith(tabs, 'sketch.ino');
  });

  it('carga los tabs antes que los bloques', () => {
    const orden = [];
    loadTabs.mockImplementation(() => orden.push('tabs'));
    Blockly.serialization.workspaces.load.mockImplementation(() => orden.push('bloques'));

    restoreWorkspaceState(fakeWorkspace(), { state: {}, tabs: [{ filename: 'a.h' }] });

    expect(orden).toEqual(['tabs', 'bloques']);
  });

  it('limpia el workspace antes de deserializar', () => {
    const ws = fakeWorkspace();

    restoreWorkspaceState(ws, { state: { blocks: {} }, tabs: [] });

    expect(ws.clear).toHaveBeenCalledTimes(1);
    expect(Blockly.serialization.workspaces.load).toHaveBeenCalledWith({ blocks: {} }, ws);
  });
});
