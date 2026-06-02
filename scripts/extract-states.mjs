/**
 * Paso 1: Extraer states de examples-*.js → examples/blockly-states/
 * 
 * Uso: node scripts/extract-states.mjs
 */
import { basicsExamples } from '../frontend/js/examples-data.js';
import { digitalSimple } from '../frontend/js/examples-digital-simple.js';
import { analogControlExamples } from '../frontend/js/examples-analog-control.js';
import { analog2 } from '../frontend/js/examples-analog2.js';
import { analog3 } from '../frontend/js/examples-analog3.js';
import { communicationExamples } from '../frontend/js/examples-communication.js';
import { controlExamples } from '../frontend/js/examples-control.js';
import { remainingExamples } from '../frontend/js/examples-remaining.js';
import { missingExamples } from '../frontend/js/examples-missing.js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const BASE = 'examples/blockly-states/arduino-examples';

// Mapa: nombre de categoría → subdirectorio
const categoryMap = {
  '01.Basics':        'basics',
  '02.Digital':       'digital',
  '03.Analog':        'analog',
  '04.Communication': 'communication',
  '05.Control':       'control',
};

const all = [
  ...basicsExamples,
  ...digitalSimple,
  ...analogControlExamples,
  ...analog2,
  ...analog3,
  ...communicationExamples,
  ...controlExamples,
  ...remainingExamples,
  ...missingExamples,
];

let extracted = 0;
let skipped = 0;

for (const ex of all) {
  const subdir = categoryMap[ex.category];
  if (!subdir) {
    if (ex.state) console.warn(`⚠ Sin subdir para categoría "${ex.category}" — ${ex.name}`);
    skipped++;
    continue;
  }
  
  if (!ex.state) {
    // NOT_CONVERTIBLE o sin state
    continue;
  }

  const dir = `${BASE}/${subdir}`;
  mkdirSync(dir, { recursive: true });
  
  const filename = `${dir}/${ex.name}.json`;
  writeFileSync(filename, JSON.stringify(ex.state, null, 2) + '\n');
  extracted++;
}

console.log(`✓ ${extracted} states extraídos a ${BASE}/`);
console.log(`  ${skipped} sin subdir mapeado`);
