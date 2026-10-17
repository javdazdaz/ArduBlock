/**
 * ArduBlock — colapsar y expandir bloques con doble clic.
 *
 * Blockly dibuja un bloque con inputs como una tarjeta alta; en el setup de una
 * actividad larga eso empuja los bloques siguientes fuera de la vista. El doble
 * clic sobre el bloque lo deja en una sola fila y oculta sus hijos; otro doble
 * clic lo devuelve.
 *
 * El colapso es de vista, no del documento: `stripCollapsedState` lo quita del
 * estado antes de guardar, de modo que un proyecto abierto por otro usuario no
 * aparece con bloques cerrados.
 */

import * as Blockly from 'blockly';

const EDITABLE_SELECTOR = [
  '.blocklyEditableText',
  '.blocklyHtmlInput',
  '.blocklyDropdownMenu',
  '.blocklyFieldSlider',
  'input',
  'textarea',
  'select',
].join(', ');

/** ¿Este bloque puede plegarse? Los bloques de valor y los no dibujados, no. */
export function canCollapse(block) {
  if (!block || typeof block.setCollapsed !== 'function') return false;
  if (typeof block.isCollapsible === 'function') return block.isCollapsible();
  return !block.outputConnection;
}

/** Alterna el estado plegado. Devuelve el estado nuevo, o null si no aplica. */
export function toggleBlockCollapse(block) {
  if (!canCollapse(block)) return null;
  const collapsed = !block.isCollapsed();
  block.setCollapsed(collapsed);
  return collapsed;
}

/**
 * Quita `collapsed` del estado serializado, en copia. Recorre la forma que usa
 * Blockly: blocks[].next, blocks[].inputs.<nombre>.block, inputs.<nombre>.shadow.
 */
export function stripCollapsedState(node) {
  if (Array.isArray(node)) return node.map(stripCollapsedState);
  if (!node || typeof node !== 'object') return node;

  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === 'collapsed') continue;
    out[key] = stripCollapsedState(value);
  }
  return out;
}

/**
 * Estado listo para guardar. El colapso es de vista: fuera del documento.
 */
export function stateForStorage(workspace) {
  return stripCollapsedState(Blockly.serialization.workspaces.save(workspace));
}

/**
 * Cablea el doble clic sobre el SVG del workspace.
 * Devuelve la función para retirarlo.
 */
export function installBlockCollapse(workspace) {
  const svg = workspace && workspace.getParentSvg ? workspace.getParentSvg() : null;
  if (!svg) return () => {};

  const onDoubleClick = (event) => {
    const target = event.target;
    if (!target || typeof target.closest !== 'function') return;
    // Un campo editable se abre con clic simple: el segundo clic no debe plegar.
    if (target.closest(EDITABLE_SELECTOR)) return;

    const element = target.closest('.blocklyDraggable[data-id]');
    if (!element) return;

    const block = workspace.getBlockById(element.getAttribute('data-id'));
    if (!canCollapse(block)) return;

    event.preventDefault();
    toggleBlockCollapse(block);
  };

  svg.addEventListener('dblclick', onDoubleClick);
  return () => svg.removeEventListener('dblclick', onDoubleClick);
}
