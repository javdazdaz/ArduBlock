/**
 * ArduBlock — Cargador de Actividades (Fundación BH 2026)
 *
 * 10 actividades: 5 de Movimientos (Tarea 1) + 5 de Ultrasónico (Tarea 2).
 * Cada actividad incluye workspace state, tabs .h con funciones auxiliares,
 * y metadatos de protección.
 */

import { activity as a1_1 } from '../activities/1-1.js';
import { activity as a1_2 } from '../activities/1-2.js';
import { activity as a1_3 } from '../activities/1-3.js';
import { activity as a1_4 } from '../activities/1-4.js';
import { activity as a1_5 } from '../activities/1-5.js';
import { activity as a2_1 } from '../activities/2-1.js';
import { activity as a2_2 } from '../activities/2-2.js';
import { activity as a2_3 } from '../activities/2-3.js';
import { activity as a2_4 } from '../activities/2-4.js';
import { activity as a2_5 } from '../activities/2-5.js';
import * as Blockly from 'blockly';

const ACTIVITIES = [a1_1, a1_2, a1_3, a1_4, a1_5, a2_1, a2_2, a2_3, a2_4, a2_5];

let workspace = null;
let showToastFn = null;

export function initActivities(deps) {
  workspace = deps.workspace;
  showToastFn = deps.showToast;
}

export function getActivityList() {
  return ACTIVITIES.map((a, i) => ({
    index: i,
    name: a.name,
    description: a.description,
  }));
}

export function loadActivity(index) {
  const act = ACTIVITIES[index];
  if (!act) {
    if (showToastFn) showToastFn('Actividad no encontrada');
    return;
  }

  try {
    workspace.clear();
    Blockly.serialization.workspaces.load(act.state, workspace);

    // Aplicar protección de actividad
    if (window._clearActivityMeta) window._clearActivityMeta();
    if (act.activityMeta && window._applyActivityMeta) {
      window._applyActivityMeta(act.activityMeta);
    }

    // Nombre del proyecto
    const projectInput = document.getElementById('project-name');
    if (projectInput) {
      projectInput.value = act.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '');
    }

    if (showToastFn) showToastFn(`Actividad cargada: ${act.name}`);
  } catch (e) {
    if (showToastFn) showToastFn(`Error al cargar actividad: ${e.message}`);
    console.warn('[ArduBlock] loadActivity:', e);
  }
}
