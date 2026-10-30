/**
 * ArduBlock — Animaciones para OLED SSD1315
 *
 * Formato de cuadro: el del sketch Bad_Apple_Flash. Cabecera 255 seguida de los
 * 1024 bytes del cuadro, o un número de bloques seguido de pares
 * (offset de bloque 8x8, 8 bytes de filas). El decodificador que emite el
 * generador es el mismo que corre en placa.
 */

/** Tope de bytes de texto por tab que impone el backend (payload_validation.py). */
export const MAX_TAB_BYTES = 1024 * 1024;

/**
 * Tope del texto que una animación propia puede ocupar dentro del .ino. Es
 * menor que el del tab: el .ino se genera en cada cambio y la tabla entera
 * dentro del sketch lo vuelve lento de compilar y de leer.
 */
export const MAX_INO_TEXTO = 512 * 1024;

/** Recursos empaquetados. Los tabs .h se crean al cargarlos desde el editor. */
export const OLED_ANIMATIONS = {
  badapple: {
    label: 'Bad Apple!! 34,8 s',
    cuadros: 871,
    fps: 25,
    bytes: 184890,
    // Una sola tabla: los 184.890 B ocupan ~615 KB de texto y caben en el tope
    // de 1 MB por tab. `corte` 0 y el segundo arreglo nulo es lo que el
    // decodificador espera cuando todo vive en `a`.
    corte: 0,
    arrays: ['oled_anim_badapple'],
    tabs: ['oled_anim_badapple.h'],
    recurso: 'badapple',
    tipo: 'linea',
  },
};

/**
 * Dónde se edita una animación. 'linea' son cuadros en la línea de tiempo;
 * 'tab' es una tabla .h que se edita como texto. Sin dato, la línea de tiempo.
 */
export function tipoDeAnimacion(anim) {
  return anim && anim.tipo === 'tab' ? 'tab' : 'linea';
}

/**
 * Si un stream cabe dentro del .ino. El texto decimal ocupa 3,6 B por byte; el
 * tope del .ino es la mitad del de un tab, porque la tabla se regenera en cada
 * cambio del workspace.
 */
export function cabeEnIno(bytes) {
  return (bytes.length * 3.6) + 4096 <= MAX_INO_TEXTO;
}

/** Bibliotecas del catálogo que traen su propio tab .h. */
export function esBuiltin(anim) {
  return Object.prototype.hasOwnProperty.call(OLED_ANIMATIONS, anim);
}

/**
 * Convierte un cuadro del búfer (página mayor, columna menor) al bloque
 * 8x8 que espera el decodificador: 8 filas, bit 0x80 = columna izquierda.
 */
export function bloqueDesdeBuffer(buf, offset) {
  const pagina = offset % 8;
  const x = (offset - pagina) / 8;
  const filas = new Uint8Array(8);
  for (let yi = 0; yi < 8; yi++) {
    let byte = 0;
    for (let i = 0; i < 8; i++) {
      const bit = (buf[pagina * 128 + x * 8 + i] >> yi) & 1;
      if (bit) byte |= 0x80 >> i;
    }
    filas[yi] = byte;
  }
  return filas;
}

/**
 * Codifica una lista de cuadros completa como stream de bloques.
 * @param {Uint8Array[]} cuadros cada uno de 1024 bytes en orden página/columna
 * @returns {Uint8Array} stream con cabeceras y bloques
 */
export function encodeCuadros(cuadros) {
  const trozos = [];
  let anterior = null;
  const vacio = new Uint8Array(1024);

  for (const cuadro of cuadros) {
    const buf = cuadro || vacio;
    const cambios = [];
    for (let off = 0; off < 128; off++) {
      const blq = bloqueDesdeBuffer(buf, off);
      let igual = true;
      if (anterior) {
        const prev = bloqueDesdeBuffer(anterior, off);
        for (let i = 0; i < 8; i++) if (prev[i] !== blq[i]) { igual = false; break; }
      } else {
        igual = false;
      }
      if (!igual) cambios.push({ off, blq });
    }

    // Un cuadro completo son 1 + 1024 bytes; cada bloque suelto, 9. El umbral
    // replica el de pack_frames.py: por sobre 113 bloques conviene el completo.
    if (!anterior || cambios.length > 113) {
      trozos.push(255);
      for (let off = 0; off < 128; off++) {
        const blq = bloqueDesdeBuffer(buf, off);
        for (let i = 0; i < 8; i++) trozos.push(blq[i]);
      }
    } else {
      trozos.push(cambios.length);
      for (const { off, blq } of cambios) {
        trozos.push(off);
        for (let i = 0; i < 8; i++) trozos.push(blq[i]);
      }
    }
    anterior = buf;
  }
  return Uint8Array.from(trozos);
}

/** Texto del arreglo C, en decimal y sin prefijo, que ocupa 3,1 B por byte. */
export function toCArray(bytes, nombre, comentario) {
  const cab = [
    '// ' + (comentario || nombre),
    '// ' + bytes.length + ' bytes. Generado por el editor OLED de ArduBlock.',
    '#pragma once',
    '#include <Arduino.h>',
    '',
    'const uint8_t ' + nombre + '[] PROGMEM = {',
  ];
  const lineas = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const trozo = [];
    for (let j = i; j < Math.min(i + 16, bytes.length); j++) trozo.push(String(bytes[j]));
    lineas.push('  ' + trozo.join(',') + ',');
  }
  return cab.concat(lineas, ['};', '']).join('\n');
}

/**
 * Parte un stream en tantos tab .h como haga falta para respetar el tope de
 * bytes por tab. Los cortes caen en el texto, no en el stream: el decodificador
 * lee de forma continua con el desplazamiento `corte`.
 * @returns {{tab: string, nombre: string, bytes: number}[]}
 */
export function partirEnTabs(bytes, nombreBase, etiquetas) {
  // El texto decimal ocupa 3,3 B por byte de tabla; se reserva 3,6 y el
  // encabezado del arreglo. El reparto es parejo: cada tab recibe la misma
  // cantidad, no el máximo, para que ninguno roce el tope.
  const maxPorTab = Math.floor((MAX_TAB_BYTES - 4096) / 3.6);
  const nTabs = Math.max(1, Math.ceil(bytes.length / maxPorTab));
  const porTab = Math.ceil(bytes.length / nTabs);
  const sufijos = 'abcdefghijklmnopqrstuvwxyz';

  const partes = [];
  for (let i = 0, offset = 0; offset < bytes.length; i += 1, offset += porTab) {
    const trozo = bytes.subarray(offset, Math.min(offset + porTab, bytes.length));
    const sufijo = nTabs > 1 ? '_' + sufijos[i] : '';
    const nombre = nombreBase + sufijo;
    partes.push({
      tab: nombre + '.h',
      nombre,
      bytes: trozo.length,
      texto: toCArray(trozo, nombre, (etiquetas || '') + ', parte ' + (i + 1) + ' de ' + nTabs),
    });
  }
  return partes;
}

/** Decodifica base64 a Uint8Array. */
export function desdeBase64(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Decodifica un stream de bloques a la lista de cuadros, cada uno de 1024 bytes
 * en orden página/columna. Es el inverso de encodeCuadros y del decodificador
 * que el generador emite en el sketch.
 * @returns {Uint8Array[]}
 */
export function decodificarCuadros(bytes) {
  const cuadros = [];
  let pos = 0;
  let actual = new Uint8Array(1024);

  const aplicarBloque = (buf, offset, leer) => {
    const pagina = offset % 8;
    const x = (offset - pagina) / 8;
    const filas = new Uint8Array(8);
    for (let i = 0; i < 8; i++) filas[i] = leer();
    for (let i = 0; i < 8; i++) {
      let col = 0;
      for (let yi = 0; yi < 8; yi++) {
        if (filas[yi] & (0x80 >> i)) col |= (1 << yi);
      }
      buf[pagina * 128 + x * 8 + i] = col;
    }
  };

  while (pos < bytes.length) {
    const cab = bytes[pos++];
    // El búfer del sketch es único: un cuadro de diferencias se aplica sobre el
    // anterior, y los bloques que no cambian conservan sus bytes.
    const previo = cuadros[cuadros.length - 1];
    const buf = previo ? Uint8Array.from(previo) : new Uint8Array(1024);
    if (cab === 255) {
      const completo = new Uint8Array(1024);
      for (let off = 0; off < 128; off++) {
        if (pos + 8 > bytes.length) return cuadros;
        aplicarBloque(completo, off, () => bytes[pos++]);
      }
      cuadros.push(completo);
      continue;
    }
    for (let i = 0; i < cab; i++) {
      if (pos >= bytes.length) return cuadros;
      const off = bytes[pos++];
      if (pos + 8 > bytes.length) return cuadros;
      aplicarBloque(buf, off, () => bytes[pos++]);
    }
    cuadros.push(buf);
  }
  return cuadros;
}

/** Lee las animaciones propias guardadas en el navegador. */
export function animacionesPropias() {
  try {
    return JSON.parse(localStorage.getItem('ardublock:oled-animations') || '{}');
  } catch (_) {
    return {};
  }
}

/** Guarda una animación propia: cuadros ya codificados en base64. */
export function guardarPropia(nombre, { fps, cuadros, b64 }) {
  const todas = animacionesPropias();
  todas[nombre] = { fps: fps || 25, cuadros: cuadros || 0, b64 };
  localStorage.setItem('ardublock:oled-animations', JSON.stringify(todas));
}
