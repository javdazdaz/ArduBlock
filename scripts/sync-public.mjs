#!/usr/bin/env node
/**
 * ArduBlock — sincroniza los estáticos que carga Flask.
 *
 * Las páginas renderizadas por Jinja (templates/) viven fuera del bundle de
 * Vite, así que cargan sus módulos y hojas de estilo como archivos sueltos
 * bajo /js/ y /css/. Aquí la fuente es siempre frontend/js y frontend/css;
 * frontend/public es el artefacto que Vite copia a dist/ y no se versiona.
 *
 * Se ejecuta en predev y en prebuild, y también desde deploy.
 */
import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Origen dentro de frontend/ → destino dentro de frontend/public/. */
const FILES = [
  ['css/palettes.css', 'css/palettes.css'],
  ['css/pages.css', 'css/pages.css'],
  ['js/csrf.js', 'js/csrf.js'],
  ['js/canvas-avatars.js', 'js/canvas-avatars.js'],
  ['js/profile-avatar.js', 'js/profile-avatar.js'],
];

let copied = 0;
for (const [from, to] of FILES) {
  const source = path.join(root, 'frontend', from);
  const target = path.join(root, 'frontend', 'public', to);
  if (!existsSync(source)) {
    console.error(`✕ Falta el origen: frontend/${from}`);
    process.exit(1);
  }
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
  copied += 1;
}

// Aviso si public/ tiene copias que ya no corresponden a ninguna fuente.
const stale = [];
for (const dir of ['js', 'css']) {
  const dirPath = path.join(root, 'frontend', 'public', dir);
  if (!existsSync(dirPath)) continue;
  const expected = new Set(FILES.filter(([, to]) => to.startsWith(`${dir}/`)).map(([, to]) => path.basename(to)));
  for (const name of await readdir(dirPath)) {
    if (name.endsWith('.map') || expected.has(name)) continue;
    stale.push(`frontend/public/${dir}/${name}`);
  }
}
if (stale.length) {
  console.warn(`⚠ Copias sin fuente en frontend/: ${stale.join(', ')}`);
}

console.log(`✓ ${copied} estáticos sincronizados en frontend/public/`);
