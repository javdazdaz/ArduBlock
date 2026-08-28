/**
 * ArduBlock — Utilidad de regeneración de thumbnails (solo profesor).
 *
 * Recorre los proyectos de los alumnos, renderiza cada estado en un workspace
 * Blockly oculto, captura el thumbnail 128x128 y lo guarda de vuelta.
 */

import * as Blockly from 'blockly';
import DarkTheme from '@blockly/theme-dark';
import './blocks.js';
import { captureWorkspaceThumbnail } from './thumbnail.js';
import { applyAiPalette } from './palette.js';
import { csrfFetch } from './csrf.js';

const workspace = Blockly.inject('regen-workspace', {
  theme: DarkTheme,
  renderer: 'geras',
  trashcan: false,
  scrollbars: false,
});

applyAiPalette(workspace);

const btn = document.getElementById('regen-run');
const listEl = document.getElementById('regen-list');
const summaryEl = document.getElementById('regen-summary');

btn.addEventListener('click', async () => {
  btn.disabled = true;
  listEl.innerHTML = '';
  summaryEl.textContent = 'Cargando proyectos…';

  let projects;
  try {
    const res = await fetch('/api/teacher/regen/projects');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    projects = await res.json();
  } catch (e) {
    summaryEl.textContent = 'Error al cargar proyectos: ' + e.message;
    btn.disabled = false;
    return;
  }

  let done = 0, skipped = 0, failed = 0;

  for (const p of projects) {
    const row = document.createElement('li');
    row.textContent = p.name;
    listEl.appendChild(row);

    try {
      workspace.clear();

      let state = null;
      if (p.data) {
        try {
          const record = typeof p.data === 'string' ? JSON.parse(p.data) : p.data;
          state = record && record.state ? record.state : record;
        } catch { state = null; }
      }

      if (state) {
        try { Blockly.serialization.workspaces.load(state, workspace); } catch { /* estado inválido */ }
      }
      await new Promise((r) => setTimeout(r, 0));

      const thumb = await captureWorkspaceThumbnail(workspace);
      if (!thumb) {
        row.textContent = '⏭ ' + p.name + ' — sin bloques';
        skipped++;
        continue;
      }

      const saveRes = await csrfFetch(`/api/teacher/regen/projects/${p.id}/thumbnail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thumbnail: thumb }),
      });

      if (saveRes.ok) {
        row.textContent = '✅ ' + p.name;
        done++;
      } else {
        row.textContent = '⚠ ' + p.name + ' — HTTP ' + saveRes.status;
        failed++;
      }
    } catch (e) {
      row.textContent = '❌ ' + p.name + ' — ' + e.message;
      failed++;
    }
  }

  summaryEl.textContent = `Listo: ${done} regenerado(s), ${skipped} sin bloques, ${failed} con error.`;
  btn.disabled = false;
});
