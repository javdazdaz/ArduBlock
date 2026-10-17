/**
 * ArduBlock — Diferencias de archivos entre dos versiones de un proyecto.
 *
 * Se usa en el diálogo de conflicto de revisión para mostrar qué archivos
 * quedan solo en la copia local y cuáles solo en el servidor.
 */

/** Nombres de archivo de una lista de tabs ({filename} u objetos con filename). */
function _nombres(lista) {
  return new Set((lista || [])
    .map(t => (typeof t === 'string' ? t : t && t.filename))
    .filter(Boolean));
}

/**
 * @param {Array} localTabs   tabs del editor
 * @param {Array} remoteTabs  tabs guardados en el servidor
 * @returns {{soloLocal: string[], soloRemoto: string[]}}
 */
export function describeTabDiff(localTabs, remoteTabs) {
  const locales = _nombres(localTabs);
  const remotos = _nombres(remoteTabs);
  return {
    soloLocal: [...locales].filter(n => !remotos.has(n)).sort(),
    soloRemoto: [...remotos].filter(n => !locales.has(n)).sort(),
  };
}
