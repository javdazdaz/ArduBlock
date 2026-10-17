import { describe, expect, it } from 'vitest';
import { describeTabDiff } from '../frontend/js/tab-diff.js';

describe('describeTabDiff', () => {
  it('lista los archivos que solo están en la copia local', () => {
    const { soloLocal, soloRemoto } = describeTabDiff(
      [{ filename: 'a.html' }, { filename: 'b.html' }],
      [{ filename: 'a.html' }],
    );

    expect(soloLocal).toEqual(['b.html']);
    expect(soloRemoto).toEqual([]);
  });

  it('lista los archivos que solo están en el servidor', () => {
    const { soloLocal, soloRemoto } = describeTabDiff(
      [{ filename: 'a.html' }],
      [{ filename: 'a.html' }, { filename: 'c.html' }],
    );

    expect(soloLocal).toEqual([]);
    expect(soloRemoto).toEqual(['c.html']);
  });

  it('devuelve listas vacías cuando coinciden', () => {
    const { soloLocal, soloRemoto } = describeTabDiff(
      [{ filename: 'x.h' }, { filename: 'y.html' }],
      [{ filename: 'y.html' }, { filename: 'x.h' }],
    );

    expect(soloLocal).toEqual([]);
    expect(soloRemoto).toEqual([]);
  });

  it('ordena los nombres y acepta listas ausentes', () => {
    const { soloLocal, soloRemoto } = describeTabDiff(['z.html', 'a.html'], undefined);

    expect(soloLocal).toEqual(['a.html', 'z.html']);
    expect(soloRemoto).toEqual([]);
  });

  it('ignora entradas sin nombre', () => {
    const { soloLocal } = describeTabDiff([null, {}, { filename: '' }, { filename: 'ok.h' }], []);

    expect(soloLocal).toEqual(['ok.h']);
  });
});
