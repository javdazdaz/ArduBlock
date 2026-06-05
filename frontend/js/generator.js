/**
 * ArduBlock — Generador de Código C++ para Arduino
 */

import * as Blockly from 'blockly';

const cppGenerator = new Blockly.Generator('CPP');
export { cppGenerator };

cppGenerator.nameDB_ = new Blockly.Names('_');

cppGenerator.ORDER_ATOMIC         = 0;
cppGenerator.ORDER_UNARY          = 2;
cppGenerator.ORDER_MULTIPLICATIVE = 3;
cppGenerator.ORDER_ADDITIVE       = 4;
cppGenerator.ORDER_RELATIONAL     = 5;
cppGenerator.ORDER_EQUALITY       = 6;
cppGenerator.ORDER_LOGICAL_AND    = 7;
cppGenerator.ORDER_LOGICAL_OR     = 8;
cppGenerator.ORDER_ASSIGNMENT     = 1.1;
cppGenerator.ORDER_NONE           = 99;

cppGenerator.INDENT = '  ';

cppGenerator.init = function(_workspace) {};

cppGenerator.scrub_ = function(block, code, thisOnly) {
  const nextBlock = block.getNextBlock();
  if (nextBlock && !thisOnly) {
    return code + '\n' + cppGenerator.blockToCode(nextBlock);
  }
  return code;
};

import { registerGenerators as regEstructura } from './blocks/estructura.js';
import { registerGenerators as regDigital }    from './blocks/digital.js';
import { registerGenerators as regAnaloga }    from './blocks/analoga.js';
import { registerGenerators as regAvanzada }   from './blocks/avanzada.js';
import { registerGenerators as regTiempo }     from './blocks/tiempo.js';
import { registerGenerators as regSerial }     from './blocks/serial.js';
import { registerGenerators as regServo }      from './blocks/servo.js';
import { registerGenerators as regLcd }        from './blocks/lcd.js';
import { registerGenerators as regSensores }   from './blocks/sensores.js';
import { registerGenerators as regMotor }      from './blocks/motor.js';
import { registerGenerators as regMatematicas } from './blocks/matematicas.js';
import { registerGenerators as regVariables }  from './blocks/variables.js';
import { registerGenerators as regArrays }     from './blocks/arrays.js';
import { registerGenerators as regBucles }     from './blocks/bucles.js';
import { registerGenerators as regAfmotor }    from './blocks/afmotor.js';

regEstructura(cppGenerator);
regDigital(cppGenerator);
regAnaloga(cppGenerator);
regAvanzada(cppGenerator);
regTiempo(cppGenerator);
regSerial(cppGenerator);
regServo(cppGenerator);
regLcd(cppGenerator);
regSensores(cppGenerator);
regMotor(cppGenerator);
regMatematicas(cppGenerator);
regVariables(cppGenerator);
regArrays(cppGenerator);
regBucles(cppGenerator);
regAfmotor(cppGenerator);

// ═══ Generadores built-in de Blockly ═══════════

// ── controls_for (for loop con índices) ───────
cppGenerator.forBlock['controls_for'] = function(block) {
  const varName = cppGenerator.nameDB_.getName(
    block.getFieldValue('VAR'), 'VARIABLE'
  );
  const from = cppGenerator.valueToCode(block, 'FROM',
    cppGenerator.ORDER_NONE) || '0';
  const to = cppGenerator.valueToCode(block, 'TO',
    cppGenerator.ORDER_NONE) || '0';
  const by = cppGenerator.valueToCode(block, 'BY',
    cppGenerator.ORDER_NONE) || '1';
  const branch = cppGenerator.statementToCode(block, 'DO');

  let code = 'for (int ' + varName + ' = ' + from + '; '
           + varName + ' <= ' + to + '; '
           + varName + ' += ' + by + ') {\n';
  code += branch || '  //\n';
  code += '}\n';
  return code;
};

// ── math_number ──────────────────────────────
cppGenerator.forBlock['math_number'] = function(block) {
  const num = Number(block.getFieldValue('NUM'));
  const code = String(num);
  return [code, cppGenerator.ORDER_ATOMIC];
};

// ── math_arithmetic ──────────────────────────
cppGenerator.forBlock['math_arithmetic'] = function(block) {
  const op = block.getFieldValue('OP');
  const orderMap = {
    'ADD': cppGenerator.ORDER_ADDITIVE,
    'MINUS': cppGenerator.ORDER_ADDITIVE,
    'MULTIPLY': cppGenerator.ORDER_MULTIPLICATIVE,
    'DIVIDE': cppGenerator.ORDER_MULTIPLICATIVE,
    'POWER': cppGenerator.ORDER_UNARY  // pow() is a function call
  };
  const opSymbolMap = {
    'ADD': ' + ', 'MINUS': ' - ', 'MULTIPLY': ' * ',
    'DIVIDE': ' / ', 'POWER': ' ^ '
  };
  const order = orderMap[op];
  const lhs = cppGenerator.valueToCode(block, 'A', order);
  const rhs = cppGenerator.valueToCode(block, 'B', order);

  if (op === 'POWER') {
    // Arduino doesn't have ^ for power. Use pow().
    return ['pow(' + lhs + ', ' + rhs + ')', cppGenerator.ORDER_ATOMIC];
  }

  return [lhs + opSymbolMap[op] + rhs, order];
};

// ── math_number_property ─────────────────────
cppGenerator.forBlock['math_number_property'] = function(block) {
  const num = cppGenerator.valueToCode(block, 'NUMBER_TO_CHECK', cppGenerator.ORDER_MULTIPLICATIVE);
  const prop = block.getFieldValue('PROPERTY');
  switch (prop) {
    case 'EVEN':  return [num + ' % 2 == 0', cppGenerator.ORDER_EQUALITY];
    case 'ODD':   return [num + ' % 2 == 1', cppGenerator.ORDER_EQUALITY];
    case 'PRIME':
      cppGenerator._needsIsPrime = true;
      return ['isPrime(' + num + ')', cppGenerator.ORDER_ATOMIC];
    case 'WHOLE': return [num + ' == (int)(' + num + ')', cppGenerator.ORDER_EQUALITY];
    case 'POSITIVE': return [num + ' > 0', cppGenerator.ORDER_RELATIONAL];
    case 'NEGATIVE': return [num + ' < 0', cppGenerator.ORDER_RELATIONAL];
    case 'DIVISIBLE_BY': {
      const div = cppGenerator.valueToCode(block, 'DIVISOR', cppGenerator.ORDER_MULTIPLICATIVE);
      return [num + ' % ' + div + ' == 0', cppGenerator.ORDER_EQUALITY];
    }
  }
  return ['0', cppGenerator.ORDER_ATOMIC];
};

// ── logic_boolean ────────────────────────────
cppGenerator.forBlock['logic_boolean'] = function(block) {
  return [block.getFieldValue('BOOL') === 'TRUE' ? 'true' : 'false',
          cppGenerator.ORDER_ATOMIC];
};

// ── logic_compare ────────────────────────────
cppGenerator.forBlock['logic_compare'] = function(block) {
  const op = block.getFieldValue('OP');
  const opMap = {
    'EQ': ' == ', 'NEQ': ' != ', 'LT': ' < ',
    'LTE': ' <= ', 'GT': ' > ', 'GTE': ' >= '
  };
  const order = (op === 'EQ' || op === 'NEQ')
    ? cppGenerator.ORDER_EQUALITY
    : cppGenerator.ORDER_RELATIONAL;
  const lhs = cppGenerator.valueToCode(block, 'A', order);
  const rhs = cppGenerator.valueToCode(block, 'B', order);
  return [lhs + opMap[op] + rhs, order];
};

// ── logic_operation ──────────────────────────
cppGenerator.forBlock['logic_operation'] = function(block) {
  const op = block.getFieldValue('OP');
  const order = (op === 'AND')
    ? cppGenerator.ORDER_LOGICAL_AND
    : cppGenerator.ORDER_LOGICAL_OR;
  const lhs = cppGenerator.valueToCode(block, 'A', order);
  const rhs = cppGenerator.valueToCode(block, 'B', order);
  return [lhs + (op === 'AND' ? ' && ' : ' || ') + rhs, order];
};

// ── logic_negate ─────────────────────────────
cppGenerator.forBlock['logic_negate'] = function(block) {
  const val = cppGenerator.valueToCode(block, 'BOOL', cppGenerator.ORDER_UNARY);
  return ['!' + val, cppGenerator.ORDER_UNARY];
};

// ── controls_if ──────────────────────────────
cppGenerator.forBlock['controls_if'] = function(block) {
  let code = '';
  let n = 0;
  let cond, branch;

  do {
    cond = cppGenerator.valueToCode(block, 'IF' + n, cppGenerator.ORDER_NONE);
    branch = cppGenerator.statementToCode(block, 'DO' + n);
    if (!cond) cond = 'false';

    code += (n === 0 ? 'if (' : ' else if (') + cond + ') {\n';
    code += branch || '  //\n';
    code += '}';
    n++;
  } while (block.getInput('IF' + n));

  if (block.getInput('ELSE') || n === 0) {
    branch = cppGenerator.statementToCode(block, 'ELSE');
    code += ' else {\n' + (branch || '  //\n') + '}';
  }

  return code + '\n';
};

// ── controls_repeat_ext (for loop) ───────────
cppGenerator.forBlock['controls_repeat_ext'] = function(block) {
  const times = cppGenerator.valueToCode(block, 'TIMES', cppGenerator.ORDER_NONE) || '1';
  const branch = cppGenerator.statementToCode(block, 'DO');
  const loopVar = cppGenerator.nameDB_.getDistinctName('i', 'VARIABLE');
  let code = 'for (int ' + loopVar + ' = 0; ' + loopVar + ' < ' + times + '; ' + loopVar + '++) {\n';
  code += branch || '  //\n';
  code += '}\n';
  return code;
};

// ── controls_whileUntil ──────────────────────
cppGenerator.forBlock['controls_whileUntil'] = function(block) {
  const mode = block.getFieldValue('MODE');
  const cond = cppGenerator.valueToCode(block, 'BOOL', cppGenerator.ORDER_NONE) || 'false';
  const branch = cppGenerator.statementToCode(block, 'DO');

  if (mode === 'UNTIL') {
    // until → while (!cond)
    let code = 'while (!(' + cond + ')) {\n';
    code += branch || '  //\n';
    code += '}\n';
    return code;
  }

  let code = 'while (' + cond + ') {\n';
  code += branch || '  //\n';
  code += '}\n';
  return code;
};

// ── variables_get ────────────────────────────
cppGenerator.forBlock['variables_get'] = function(block) {
  // Usar nombre amigable, no el interno ofuscado de Blockly
  const name = block.getField('VAR')?.getText() || block.getFieldValue('VAR');
  return [name, cppGenerator.ORDER_ATOMIC];
};

// ── variables_set ────────────────────────────
cppGenerator.forBlock['variables_set'] = function(block) {
  const name = block.getField('VAR')?.getText() || block.getFieldValue('VAR');
  const value = cppGenerator.valueToCode(block, 'VALUE', cppGenerator.ORDER_ASSIGNMENT);
  return name + ' = ' + value + ';\n';
};

// ── text (string literal) ────────────────────
cppGenerator.forBlock['text'] = function(block) {
  const text = block.getFieldValue('TEXT');
  return ['"' + text.replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"',
          cppGenerator.ORDER_ATOMIC];
};

// ── text_join ────────────────────────────────
cppGenerator.forBlock['text_join'] = function(block) {
  const n = block.itemCount_;
  const parts = [];
  for (let i = 0; i < n; i++) {
    const val = cppGenerator.valueToCode(block, 'ADD' + i, cppGenerator.ORDER_ADDITIVE);
    parts.push('String(' + val + ')');
  }
  return [parts.join(' + '), cppGenerator.ORDER_ADDITIVE];
};

// ── text_print (lo mapeamos a Serial.println) ─
cppGenerator.forBlock['text_print'] = function(block) {
  const text = cppGenerator.valueToCode(block, 'TEXT', cppGenerator.ORDER_NONE) || '""';
  return 'Serial.println(' + text + ');\n';
};

// ── text_length ──────────────────────────────
cppGenerator.forBlock['text_length'] = function(block) {
  const val = cppGenerator.valueToCode(block, 'VALUE', cppGenerator.ORDER_ATOMIC);
  return [val + '.length()', cppGenerator.ORDER_ATOMIC];
};

// ── math_modulo ──────────────────────────────
cppGenerator.forBlock['math_modulo'] = function(block) {
  const lhs = cppGenerator.valueToCode(block, 'DIVIDEND', cppGenerator.ORDER_MULTIPLICATIVE);
  const rhs = cppGenerator.valueToCode(block, 'DIVISOR', cppGenerator.ORDER_MULTIPLICATIVE);
  return [lhs + ' % ' + rhs, cppGenerator.ORDER_MULTIPLICATIVE];
};

// ── math_random_int ──────────────────────────
cppGenerator.forBlock['math_random_int'] = function(block) {
  const from = cppGenerator.valueToCode(block, 'FROM', cppGenerator.ORDER_NONE);
  const to   = cppGenerator.valueToCode(block, 'TO', cppGenerator.ORDER_NONE);
  return ['random(' + from + ', ' + to + ' + 1)', cppGenerator.ORDER_ATOMIC];
};

// ── math_constrain ───────────────────────────
cppGenerator.forBlock['math_constrain'] = function(block) {
  const val = cppGenerator.valueToCode(block, 'VALUE', cppGenerator.ORDER_NONE);
  const low = cppGenerator.valueToCode(block, 'LOW', cppGenerator.ORDER_NONE);
  const high = cppGenerator.valueToCode(block, 'HIGH', cppGenerator.ORDER_NONE);
  return ['constrain(' + val + ', ' + low + ', ' + high + ')', cppGenerator.ORDER_ATOMIC];
};

// ── math_single (trig, sqrt etc) ─────────────
cppGenerator.forBlock['math_single'] = function(block) {
  const op = block.getFieldValue('OP');
  const arg = cppGenerator.valueToCode(block, 'NUM', cppGenerator.ORDER_NONE);
  const funcMap = {
    'ROOT': 'sqrt', 'ABS': 'abs', 'NEG': '-', 'LN': 'log',
    'LOG10': 'log10', 'EXP': 'exp', 'POW10': 'pow10',
    'SIN': 'sin', 'COS': 'cos', 'TAN': 'tan',
    'ASIN': 'asin', 'ACOS': 'acos', 'ATAN': 'atan'
  };
  // pow10() no existe en AVR libc — usar pow(10.0, x)
  if (op === 'POW10') {
    return ['pow(10.0, ' + arg + ')', cppGenerator.ORDER_ATOMIC];
  }
  const func = funcMap[op] || op.toLowerCase();
  if (func === '-') {
    return ['-' + arg, cppGenerator.ORDER_UNARY];
  }
  return [func + '(' + arg + ')', cppGenerator.ORDER_ATOMIC];
};


// ── Funciones (procedures) ─────────────────────
// Las definiciones se acumulan para emitirlas al
// principio del sketch (scope global, antes de setup).

cppGenerator.forBlock['procedures_defnoreturn'] = function(block) {
  const name = block.getFieldValue('NAME') || 'miFuncion';
  const body = cppGenerator.statementToCode(block, 'STACK') || '  //\n';

  let params = [];
  try {
    const model = block.getProcedureModel?.();
    if (model) {
      const procParams = model.getParameters?.() || [];
      params = procParams.map(p => {
        const pName = p.getName?.() || 'p';
        const types = p.getTypes?.() || [];
        const cppType = (types[0]) || 'int';
        return cppType + ' ' + pName;
      });
    }
  } catch (_) { /* sin modelo, sin params */ }

  cppGenerator._procedureDefs = cppGenerator._procedureDefs || [];
  cppGenerator._procedureDefs.push({
    name, params: params.join(', '), body, returnType: 'void'
  });
  return '';
};

cppGenerator.forBlock['procedures_defreturn'] = function(block) {
  const name = block.getFieldValue('NAME') || 'miFuncion';
  const body = cppGenerator.statementToCode(block, 'STACK') || '  //\n';
  const retVal = cppGenerator.valueToCode(block, 'RETURN', cppGenerator.ORDER_NONE) || '0';

  let params = [];
  try {
    const model = block.getProcedureModel?.();
    if (model) {
      const procParams = model.getParameters?.() || [];
      params = procParams.map(p => {
        const pName = p.getName?.() || 'p';
        const types = p.getTypes?.() || [];
        const cppType = (types[0]) || 'int';
        return cppType + ' ' + pName;
      });
    }
  } catch (_) { /* sin modelo, sin params */ }

  cppGenerator._procedureDefs = cppGenerator._procedureDefs || [];
  cppGenerator._procedureDefs.push({
    name,
    params: params.join(', '),
    body: body + '  return ' + retVal + ';\n',
    returnType: 'int'
  });
  return '';
};

cppGenerator.forBlock['procedures_callnoreturn'] = function(block) {
  const name = block.getFieldValue('NAME') || 'miFuncion';
  let args = [];
  try {
    const model = block.getProcedureModel?.();
    if (model) {
      const procParams = model.getParameters?.() || [];
      args = procParams.map((_, i) => {
        return cppGenerator.valueToCode(block, 'ARG' + i, cppGenerator.ORDER_NONE) || '0';
      });
    }
  } catch (_) { /* sin modelo, sin args */ }
  return name + '(' + args.join(', ') + ');\n';
};

cppGenerator.forBlock['procedures_callreturn'] = function(block) {
  const name = block.getFieldValue('NAME') || 'miFuncion';
  let args = [];
  try {
    const model = block.getProcedureModel?.();
    if (model) {
      const procParams = model.getParameters?.() || [];
      args = procParams.map((_, i) => {
        return cppGenerator.valueToCode(block, 'ARG' + i, cppGenerator.ORDER_NONE) || '0';
      });
    }
  } catch (_) { /* sin modelo, sin args */ }
  return [name + '(' + args.join(', ') + ')', cppGenerator.ORDER_ATOMIC];
};


export function generateArduinoCode(workspace) {
  let setupBody = '';
  let loopBody = '';
  let globals = '';

  // Resetear estado de ISR + librerías (se llenan durante blockToCode)
  cppGenerator._isrBodies = [];
  cppGenerator._procedureDefs = [];
  cppGenerator._lcdInstances = [];
  cppGenerator._lcdI2cInstances = [];
  cppGenerator._dhtInstances = [];
  cppGenerator._usInstances = [];
  cppGenerator._stepperInstances = [];
  cppGenerator._afmotorDcInstances = [];
  cppGenerator._afmotorStepperInstances = [];
  cppGenerator._needsIsPrime = false;

  const topBlocks = workspace.getTopBlocks(true);

  for (const block of topBlocks) {
    if (block.type === 'arduino_setup') {
      setupBody = cppGenerator.blockToCode(block);
    } else if (block.type === 'arduino_loop') {
      loopBody = cppGenerator.blockToCode(block);
    } else {
      const code = cppGenerator.blockToCode(block);
      globals += code;
    }
  }

  // Detectar librerías usadas (para generar #include + objetos globales)
  const allBlocks = workspace.getAllBlocks(false);
  const servoNames = new Set();
  const lcdNames = new Set();
  const lcdI2cNames = new Set();
  const dhtNames = new Set();
  const stepperNames = new Set();
  const usNames = new Set();

  for (const b of allBlocks) {
    if (b.type === 'servo_create') {
      const n = (b.getFieldValue('NAME') || '').trim();
      if (n) servoNames.add(n);
    } else if (b.type === 'lcd_create') {
      const n = (b.getFieldValue('NAME') || '').trim();
      if (n) lcdNames.add(n);
    } else if (b.type === 'lcd_i2c_create') {
      const n = (b.getFieldValue('NAME') || '').trim();
      if (n) lcdI2cNames.add(n);
    } else if (b.type === 'dht_create') {
      const n = (b.getFieldValue('NAME') || '').trim();
      if (n) dhtNames.add(n);
    } else if (b.type === 'stepper_create') {
      const n = (b.getFieldValue('NAME') || '').trim();
      if (n) stepperNames.add(n);
    } else if (b.type === 'ultrasonic_create') {
      const n = (b.getFieldValue('NAME') || '').trim();
      if (n) usNames.add(n);
    }
  }

  // ── Recolectar #include: bloque include_header + tabs .h del proyecto ──
  const userIncludes = [];

  // 1. Bloques include_header y library_include del workspace
  for (const b of allBlocks) {
    if (b.type === 'include_header') {
      const file = (b.getFieldValue('FILE') || '').trim();
      if (file) userIncludes.push(file);
    } else if (b.type === 'library_include') {
      const lib = (b.getFieldValue('LIB') || '').trim();
      if (lib) userIncludes.push(lib);
    }
  }

  // 2. Tabs .h con contenido (desde TabManager)
  if (window._tabManager) {
    const tabs = window._tabManager.getTabs();
    for (const tab of tabs) {
      if (tab.content && tab.content.trim() && tab.filename) {
        userIncludes.push(tab.filename);
      }
    }
  }

  let sketch = '';

  // ── Servo ──
  if (servoNames.size > 0) {
    sketch += '#include <Servo.h>\n';
    for (const name of servoNames) {
      sketch += 'Servo ' + name + ';\n';
    }
    sketch += '\n';
  }

  // ── LCD ──
  if (lcdNames.size > 0) {
    sketch += '#include <LiquidCrystal.h>\n';
    for (const inst of cppGenerator._lcdInstances) {
      sketch += 'LiquidCrystal ' + inst.name + '(' + inst.rs + ', ' + inst.en + ', '
                + inst.d4 + ', ' + inst.d5 + ', ' + inst.d6 + ', ' + inst.d7 + ');\n';
    }
    sketch += '\n';
  }

  // ── LCD I2C ──
  if (lcdI2cNames.size > 0) {
    sketch += '#include <LiquidCrystal_I2C.h>\n';
    for (const inst of cppGenerator._lcdI2cInstances) {
      sketch += 'LiquidCrystal_I2C ' + inst.name + '(' + inst.addr + ', ' + inst.cols + ', ' + inst.rows + ');\n';
    }
    sketch += '\n';
  }

  // ── DHT ──
  if (dhtNames.size > 0) {
    sketch += '#include <DHT.h>\n';
    for (const inst of cppGenerator._dhtInstances) {
      sketch += 'DHT ' + inst.name + '(' + inst.pin + ', ' + inst.type + ');\n';
    }
    sketch += '\n';
  }

  // ── Stepper ──
  if (stepperNames.size > 0) {
    sketch += '#include <Stepper.h>\n';
    for (const inst of cppGenerator._stepperInstances) {
      sketch += 'Stepper ' + inst.name + '(' + inst.steps + ', ' + inst.p1 + ', ' + inst.p2 + ', ' + inst.p3 + ', ' + inst.p4 + ');\n';
    }
    sketch += '\n';
  }

  // ── AFMotor DC ──
  if (cppGenerator._afmotorDcInstances.length > 0) {
    for (const inst of cppGenerator._afmotorDcInstances) {
      sketch += 'AF_DCMotor ' + inst.name + '(' + inst.channel + ');\n';
    }
    sketch += '\n';
  }

  // ── AFMotor Stepper ──
  if (cppGenerator._afmotorStepperInstances.length > 0) {
    for (const inst of cppGenerator._afmotorStepperInstances) {
      sketch += 'AF_Stepper ' + inst.name + '(' + inst.steps + ', ' + inst.channel + ');\n';
    }
    sketch += '\n';
  }

  // ── Ultrasonic helpers ──
  if (usNames.size > 0) {
    for (const inst of cppGenerator._usInstances) {
      sketch += '// Helper para sensor ultrasónico ' + inst.name + '\n';
      sketch += 'float ' + inst.name + '_read() {\n';
      sketch += '  digitalWrite(' + inst.trig + ', LOW);\n';
      sketch += '  delayMicroseconds(2);\n';
      sketch += '  digitalWrite(' + inst.trig + ', HIGH);\n';
      sketch += '  delayMicroseconds(10);\n';
      sketch += '  digitalWrite(' + inst.trig + ', LOW);\n';
      sketch += '  long duration = pulseIn(' + inst.echo + ', HIGH);\n';
      sketch += '  return duration * 0.034 / 2;\n';
      sketch += '}\n\n';
    }
  }

  // Helper: isPrime() para bloque math_number_property PRIME
  if (cppGenerator._needsIsPrime) {
    sketch += '// Helper — verifica si un número es primo\n';
    sketch += 'bool isPrime(long n) {\n';
    sketch += '  if (n < 2) return false;\n';
    sketch += '  for (long i = 2; i * i <= n; i++) {\n';
    sketch += '    if (n % i == 0) return false;\n';
    sketch += '  }\n';
    sketch += '  return true;\n';
    sketch += '}\n\n';
  }

  // ── Includes de archivos .h del proyecto ──
  if (userIncludes.length > 0) {
    const seen = new Set();
    for (const file of userIncludes) {
      if (seen.has(file)) continue;
      seen.add(file);
      sketch += '#include "' + file + '"\n';
    }
    sketch += '\n';
  }

  // Emitir ISR functions (de attach_interrupt)
  if (cppGenerator._isrBodies.length > 0) {
    // Deduplicar por nombre (si hay varios attach_interrupt al mismo pin)
    const seen = new Set();
    for (const isr of cppGenerator._isrBodies) {
      if (seen.has(isr.name)) continue;
      seen.add(isr.name);
      sketch += 'void ' + isr.name + '() {\n';
      sketch += isr.body;
      sketch += '}\n\n';
    }
  }

  // Emitir definiciones de funciones (procedures)
  if (cppGenerator._procedureDefs.length > 0) {
    const seen = new Set();
    for (const fn of cppGenerator._procedureDefs) {
      if (seen.has(fn.name)) continue;
      seen.add(fn.name);
      sketch += fn.returnType + ' ' + fn.name
             + (fn.params ? '(' + fn.params + ')' : '()')
             + ' {\n';
      sketch += fn.body;
      sketch += '}\n\n';
    }
  }

  if (globals.trim()) {
    sketch += globals.trim() + '\n\n';
  }

  sketch += 'void setup() {\n';
  sketch += setupBody || '  // sin configuración\n';
  sketch += '}\n\n';

  sketch += 'void loop() {\n';
  sketch += loopBody || '  // sin bucle\n';
  sketch += '}\n';

  return sketch;
}