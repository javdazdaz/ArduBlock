/**
 * ArduBlock — Índice maestro de ejemplos Arduino
 * 
 * Re-exporta todos los ejemplos desde sus archivos individuales.
 * Cada categoría vive en su propio módulo para mantenibilidad.
 * 
 * Las entradas NOT_CONVERTIBLE se incluyen con reason y note
 * para mostrar al usuario por qué ese ejemplo no está disponible como bloques.
 */

// ── Registro de fuentes ────────────────────────
export { sources } from './examples-sources.js';

// ── 01.Basics — 6 sketches (todos convertidos) ──
export { basicsExamples } from './examples-data.js';

// ── 02.Digital — 9 sketches ─────────────────────
export { digitalSimple } from './examples-digital-simple.js';

// ── 03.Analog — 6 sketches ──────────────────────
export { analogControlExamples } from './examples-analog-control.js';
export { analog2 } from './examples-analog2.js';
export { analog3 } from './examples-analog3.js';

// ── 04.Communication — 12 sketches ──────────────
export { communicationExamples } from './examples-communication.js';

// ── 05.Control — 3 sketches ─────────────────────
export { controlExamples } from './examples-control.js';

// ── Resto — 39 sketches no convertibles ─────────
export { remainingExamples } from './examples-remaining.js';
