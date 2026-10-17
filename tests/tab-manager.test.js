import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * tab-manager se apoya en CodeMirror 6, que no corre en jsdom. Se reemplazan
 * los paquetes de CodeMirror por dobles mínimos para poder ejercitar la lógica
 * de tabs: nombres, deduplicación, cambio y cierre.
 */
vi.mock('@codemirror/state', () => {
  class FakeText {
    constructor(text) { this.text = text; }
    get length() { return this.text.length; }
    get lines() { return this.text.split('\n').length; }
    toString() { return this.text; }
    line(n) {
      const lines = this.text.split('\n');
      const from = lines.slice(0, n - 1).reduce((acc, l) => acc + l.length + 1, 0);
      const text = lines[n - 1] ?? '';
      return { number: n, from, length: text.length, text };
    }
    lineAt(pos) {
      const lines = this.text.split('\n');
      let from = 0;
      for (let i = 0; i < lines.length; i += 1) {
        if (pos <= from + lines[i].length) {
          return { number: i + 1, from, length: lines[i].length, text: lines[i] };
        }
        from += lines[i].length + 1;
      }
      const last = lines.length;
      const text = lines[last - 1] ?? '';
      return { number: last, from: from - text.length - 1, length: text.length, text };
    }
  }

  class EditorState {
    constructor(doc) {
      this.doc = new FakeText(doc);
      this.selection = { main: { head: 0 } };
    }
    static create({ doc = '' }) { return new EditorState(doc); }
    update() { return { state: this }; }
  }

  class Compartment {
    of(value) { return value; }
    reconfigure(value) { return value; }
  }

  EditorState.readOnly = { of: () => null };
  return { EditorState, Compartment, FakeText };
});

vi.mock('@codemirror/view', () => {
  class EditorView {
    constructor({ doc = '' } = {}) {
      this.state = { doc: makeDoc(doc), selection: { main: { head: 0 } } };
      this.scrollDOM = { scrollTop: 0, scrollLeft: 0 };
      this.dispatches = [];
    }
    dispatch(spec) {
      this.dispatches.push(spec);
      if (spec.changes) {
        const change = Array.isArray(spec.changes) ? spec.changes[0] : spec.changes;
        const current = this.state.doc.toString();
        const from = change.from ?? 0;
        const to = change.to ?? current.length;
        const insert = change.insert ?? '';
        this.state = { ...this.state, doc: makeDoc(current.slice(0, from) + insert + current.slice(to)) };
      }
      if (spec.selection) {
        this.state = { ...this.state, selection: { main: spec.selection } };
      }
    }
    setState(state) { this.state = state; }
    focus() {}
  }
  EditorView.theme = () => null;
  EditorView.updateListener = { of: (fn) => fn };

  function makeDoc(text) {
    return {
      toString: () => text,
      get length() { return text.length; },
      get lines() { return text.split('\n').length; },
      line(n) {
        const lines = text.split('\n');
        const from = lines.slice(0, n - 1).reduce((acc, l) => acc + l.length + 1, 0);
        return { number: n, from, length: (lines[n - 1] ?? '').length };
      },
      lineAt(pos) {
        const lines = text.split('\n');
        let from = 0;
        for (let i = 0; i < lines.length; i += 1) {
          if (pos <= from + lines[i].length) return { number: i + 1, from, length: lines[i].length };
          from += lines[i].length + 1;
        }
        return { number: lines.length, from, length: 0 };
      },
    };
  }

  return {
    EditorView,
    keymap: Object.assign(() => null, { of: () => null }),
    lineNumbers: () => null,
    highlightActiveLine: () => null,
    highlightActiveLineGutter: () => null,
  };
});

vi.mock('@codemirror/lang-cpp', () => ({ cpp: () => null }));
vi.mock('@codemirror/lang-html', () => ({ html: () => null }));
vi.mock('@codemirror/theme-one-dark', () => ({ oneDark: [] }));
vi.mock('@codemirror/language', () => ({ syntaxHighlighting: () => null, defaultHighlightStyle: null }));
vi.mock('@codemirror/commands', () => ({ defaultKeymap: [], historyKeymap: [], history: () => null }));
vi.mock('@codemirror/search', () => ({
  search: () => null,
  searchKeymap: [],
  highlightSelectionMatches: () => null,
  openSearchPanel: vi.fn(),
  closeSearchPanel: vi.fn(),
}));

const collab = vi.hoisted(() => ({ changesFromUpdate: vi.fn(() => [{ from: 0, to: 0, insert: 'x' }]) }));

vi.mock('../frontend/js/text-collaboration.js', () => ({
  changesFromUpdate: collab.changesFromUpdate,
  TextCollaborationClient: class {
    constructor(options) { Object.assign(this, options); }
    connect() {}
    stop() {}
    enqueue() {}
    sendPresence() {}
  },
}));

async function loadTabManager() {
  vi.resetModules();
  return import('../frontend/js/tab-manager.js');
}

function prepareDom() {
  document.body.innerHTML = `
    <div id="code-tabs"><button id="btn-add-tab">+</button></div>
    <div id="code-view-ino"></div>
    <div id="code-edit-h"></div>
    <div id="line-count">0 <span>líneas</span></div>
    <button id="btn-find"></button>
    <div id="new-file-dialog" style="display:none">
      <input id="new-file-name">
      <select id="new-file-type"><option value=".h">.h</option><option value=".html">.html</option></select>
      <button id="new-file-ok"></button>
      <button id="new-file-cancel"></button>
    </div>`;
}

describe('tab-manager', () => {
  beforeEach(() => {
    prepareDom();
    localStorage.clear();
    sessionStorage.clear();
    collab.changesFromUpdate.mockClear();
  });

  it('arranca sin tabs en la barra hasta que se carga un proyecto', async () => {
    const tm = await loadTabManager();
    tm.initTabManager();

    expect(tm.getTabs()).toEqual([]);
    expect(document.querySelectorAll('.code-tab')).toHaveLength(0);

    tm.loadTabs([], 'sketch.ino');

    const rendered = document.querySelectorAll('.code-tab');
    expect(rendered).toHaveLength(1);
    expect(rendered[0].dataset.tab).toBe('sketch.ino');
    expect(rendered[0].dataset.readonly).toBe('true');
  });

  it('crea un tab html y deduplica el nombre si ya existe', async () => {
    const tm = await loadTabManager();
    tm.initTabManager();

    expect(tm.createHtmlTab('index.html', '<h1>uno</h1>')).toBe('index.html');
    expect(tm.createHtmlTab('index.html', '<h1>dos</h1>')).toBe('index-2.html');
    expect(tm.createHtmlTab('index.html', '<h1>tres</h1>')).toBe('index-3.html');

    expect(tm.getTabs().map(t => t.filename)).toEqual(['index.html', 'index-2.html', 'index-3.html']);
  });

  it('agrega la extensión .html cuando el nombre no la trae', async () => {
    const tm = await loadTabManager();
    tm.initTabManager();

    expect(tm.createHtmlTab('pagina', 'x')).toBe('pagina.html');
    expect(tm.createHtmlTab('otra.htm', 'x')).toBe('otra.htm');
  });

  it('abre un tab existente y rechaza uno inexistente', async () => {
    const tm = await loadTabManager();
    tm.initTabManager();
    tm.createHtmlTab('pagina.html', 'x');

    expect(tm.openTab('pagina.html')).toBe(true);
    expect(tm.openTab('no-existe.h')).toBe(false);
  });

  it('carga tabs desde un proyecto y devuelve contenido y cursor', async () => {
    const tm = await loadTabManager();
    tm.initTabManager();

    tm.loadTabs([
      { filename: 'util.h', content: 'int x;' },
      { filename: 'index.html', content: '<p>hola</p>' },
    ], 'parpadeo.ino');

    const tabs = tm.getTabs();
    expect(tabs.map(t => t.filename)).toEqual(['util.h', 'index.html']);
    expect(tabs[0].content).toBe('int x;');
    expect(document.querySelector('.code-tab').dataset.tab).toBe('parpadeo.ino');
  });

  it('carga un proyecto vacío dejando solo el sketch', async () => {
    const tm = await loadTabManager();
    tm.initTabManager();
    tm.createHtmlTab('pagina.html', 'x');

    tm.loadTabs([], 'nuevo.ino');

    expect(tm.getTabs()).toEqual([]);
    expect(document.querySelectorAll('.code-tab')).toHaveLength(1);
    expect(document.querySelector('.code-tab').dataset.tab).toBe('nuevo.ino');
  });

  it('renombra el tab del sketch con setSketchName', async () => {
    const tm = await loadTabManager();
    tm.initTabManager();

    tm.setSketchName('semaforo.ino');

    expect(document.querySelector('.code-tab').dataset.tab).toBe('semaforo.ino');
  });

  it('escribe y lee el contenido del editor .ino', async () => {
    const tm = await loadTabManager();
    tm.initTabManager();

    tm.setInoContent('void setup() {}\nvoid loop() {}');

    expect(tm.getInoContent()).toContain('void loop()');
    expect(document.getElementById('line-count').textContent).toContain('2');
  });

  it('cierra un tab editable desde la barra, pidiendo confirmación si tiene contenido', async () => {
    const tm = await loadTabManager();
    tm.initTabManager();
    tm.createHtmlTab('pagina.html', 'contenido');

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const closeBtn = document.querySelector('.code-tab[data-tab="pagina.html"] .tab-close');
    closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(tm.getTabs()).toEqual([]);
    confirmSpy.mockRestore();
  });

  it('no cierra un tab cuando la confirmación se rechaza', async () => {
    const tm = await loadTabManager();
    tm.initTabManager();
    tm.createHtmlTab('pagina.html', 'contenido');

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    document.querySelector('.code-tab[data-tab="pagina.html"] .tab-close')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(tm.getTabs()).toHaveLength(1);
    confirmSpy.mockRestore();
  });

  it('valida el nombre del archivo nuevo desde el diálogo', async () => {
    const tm = await loadTabManager();
    tm.initTabManager();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    document.getElementById('btn-add-tab').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.getElementById('new-file-name').value = 'nombre inválido';
    document.getElementById('new-file-ok').dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Nombre inválido'));
    expect(tm.getTabs()).toEqual([]);

    document.getElementById('new-file-name').value = 'pantalla';
    document.getElementById('new-file-ok').dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(tm.getTabs().map(t => t.filename)).toEqual(['pantalla.h']);
    alertSpy.mockRestore();
  });

  it('rechaza un nombre que ya existe', async () => {
    const tm = await loadTabManager();
    tm.initTabManager();
    tm.createHtmlTab('pagina.html', 'x');
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    document.getElementById('btn-add-tab').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.getElementById('new-file-name').value = 'pagina';
    document.getElementById('new-file-type').value = '.html';
    document.getElementById('new-file-ok').dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Ya existe'));
    expect(tm.getTabs()).toHaveLength(1);
    alertSpy.mockRestore();
  });

  it('aplica cambios remotos sobre el editor editable', async () => {
    const tm = await loadTabManager();
    tm.initTabManager();
    tm.createHtmlTab('pagina.html', 'abc');

    tm.applyRemoteTextChanges([{ from: 3, to: 3, insert: 'd' }]);

    expect(tm.getTabs()[0].content).toBe('abcd');
  });

  it('cambia el tema sin perder los tabs', async () => {
    const tm = await loadTabManager();
    tm.initTabManager();
    tm.createHtmlTab('pagina.html', 'x');

    expect(() => tm.setCodeTheme(true)).not.toThrow();
    expect(() => tm.setCodeTheme(false)).not.toThrow();
    expect(tm.getTabs()).toHaveLength(1);
  });
});
