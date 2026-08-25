/**
 * Tests de regresión para el bug del dropdown FILE de webserver_serve_file.
 *
 * Bug original: al cargar un proyecto cuyo bloque "desplegar página web del
 * archivo" apuntaba a un .html que aún no estaba entre los tabs cargados,
 * FieldDropdown rechazaba el valor guardado
 * ("Cannot set the dropdown's value to an unavailable option") y el bloque
 * quedaba vacío → la referencia al archivo se perdía en silencio.
 *
 * Dos frentes:
 *   1) El campo `field_html_file` debe CONSERVAR el valor aunque el archivo no
 *      esté entre las opciones (lo marca "(falta)").
 *   2) La restauración debe cargar los tabs ANTES de deserializar los bloques.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';

// wifi.js importa i18n.js como side-effect (puebla Blockly.Msg). Lo mockeamos
// para que no dependa del DOM en el entorno de test (mismo patrón que
// validator.test.js).
vi.mock('../frontend/js/i18n.js', () => ({
  t: (key) => key,
  default: { t: (key) => key },
}));

let Blockly;
let FieldHtmlFile;

beforeAll(async () => {
  Blockly = await import('blockly');
  const wifi = await import('../frontend/js/blocks/wifi.js');
  FieldHtmlFile = wifi.FieldHtmlFile;
});

describe('field_html_file (dropdown FILE de webserver_serve_file)', () => {
  afterEach(() => { delete window._tabManager; });

  it('está registrado en Blockly (deserializable desde JSON)', () => {
    const field = Blockly.fieldRegistry.fromJson({ type: 'field_html_file' });
    expect(field).toBeInstanceOf(FieldHtmlFile);
  });

  it('conserva un valor aunque no esté entre las opciones (sin tabs .html)', () => {
    window._tabManager = { getTabs: () => [{ filename: 'sketch.ino' }] };
    const field = new FieldHtmlFile();

    field.setValue('pagina.html');

    expect(field.getValue()).toBe('pagina.html');
  });

  it('marca "(falta)" el archivo referenciado si no está entre los tabs .html', () => {
    window._tabManager = {
      getTabs: () => [{ filename: 'sketch.ino' }, { filename: 'otro.html' }],
    };
    const field = new FieldHtmlFile();
    field.setValue('pagina.html');

    const options = field.getOptions(true);
    const entry = options.find((o) => o[1] === 'pagina.html');
    expect(entry).toBeDefined();
    expect(entry[0]).toContain('pagina.html');
  });

  it('no duplica la entrada si el archivo sí está entre los tabs', () => {
    window._tabManager = {
      getTabs: () => [{ filename: 'sketch.ino' }, { filename: 'pagina.html' }],
    };
    const field = new FieldHtmlFile();
    field.setValue('pagina.html');

    const options = field.getOptions(true);
    const matches = options.filter((o) => o[1] === 'pagina.html');
    expect(matches).toHaveLength(1);
  });
});

describe('restoreWorkspaceState (orden tabs → bloques)', () => {
  afterEach(() => { delete window._tabManager; });

  it('carga los tabs antes de deserializar los bloques', async () => {
    const { restoreWorkspaceState } = await import('../frontend/js/workspace-restore.js');

    const order = [];
    window._tabManager = { loadTabs: vi.fn(() => order.push('tabs')) };
    const workspace = { clear: vi.fn(() => order.push('clear')) };
    const loadSpy = vi
      .spyOn(Blockly.serialization.workspaces, 'load')
      .mockImplementation(() => order.push('load'));

    restoreWorkspaceState(workspace, {
      state: {},
      tabs: [{ filename: 'pagina.html' }],
      sketchName: 'sketch.ino',
    });

    expect(order).toEqual(['tabs', 'clear', 'load']);
    loadSpy.mockRestore();
  });
});
