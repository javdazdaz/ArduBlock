import * as Blockly from 'blockly';

/**
 * ArduBlock — Restauración de proyectos en el workspace.
 *
 * ORDEN OBLIGATORIO: primero los tabs, después los bloques.
 *
 * Motivo (bug corregido ago 2026): el campo FILE del bloque
 * "webserver_serve_file" arma sus opciones con los tabs .html cargados en ese
 * instante. Si los bloques se deserializaban antes que los tabs, Blockly
 * rechazaba el valor guardado con
 *   "Cannot set the dropdown's value to an unavailable option.
 *    Block type: webserver_serve_file, Field name: FILE, Value: pagina.html"
 * y el bloque perdía la referencia al archivo en silencio (al siguiente
 * guardado quedaba vacío y el Arduino servía una página en blanco).
 *
 * Todas las rutas de carga (último proyecto, abrir proyecto, proyecto de otro
 * usuario, deshacer, ejemplos) deben pasar por aquí.
 */

/**
 * @param {Blockly.Workspace} workspace  Workspace destino.
 * @param {object} record                { state, tabs, sketchName }
 *   - state: estado serializado de Blockly (obligatorio).
 *   - tabs: lista de tabs del proyecto; `null`/`undefined` = no tocar los tabs.
 *   - sketchName: nombre a mostrar en el tab del .ino (opcional).
 */
export function restoreWorkspaceState(workspace, record = {}) {
  const { state, tabs, sketchName } = record;

  // 1) Tabs primero: los campos que dependen de archivos (FILE de
  //    webserver_serve_file) necesitan ver los .html antes de deserializar.
  if (tabs && typeof window !== 'undefined' && window._tabManager) {
    window._tabManager.loadTabs(tabs, sketchName || null);
  }

  // 2) Bloques después.
  workspace.clear();
  Blockly.serialization.workspaces.load(state, workspace);
}
