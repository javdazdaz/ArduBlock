/**
 * ArduBlock — Índice maestro de ejemplos Arduino
 * 
 * Re-exporta todos los ejemplos desde sus archivos individuales.
 * Cada categoría vive en su propio módulo para mantenibilidad.
 * 
 * Las entradas NOT_CONVERTIBLE se incluyen con reason y note
 * para mostrar al usuario por qué ese ejemplo no está disponible como bloques.
 */

// 01.Basics — 6 sketches (todos convertidos)
export { basicsExamples } from './examples-data.js';

// 02.Digital — 9 sketches (4 convertidos, 5 no convertibles)
export { digitalSimple } from './examples-digital-simple.js';

// 03.Analog — 6 sketches (3 convertidos, 3 no convertibles)
export { analogControlExamples } from './examples-analog-control.js';
export { analog2 } from './examples-analog2.js';
export { analog3 } from './examples-analog3.js';

// 04.Communication — 8 sketches (1 convertido, 7 no convertibles)
export { communicationExamples } from './examples-communication.js';

// 05.Control — 6 sketches (3 convertidos, 3 no convertibles)
export { controlExamples } from './examples-control.js';

// 06.Sensors, 07.Display, 08.Strings, 09.USB, 10.StarterKit, 11.ArduinoISP
// — 39 sketches (todos no convertibles o pendientes de revisión)
export { remainingExamples } from './examples-remaining.js';
