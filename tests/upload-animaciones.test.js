import { describe, expect, it } from 'vitest';
import { animacionesQueNoEntran } from '../frontend/js/upload.js';

/**
 * Pre-vuelo de compilación: una tabla de animación mayor que la flash de la
 * placa elegida no compila, y en el UNO R3 avr-gcc devuelve decenas de miles de
 * líneas. Se niega antes de mandar el trabajo.
 */

/** Texto decimal con el tamaño que tendría una tabla de `bytes` cuadros. */
function tabla(nombre, bytes) {
  return { filename: nombre, content: '0,'.repeat(Math.round(bytes * 3.6 / 2)) };
}

describe('animacionesQueNoEntran', () => {
  it('la tabla de Bad Apple no entra en el UNO R3', () => {
    const fuera = animacionesQueNoEntran([tabla('oled_anim_badapple.h', 184890)], 'arduino:avr:uno');
    expect(fuera).toHaveLength(1);
    expect(fuera[0].bytes).toBeGreaterThan(180000);
    expect(fuera[0].flash).toBe(32256);
  });

  it('la misma tabla entra en el UNO R4 WiFi y en el Mega', () => {
    const tabs = [tabla('oled_anim_badapple.h', 184890)];
    expect(animacionesQueNoEntran(tabs, 'arduino:renesas_uno:unor4wifi')).toEqual([]);
    expect(animacionesQueNoEntran(tabs, 'arduino:avr:mega')).toEqual([]);
  });

  it('una animación corta no dispara el aviso', () => {
    expect(animacionesQueNoEntran([tabla('oled_anim_corta.h', 4000)], 'arduino:avr:uno')).toEqual([]);
  });

  it('ignora tabs que no son de animación y placas sin dato de flash', () => {
    const tabs = [tabla('util.h', 184890), tabla('index.html', 184890)];
    expect(animacionesQueNoEntran(tabs, 'arduino:avr:uno')).toEqual([]);
    expect(animacionesQueNoEntran([tabla('oled_anim_badapple.h', 184890)], 'otra:placa:x')).toEqual([]);
  });
});
