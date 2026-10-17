import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import {
  canCollapse,
  toggleBlockCollapse,
  stripCollapsedState,
  stateForStorage,
  installBlockCollapse,
} from '../frontend/js/block-collapse.js';

describe('plegar bloques con doble clic', () => {
  it('un bloque con pila se pliega y se despliega', () => {
    const ws = new Blockly.Workspace();
    try {
      const bloque = ws.newBlock('arduino_setup');
      expect(canCollapse(bloque)).toBe(true);

      expect(toggleBlockCollapse(bloque)).toBe(true);
      expect(bloque.isCollapsed()).toBe(true);

      expect(toggleBlockCollapse(bloque)).toBe(false);
      expect(bloque.isCollapsed()).toBe(false);
    } finally {
      ws.dispose();
    }
  });

  it('un bloque de valor no se pliega', () => {
    const ws = new Blockly.Workspace();
    try {
      const numero = ws.newBlock('math_number');
      expect(canCollapse(numero)).toBe(false);
      expect(toggleBlockCollapse(numero)).toBeNull();
      expect(numero.isCollapsed()).toBe(false);
    } finally {
      ws.dispose();
    }
  });

  it('plegar no cambia el estado guardado', () => {
    const ws = new Blockly.Workspace();
    try {
      const setup = ws.newBlock('arduino_setup');
      const include = ws.newBlock('library_include');
      setup.getInput('BODY').connection.connect(include.previousConnection);
      toggleBlockCollapse(setup);

      const guardado = JSON.stringify(stateForStorage(ws));
      expect(guardado).not.toContain('collapsed');
    } finally {
      ws.dispose();
    }
  });

  it('stripCollapsedState recorre next e inputs', () => {
    const estado = {
      blocks: {
        languageVersion: 0,
        blocks: [{
          type: 'arduino_setup',
          collapsed: true,
          next: { block: { type: 'arduino_loop', collapsed: true } },
          inputs: {
            BODY: { block: { type: 'controls_if', collapsed: true } },
          },
        }],
      },
    };

    const limpio = stripCollapsedState(estado);
    expect(JSON.stringify(limpio)).not.toContain('collapsed');
    expect(limpio.blocks.blocks[0].next.block.type).toBe('arduino_loop');
    expect(limpio.blocks.blocks[0].inputs.BODY.block.type).toBe('controls_if');
  });

  it('stripCollapsedState no modifica su entrada', () => {
    const estado = { blocks: [{ type: 'arduino_setup', collapsed: true }] };
    const copia = stripCollapsedState(estado);
    expect(estado.blocks[0].collapsed).toBe(true);
    expect(copia.blocks[0].collapsed).toBeUndefined();
  });
});

describe('cableado del doble clic', () => {
  function montar() {
    const host = document.createElement('div');
    const bloqueEl = document.createElement('div');
    bloqueEl.className = 'blocklyDraggable';
    bloqueEl.setAttribute('data-id', 'b1');
    host.appendChild(bloqueEl);
    document.body.appendChild(host);

    const ws = new Blockly.Workspace();
    const bloque = ws.newBlock('arduino_setup');
    bloque.id = 'b1';

    const workspaceFalso = {
      getParentSvg: () => host,
      getBlockById: (id) => (id === 'b1' ? bloque : null),
    };
    const quitar = installBlockCollapse(workspaceFalso);

    return {
      host, bloqueEl, bloque, ws, quitar,
      dobleClic: (el) => el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })),
      limpiar: () => { quitar(); host.remove(); ws.dispose(); },
    };
  }

  it('un doble clic sobre el bloque lo pliega', () => {
    const t = montar();
    try {
      t.dobleClic(t.bloqueEl);
      expect(t.bloque.isCollapsed()).toBe(true);
      t.dobleClic(t.bloqueEl);
      expect(t.bloque.isCollapsed()).toBe(false);
    } finally {
      t.limpiar();
    }
  });

  it('un doble clic sobre un campo editable no pliega', () => {
    const t = montar();
    try {
      const campo = document.createElement('div');
      campo.className = 'blocklyEditableText';
      t.bloqueEl.appendChild(campo);
      t.dobleClic(campo);
      expect(t.bloque.isCollapsed()).toBe(false);
    } finally {
      t.limpiar();
    }
  });

  it('soltar el cableado deja de plegar', () => {
    const t = montar();
    try {
      t.quitar();
      t.dobleClic(t.bloqueEl);
      expect(t.bloque.isCollapsed()).toBe(false);
    } finally {
      t.limpiar();
    }
  });
});
