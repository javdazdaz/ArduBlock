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

// Paleta App Inventor (idéntica a la del editor) para fidelidad de colores.
const AI = {
  loop_blocks:      { colourPrimary: '#cfac4b', colourSecondary: '#9b8138', colourTertiary: '#332b12' },
  logic_blocks:     { colourPrimary: '#88b652', colourSecondary: '#66883d', colourTertiary: '#222d14' },
  math_blocks:      { colourPrimary: '#4f86c2', colourSecondary: '#3b6491', colourTertiary: '#132130' },
  text_blocks:      { colourPrimary: '#c24471', colourSecondary: '#913354', colourTertiary: '#30111c' },
  list_blocks:      { colourPrimary: '#58b5dc', colourSecondary: '#4287a5', colourTertiary: '#162d37' },
  variable_blocks:  { colourPrimary: '#db743a', colourSecondary: '#a4572b', colourTertiary: '#361d0e' },
  procedure_blocks: { colourPrimary: '#8f6997', colourSecondary: '#6b4e71', colourTertiary: '#231a25' },
};

const workspace = Blockly.inject('regen-workspace', {
  theme: DarkTheme,
  renderer: 'geras',
  trashcan: false,
  scrollbars: false,
});

const theme = workspace.getTheme();
for (const [name, style] of Object.entries(AI)) {
  theme.setBlockStyle(name, style);
}

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

      const saveRes = await fetch(`/api/teacher/regen/projects/${p.id}/thumbnail`, {
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
