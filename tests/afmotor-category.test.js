import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { buildToolboxForBoard } from '../frontend/js/blocks.js';
import {
  AFMOTOR_INCLUDE,
  AFMOTOR_CATEGORY_BLOCKS,
  hasAfmotorInclude,
} from '../frontend/js/afmotor-category.js';

function categorias(toolbox) {
  return toolbox.contents.map(c => c.custom).filter(Boolean);
}

describe('categoría Motor AF', () => {
  it('existe en nivel 3 y desaparece en nivel 2', () => {
    expect(categorias(buildToolboxForBoard('arduino:avr:uno', 3))).toContain('CAT_AFMOTOR');
    expect(categorias(buildToolboxForBoard('arduino:avr:uno', 2))).not.toContain('CAT_AFMOTOR');
  });

  it('se quita del toolbox cuando no hay include', () => {
    const sinInclude = buildToolboxForBoard('arduino:avr:uno', 3, { withAfmotor: false });
    expect(categorias(sinInclude)).not.toContain('CAT_AFMOTOR');
    const conInclude = buildToolboxForBoard('arduino:avr:uno', 3, { withAfmotor: true });
    expect(categorias(conInclude)).toContain('CAT_AFMOTOR');
  });

  it('la categoría trae los trece bloques del shield', () => {
    expect(AFMOTOR_CATEGORY_BLOCKS).toHaveLength(13);
    expect(AFMOTOR_CATEGORY_BLOCKS.map(b => b.type)).toContain('afmotor_servo_create');
    expect(AFMOTOR_CATEGORY_BLOCKS.every(b => b.kind === 'block')).toBe(true);
  });
});

describe('detección del include', () => {
  it('sin workspace no hay include', () => {
    expect(hasAfmotorInclude(null)).toBe(false);
  });

  it('un workspace vacío no tiene include', () => {
    const ws = new Blockly.Workspace();
    try {
      expect(hasAfmotorInclude(ws)).toBe(false);
    } finally {
      ws.dispose();
    }
  });

  it('lo detecta esté suelto o dentro de setup', () => {
    const ws = new Blockly.Workspace();
    try {
      const setup = ws.newBlock('arduino_setup');
      const include = ws.newBlock('library_include');
      include.setFieldValue(AFMOTOR_INCLUDE, 'LIB');
      expect(hasAfmotorInclude(ws)).toBe(true);

      setup.getInput('BODY').connection.connect(include.previousConnection);
      expect(hasAfmotorInclude(ws)).toBe(true);
    } finally {
      ws.dispose();
    }
  });

  it('otro bloque de inclusión no cuenta', () => {
    const ws = new Blockly.Workspace();
    try {
      // include_header no declara librería: el dropdown de library_include
      // tiene una sola opción, así que no existe un "otro header" posible.
      ws.newBlock('include_header');
      expect(hasAfmotorInclude(ws)).toBe(false);
    } finally {
      ws.dispose();
    }
  });

  it('al borrar el include la categoría deja de aplicar', () => {
    const ws = new Blockly.Workspace();
    try {
      const include = ws.newBlock('library_include');
      include.setFieldValue(AFMOTOR_INCLUDE, 'LIB');
      expect(hasAfmotorInclude(ws)).toBe(true);

      include.dispose(false);
      expect(hasAfmotorInclude(ws)).toBe(false);
    } finally {
      ws.dispose();
    }
  });
});
