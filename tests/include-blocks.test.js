import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { generateArduinoCode } from '../frontend/js/generator.js';
import {
  detachIncludes,
  installIncludeDetach,
} from '../frontend/js/include-blocks.js';
import { activity as actividad11 } from '../frontend/activities/1-1.js';

/** Estado con el include dentro de setup, como quedó en las actividades. */
function estadoConIncludeEnSetup() {
  return {
    blocks: {
      languageVersion: 0,
      blocks: [{
        type: 'arduino_setup',
        id: 'S1',
        x: 20,
        y: 20,
        inputs: {
          BODY: {
            block: {
              type: 'library_include',
              id: 'S1_LIB',
              fields: { LIB: 'AFMotor_R4.h' },
              next: { block: { type: 'delay_ms', id: 'S1_WAIT', fields: { MS: '2000' } } },
            },
          },
        },
      }, { type: 'arduino_loop', id: 'L1', x: 20, y: 180 }],
    },
  };
}

describe('los includes no llevan conexiones', () => {
  it('library_include no acepta bloque anterior ni siguiente', () => {
    const ws = new Blockly.Workspace();
    try {
      const include = ws.newBlock('library_include');
      expect(include.previousConnection).toBeNull();
      expect(include.nextConnection).toBeNull();
    } finally {
      ws.dispose();
    }
  });

  it('include_header tampoco', () => {
    const ws = new Blockly.Workspace();
    try {
      const header = ws.newBlock('include_header');
      expect(header.previousConnection).toBeNull();
      expect(header.nextConnection).toBeNull();
    } finally {
      ws.dispose();
    }
  });
});

describe('detachIncludes', () => {
  it('saca el include de setup y deja el resto conectado', () => {
    const limpio = detachIncludes(estadoConIncludeEnSetup());
    const [setup, , include] = limpio.blocks.blocks;

    expect(setup.type).toBe('arduino_setup');
    expect(setup.inputs.BODY.block.type).toBe('delay_ms');
    expect(include.type).toBe('library_include');
    expect(include.id).toBe('S1_LIB');
    expect(include.next).toBeUndefined();
    expect(include.x).not.toBeUndefined();
  });

  it('saca el include que cuelga de otro bloque', () => {
    const estado = {
      blocks: {
        languageVersion: 0,
        blocks: [{
          type: 'arduino_setup',
          id: 'S1',
          next: {
            block: {
              type: 'library_include',
              id: 'LIB',
              fields: { LIB: 'AFMotor_R4.h' },
              next: { block: { type: 'delay_ms', id: 'D1', fields: { MS: '10' } } },
            },
          },
        }],
      },
    };

    const limpio = detachIncludes(estado);
    const [setup, include] = limpio.blocks.blocks;
    expect(setup.next.block.type).toBe('delay_ms');
    expect(include.type).toBe('library_include');
  });

  it('deja igual un include que ya está suelto', () => {
    const estado = {
      blocks: {
        languageVersion: 0,
        blocks: [
          { type: 'arduino_setup', id: 'S1' },
          { type: 'library_include', id: 'LIB', fields: { LIB: 'AFMotor_R4.h' }, x: 300, y: 40 },
        ],
      },
    };
    const limpio = detachIncludes(estado);
    expect(limpio.blocks.blocks).toHaveLength(2);
    expect(limpio.blocks.blocks[1]).toMatchObject({ id: 'LIB', x: 300, y: 40 });
  });

  it('no toca un estado sin includes', () => {
    const estado = { blocks: { languageVersion: 0, blocks: [{ type: 'arduino_loop', id: 'L1' }] } };
    expect(detachIncludes(estado)).toEqual(estado);
  });

  it('es idempotente', () => {
    const una = detachIncludes(estadoConIncludeEnSetup());
    const dos = detachIncludes(una);
    expect(dos).toEqual(una);
  });

  it('conserva la posición del include si ya la tenía', () => {
    const estado = estadoConIncludeEnSetup();
    estado.blocks.blocks[0].inputs.BODY.block.x = 250;
    estado.blocks.blocks[0].inputs.BODY.block.y = 90;
    const limpio = detachIncludes(estado);
    const include = limpio.blocks.blocks.find(b => b.type === 'library_include');
    expect(include.x).toBe(250);
    expect(include.y).toBe(90);
  });
});

describe('carga con el saneamiento instalado', () => {
  it('la actividad 1-1 carga y el include queda suelto', () => {
    installIncludeDetach();
    const ws = new Blockly.Workspace();
    try {
      Blockly.serialization.workspaces.load(actividad11.state, ws);
      const includes = ws.getAllBlocks(false).filter(b => b.type === 'library_include');
      expect(includes).toHaveLength(1);
      expect(includes[0].previousConnection).toBeNull();
      expect(includes[0].getParent()).toBeNull();
    } finally {
      ws.dispose();
    }
  });

  it('el sketch sigue declarando el #include', () => {
    installIncludeDetach();
    const ws = new Blockly.Workspace();
    try {
      Blockly.serialization.workspaces.load(actividad11.state, ws);
      const sketch = generateArduinoCode(ws);
      expect(sketch).toContain('#include "AFMotor_R4.h"');
      expect(sketch).toContain('void setup()');
    } finally {
      ws.dispose();
    }
  });

  it('un estado viejo con el include conectado ya no rompe la carga', () => {
    installIncludeDetach();
    const ws = new Blockly.Workspace();
    try {
      expect(() => Blockly.serialization.workspaces.load(estadoConIncludeEnSetup(), ws)).not.toThrow();
      expect(ws.getAllBlocks(false).map(b => b.type).sort()).toEqual(
        ['arduino_loop', 'arduino_setup', 'delay_ms', 'library_include']
      );
    } finally {
      ws.dispose();
    }
  });
});
