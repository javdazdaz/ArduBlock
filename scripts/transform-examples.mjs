/**
 * Paso 2: Transformar examples-*.js 
 * - Reemplazar state inline por import JSON
 * - Agregar description bilingüe {es, en}
 * - Agregar source: 'arduino-examples'
 * 
 * Uso: node scripts/transform-examples.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, basename } from 'path';

// Mapa: nombre de categoría → subdirectorio
const categoryToDir = {
  '01.Basics':        'basics',
  '02.Digital':       'digital',
  '03.Analog':        'analog',
  '04.Communication': 'communication',
  '05.Control':       'control',
};

const FILES = [
  'frontend/js/examples-data.js',
  'frontend/js/examples-digital-simple.js',
  'frontend/js/examples-analog-control.js',
  'frontend/js/examples-analog2.js',
  'frontend/js/examples-analog3.js',
  'frontend/js/examples-communication.js',
  'frontend/js/examples-control.js',
];

for (const file of FILES) {
  console.log(`\n=== ${file} ===`);
  const module = await import(`../${file}`);
  
  // Find the exported array
  const exportName = Object.keys(module).find(k => Array.isArray(module[k]));
  if (!exportName) {
    console.log('  ⚠ No export array found, skipping');
    continue;
  }
  
  const examples = module[exportName];
  const imports = [];
  const entries = [];
  
  for (const ex of examples) {
    const subdir = categoryToDir[ex.category];
    
    if (ex.state && subdir) {
      const importName = `_${ex.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const jsonPath = `../../examples/blockly-states/arduino-examples/${subdir}/${ex.name}.json`;
      imports.push(`import ${importName} from '${jsonPath}';`);
      
      entries.push({
        ...ex,
        description: typeof ex.description === 'string'
          ? { es: ex.description, en: ex.description }
          : (ex.description || { es: '', en: '' }),
        source: 'arduino-examples',
        stateRef: importName,
      });
    } else {
      // Sin state o sin subdir: mantener como está pero agregar source + bilingüe
      entries.push({
        ...ex,
        description: typeof ex.description === 'string'
          ? { es: ex.description, en: ex.description }
          : (ex.description || { es: '', en: '' }),
        source: 'arduino-examples',
        stateRef: null,
      });
    }
  }
  
  // Generate new file content
  const lines = [];
  lines.push('/**');
  lines.push(` * ArduBlock — Ejemplos Arduino (auto-generado por transform-examples.mjs)`);
  lines.push(' */');
  lines.push('');
  
  for (const imp of imports) {
    lines.push(imp);
  }
  
  if (imports.length > 0) lines.push('');
  
  lines.push(`export const ${exportName} = [`);
  
  for (const ex of entries) {
    lines.push('  {');
    lines.push(`    name: ${JSON.stringify(ex.name)},`);
    lines.push(`    source: ${JSON.stringify(ex.source)},`);
    lines.push(`    category: ${JSON.stringify(ex.category)},`);
    lines.push(`    description: ${JSON.stringify(ex.description)},`);
    
    if (ex.comment) {
      lines.push(`    comment: ${JSON.stringify(ex.comment)},`);
    }
    
    if (ex.stateRef) {
      lines.push(`    state: ${ex.stateRef},`);
    } else if (ex.state) {
      // Keep inline for entries without subdir mapping
      lines.push(`    state: ${JSON.stringify(ex.state)},`);
    }
    
    if (ex.reason) {
      lines.push(`    reason: ${JSON.stringify(ex.reason)},`);
    }
    if (ex.note) {
      lines.push(`    note: ${JSON.stringify(ex.note)},`);
    }
    if (ex.tabs) {
      lines.push(`    tabs: ${JSON.stringify(ex.tabs)},`);
    }
    
    // Remove trailing comma on last field by looking at what we just added
    lines.push('  },');
  }
  
  lines.push('];');
  lines.push('');
  
  const content = lines.join('\n');
  writeFileSync(file, content);
  console.log(`  ✓ ${entries.length} entradas (${imports.length} con state importado)`);
}

console.log('\n✓ Paso 2 completo');
