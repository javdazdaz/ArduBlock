/**
 * ArduBlock — los includes no van en la pila del sketch.
 *
 * `library_include` e `include_header` generan una línea `#include` que el
 * escritor pone arriba del archivo, antes de `setup()`. No son instrucciones
 * que se ejecuten, así que no llevan conexión: se arrastran sueltos al
 * workspace. Blockly, en cambio, rechaza un estado donde un bloque sin
 * conexiones aparece conectado ("is missing a previous connection"), y los
 * estados guardados antes de este cambio tienen justamente eso.
 *
 * `detachIncludes` repara el estado al cargarlo: saca esos bloques de la pila
 * y los deja sueltos, con su posición. El resto del estado no se toca.
 */

import * as Blockly from 'blockly';

export const INCLUDE_TYPES = new Set(['library_include', 'include_header']);

function esInclude(block) {
  return !!block && INCLUDE_TYPES.has(block.type);
}

/** El include sin sus conexiones, conservando identidad, campos y posición. */
function suelto(block) {
  const out = { type: block.type };
  if (block.id != null) out.id = block.id;
  if (block.fields) out.fields = { ...block.fields };
  if (block.x != null) {
    out.x = block.x;
    out.y = block.y;
  }
  return out;
}

/**
 * Devuelve el bloque sin includes en su interior. Cada include encontrado se
 * empuja a `extraidos`, y su sucesor ocupa el lugar que tenía el include.
 */
function limpiarBloque(block, extraidos) {
  if (!block || typeof block !== 'object') return block;
  const out = { ...block };

  if (out.next && out.next.block) {
    const siguiente = out.next.block;
    if (esInclude(siguiente)) {
      extraidos.push(suelto(siguiente));
      if (siguiente.next) out.next = { ...siguiente.next };
      else delete out.next;
    } else {
      out.next = { ...out.next, block: limpiarBloque(siguiente, extraidos) };
    }
  }

  if (out.inputs) {
    const inputs = { ...out.inputs };
    for (const [nombre, conexion] of Object.entries(inputs)) {
      if (!conexion || !conexion.block) continue;
      const hijo = conexion.block;
      if (esInclude(hijo)) {
        extraidos.push(suelto(hijo));
        if (hijo.next) inputs[nombre] = { ...conexion, block: limpiarBloque(hijo.next.block, extraidos) };
        else delete inputs[nombre];
      } else {
        inputs[nombre] = { ...conexion, block: limpiarBloque(hijo, extraidos) };
      }
    }
    out.inputs = inputs;
  }

  return out;
}

/**
 * Estado con los includes fuera de la pila. Idempotente: un estado donde ya
 * están sueltos sale igual. Los includes extraídos quedan apilados a la
 * izquierda, uno debajo de otro, lejos de los bloques del sketch.
 */
export function detachIncludes(state) {
  if (!state || !state.blocks || !Array.isArray(state.blocks.blocks)) return state;

  const extraidos = [];
  const raiz = [];

  for (const block of state.blocks.blocks) {
    if (esInclude(block)) {
      raiz.push(suelto(block));
      // Si el include tenía algo colgando, ese algo sube a la raíz.
      if (block.next && block.next.block) raiz.push(limpiarBloque(block.next.block, extraidos));
      continue;
    }
    raiz.push(limpiarBloque(block, extraidos));
  }

  // Los includes sueltos van a la derecha del sketch: así no tapan los bloques
  // del proyecto y se ven sin buscarlos.
  const maxX = raiz.reduce((m, b) => (typeof b.x === 'number' ? Math.max(m, b.x) : m), 0);
  let y = 20;
  for (const block of extraidos) {
    if (block.x == null) {
      block.x = maxX + 340;
      block.y = y;
      y += 70;
    }
    raiz.push(block);
  }

  return { ...state, blocks: { ...state.blocks, blocks: raiz } };
}

/**
 * Envuelve la carga de estados para que el saneamiento corra siempre, venga la
 * carga de un proyecto, de una actividad, del historial o de un ejemplo.
 */
export function installIncludeDetach() {
  const serializacion = Blockly.serialization && Blockly.serialization.workspaces;
  if (!serializacion || serializacion.load.__ardublockDetach) return;
  const original = serializacion.load;
  const envuelto = function (state, workspace) {
    return original.call(this, detachIncludes(state), workspace);
  };
  envuelto.__ardublockDetach = true;
  serializacion.load = envuelto;
}
