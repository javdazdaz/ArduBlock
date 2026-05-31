/**
 * ArduBlock — Generador de Código C++ para Arduino
 *
 * Traduce bloques Blockly → código C++ válido para sketches de Arduino.
 * Soporta bloques Arduino personalizados + bloques built-in (lógica,
 * matemáticas, bucles, condicionales, variables, texto).
 */

import * as Blockly from 'blockly';

// ── Generador C++ ─────────────────────────────
const cppGenerator = new Blockly.Generator('CPP');

// Inicializar nameDB para variables (no se auto-crea en v12)
cppGenerator.nameDB_ = new Blockly.Names('_');

// ── Precedencia (orden de paréntesis) ─────────
cppGenerator.ORDER_ATOMIC         = 0;   // 0 ""    number, var, literal
cppGenerator.ORDER_UNARY          = 2;   // 2 ! - ~
cppGenerator.ORDER_MULTIPLICATIVE = 3;   // 3 * / %
cppGenerator.ORDER_ADDITIVE       = 4;   // 4 + -
cppGenerator.ORDER_RELATIONAL     = 5;   // 5 < <= > >=
cppGenerator.ORDER_EQUALITY       = 6;   // 6 == !=
cppGenerator.ORDER_LOGICAL_AND    = 7;   // 7 &&
cppGenerator.ORDER_LOGICAL_OR     = 8;   // 8 ||
cppGenerator.ORDER_ASSIGNMENT     = 1.1; // 1.1 =
cppGenerator.ORDER_NONE           = 99;  // statements

// ── Indentación ───────────────────────────────
cppGenerator.INDENT = '  ';

// ── init (reserva de variables) ───────────────
cppGenerator.init = function(workspace) {};

// ── scrub_ (limpieza de nombres) ──────────────
cppGenerator.scrub_ = function(block, code, thisOnly) {
  const nextBlock = block.getNextBlock();
  if (nextBlock && !thisOnly) {
    return code + '\n' + cppGenerator.blockToCode(nextBlock);
  }
  return code;
};

// ═══════════════════════════════════════════════
//  GENERADORES DE BLOQUES ARDUINO
// ═══════════════════════════════════════════════

// ── arduino_setup ────────────────────────────
cppGenerator.forBlock['arduino_setup'] = function(block) {
  const body = cppGenerator.statementToCode(block, 'BODY');
  return body || '  // sin instrucciones\n';
};

// ── arduino_loop ─────────────────────────────
cppGenerator.forBlock['arduino_loop'] = function(block) {
  const body = cppGenerator.statementToCode(block, 'BODY');
  return body || '  // sin instrucciones\n';
};

// ── pin_mode ────────────────────────────────
cppGenerator.forBlock['pin_mode'] = function(block) {
  const pin  = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');
  return 'pinMode(' + pin + ', ' + mode + ');\n';
};

// ── digital_write ────────────────────────────
cppGenerator.forBlock['digital_write'] = function(block) {
  const pin   = block.getFieldValue('PIN');
  const value = block.getFieldValue('VALUE');
  return 'digitalWrite(' + pin + ', ' + value + ');\n';
};

// ── digital_read ─────────────────────────────
cppGenerator.forBlock['digital_read'] = function(block) {
  const pin = block.getFieldValue('PIN');
  return ['digitalRead(' + pin + ')', cppGenerator.ORDER_ATOMIC];
};

// ── analog_write ─────────────────────────────
cppGenerator.forBlock['analog_write'] = function(block) {
  const pin   = block.getFieldValue('PIN');
  const value = block.getFieldValue('VALUE');
  return 'analogWrite(' + pin + ', ' + value + ');\n';
};

// ── analog_read ──────────────────────────────
cppGenerator.forBlock['analog_read'] = function(block) {
  const pin = block.getFieldValue('PIN');
  return ['analogRead(A' + pin + ')', cppGenerator.ORDER_ATOMIC];
};

// ── delay_ms ─────────────────────────────────
cppGenerator.forBlock['delay_ms'] = function(block) {
  const ms = block.getFieldValue('MS');
  return 'delay(' + ms + ');\n';
};

// ── serial_begin ─────────────────────────────
cppGenerator.forBlock['serial_begin'] = function(block) {
  const baud = block.getFieldValue('BAUD');
  return 'Serial.begin(' + baud + ');\n';
};

// ── serial_print ─────────────────────────────
cppGenerator.forBlock['serial_print'] = function(block) {
  const text = cppGenerator.valueToCode(block, 'TEXT', cppGenerator.ORDER_NONE) || '""';
  return 'Serial.print(' + text + ');\n';
};

// ── serial_println ───────────────────────────
cppGenerator.forBlock['serial_println'] = function(block) {
  const text = cppGenerator.valueToCode(block, 'TEXT', cppGenerator.ORDER_NONE) || '""';
  return 'Serial.println(' + text + ');\n';
};

// ── servo_create (declara + attach) ──────────
cppGenerator.forBlock['servo_create'] = function(block) {
  const name = block.getFieldValue('NAME').trim() || 'servo';
  const pin  = block.getFieldValue('PIN');
  // La declaración `Servo nombre;` se maneja en generateArduinoCode
  return name + '.attach(' + pin + ');\n';
};

// ── servo_write ──────────────────────────────
cppGenerator.forBlock['servo_write'] = function(block) {
  const name  = block.getFieldValue('NAME').trim() || 'servo';
  const angle = block.getFieldValue('ANGLE');
  return name + '.write(' + angle + ');\n';
};

// ── servo_write_us ───────────────────────────
cppGenerator.forBlock['servo_write_us'] = function(block) {
  const name = block.getFieldValue('NAME').trim() || 'servo';
  const us   = block.getFieldValue('US');
  return name + '.writeMicroseconds(' + us + ');\n';
};

// ═══════════════════════════════════════════════
//  GENERADORES DE BLOQUES BUILT-IN → C++
// ═══════════════════════════════════════════════

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
  let lhs = cppGenerator.valueToCode(block, 'A', order);
  let rhs = cppGenerator.valueToCode(block, 'B', order);

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
  const func = funcMap[op] || op.toLowerCase();
  if (func === '-') {
    return ['-' + arg, cppGenerator.ORDER_UNARY];
  }
  return [func + '(' + arg + ')', cppGenerator.ORDER_ATOMIC];
};

// ── tone_output ───────────────────────────────
cppGenerator.forBlock['tone_output'] = function(block) {
  const pin  = block.getFieldValue('PIN');
  const freq = block.getFieldValue('FREQ');
  return 'tone(' + pin + ', ' + freq + ');\n';
};

// ── tone_duration ─────────────────────────────
cppGenerator.forBlock['tone_duration'] = function(block) {
  const pin  = block.getFieldValue('PIN');
  const freq = block.getFieldValue('FREQ');
  const dur  = block.getFieldValue('DURATION');
  return 'tone(' + pin + ', ' + freq + ', ' + dur + ');\n';
};

// ── no_tone_output ────────────────────────────
cppGenerator.forBlock['no_tone_output'] = function(block) {
  const pin = block.getFieldValue('PIN');
  return 'noTone(' + pin + ');\n';
};

// ── map_value (expression) ────────────────────
cppGenerator.forBlock['map_value'] = function(block) {
  const val     = cppGenerator.valueToCode(block, 'VALUE', cppGenerator.ORDER_NONE);
  const fromLow  = block.getFieldValue('FROM_LOW');
  const fromHigh = block.getFieldValue('FROM_HIGH');
  const toLow    = block.getFieldValue('TO_LOW');
  const toHigh   = block.getFieldValue('TO_HIGH');
  return ['map(' + val + ', ' + fromLow + ', ' + fromHigh + ', ' + toLow + ', ' + toHigh + ')',
          cppGenerator.ORDER_ATOMIC];
};

// ── pulse_in (expression) ─────────────────────
cppGenerator.forBlock['pulse_in'] = function(block) {
  const pin     = block.getFieldValue('PIN');
  const value   = block.getFieldValue('VALUE');
  const timeout = block.getFieldValue('TIMEOUT');
  return ['pulseIn(' + pin + ', ' + value + ', ' + timeout + ')', cppGenerator.ORDER_ATOMIC];
};

// ── attach_interrupt ──────────────────────────
// Genera attachInterrupt() donde se coloca + guarda ISR para emitir como global
cppGenerator._isrBodies = [];

cppGenerator.forBlock['attach_interrupt'] = function(block) {
  const pin  = block.getFieldValue('PIN');
  const mode = block.getFieldValue('MODE');
  const body = cppGenerator.statementToCode(block, 'BODY') || '  // sin código\n';
  const isrName = 'isr_pin' + pin;

  // Guardar ISR para emitir en scope global
  cppGenerator._isrBodies.push({ name: isrName, pin: pin, body: body });

  return 'attachInterrupt(digitalPinToInterrupt(' + pin + '), ' + isrName + ', ' + mode + ');\n';
};

// ── lcd_create ─────────────────────────────────
cppGenerator._lcdInstances = [];
cppGenerator.forBlock['lcd_create'] = function(block) {
  const name = block.getFieldValue('NAME') || 'lcd';
  const rs = block.getFieldValue('RS');
  const en = block.getFieldValue('EN');
  const d4 = block.getFieldValue('D4');
  const d5 = block.getFieldValue('D5');
  const d6 = block.getFieldValue('D6');
  const d7 = block.getFieldValue('D7');
  const cols = block.getFieldValue('COLS');
  const rows = block.getFieldValue('ROWS');
  cppGenerator._lcdInstances.push({ name, rs, en, d4, d5, d6, d7, cols, rows });
  return name + '.begin(' + cols + ', ' + rows + ');\n';
};

// ── lcd_print ──────────────────────────────────
cppGenerator.forBlock['lcd_print'] = function(block) {
  const name = block.getFieldValue('NAME') || 'lcd';
  const text = cppGenerator.valueToCode(block, 'TEXT', cppGenerator.ORDER_NONE) || '""';
  return name + '.print(' + text + ');\n';
};

// ── lcd_set_cursor ─────────────────────────────
cppGenerator.forBlock['lcd_set_cursor'] = function(block) {
  const name = block.getFieldValue('NAME') || 'lcd';
  const col = block.getFieldValue('COL');
  const row = block.getFieldValue('ROW');
  return name + '.setCursor(' + col + ', ' + row + ');\n';
};

// ── lcd_clear ──────────────────────────────────
cppGenerator.forBlock['lcd_clear'] = function(block) {
  const name = block.getFieldValue('NAME') || 'lcd';
  return name + '.clear();\n';
};

// ── lcd_i2c_create ────────────────────────────
cppGenerator._lcdI2cInstances = [];
cppGenerator.forBlock['lcd_i2c_create'] = function(block) {
  const name = block.getFieldValue('NAME') || 'lcd';
  const addr = block.getFieldValue('ADDR');
  const cols = block.getFieldValue('COLS');
  const rows = block.getFieldValue('ROWS');
  cppGenerator._lcdI2cInstances.push({ name, addr, cols, rows });
  return name + '.init();\n  ' + name + '.backlight();\n';
};

// ── dht_create ─────────────────────────────────
cppGenerator._dhtInstances = [];
cppGenerator.forBlock['dht_create'] = function(block) {
  const name = block.getFieldValue('NAME') || 'dht';
  const pin  = block.getFieldValue('PIN');
  const type = block.getFieldValue('TYPE');
  cppGenerator._dhtInstances.push({ name, pin, type });
  return name + '.begin();\n';
};

// ── dht_temp ───────────────────────────────────
cppGenerator.forBlock['dht_temp'] = function(block) {
  const name = block.getFieldValue('NAME') || 'dht';
  return [name + '.readTemperature()', cppGenerator.ORDER_ATOMIC];
};

// ── dht_humidity ───────────────────────────────
cppGenerator.forBlock['dht_humidity'] = function(block) {
  const name = block.getFieldValue('NAME') || 'dht';
  return [name + '.readHumidity()', cppGenerator.ORDER_ATOMIC];
};

// ── ultrasonic_create ──────────────────────────
cppGenerator._usInstances = [];
cppGenerator.forBlock['ultrasonic_create'] = function(block) {
  const name = block.getFieldValue('NAME') || 'us';
  const trig = block.getFieldValue('TRIG');
  const echo = block.getFieldValue('ECHO');
  cppGenerator._usInstances.push({ name, trig, echo });
  return 'pinMode(' + trig + ', OUTPUT);\n' +
         '  pinMode(' + echo + ', INPUT);\n';
};

// ── ultrasonic_read ────────────────────────────
cppGenerator.forBlock['ultrasonic_read'] = function(block) {
  const name = block.getFieldValue('NAME') || 'us';
  // Buscar la instancia para obtener trig/echo
  const inst = cppGenerator._usInstances.find(i => i.name === name);
  if (!inst) return ['0', cppGenerator.ORDER_ATOMIC];
  return [name + '_read()', cppGenerator.ORDER_ATOMIC];
};

// ── stepper_create ─────────────────────────────
cppGenerator._stepperInstances = [];
cppGenerator.forBlock['stepper_create'] = function(block) {
  const name  = block.getFieldValue('NAME') || 'motor';
  const steps = block.getFieldValue('STEPS');
  const p1 = block.getFieldValue('P1');
  const p2 = block.getFieldValue('P2');
  const p3 = block.getFieldValue('P3');
  const p4 = block.getFieldValue('P4');
  cppGenerator._stepperInstances.push({ name, steps, p1, p2, p3, p4 });
  return '';  // constructor va global, nada que emitir aquí
};

// ── stepper_speed ──────────────────────────────
cppGenerator.forBlock['stepper_speed'] = function(block) {
  const name = block.getFieldValue('NAME') || 'motor';
  const rpm  = block.getFieldValue('RPM');
  return name + '.setSpeed(' + rpm + ');\n';
};

// ── stepper_step ───────────────────────────────
cppGenerator.forBlock['stepper_step'] = function(block) {
  const name  = block.getFieldValue('NAME') || 'motor';
  const count = block.getFieldValue('COUNT');
  return name + '.step(' + count + ');\n';
};
// ═══════════════════════════════════════════════
//  MÉTODO PRINCIPAL: workspaceToCode
//  Junta setup() + loop() → sketch completo
// ═══════════════════════════════════════════════

/**
 * Genera el sketch completo de Arduino desde el workspace.
 * Detecta bloques arduino_setup y arduino_loop automáticamente.
 * Bloques fuera de setup/loop van como declaraciones globales.
 */
export function generateArduinoCode(workspace) {
  let setupBody = '';
  let loopBody = '';
  let globals = '';

  // Resetear estado de ISR + librerías (se llenan durante blockToCode)
  cppGenerator._isrBodies = [];
  cppGenerator._lcdInstances = [];
  cppGenerator._lcdI2cInstances = [];
  cppGenerator._dhtInstances = [];
  cppGenerator._usInstances = [];
  cppGenerator._stepperInstances = [];
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
    sketch += 'bool isPrime(int n) {\n';
    sketch += '  if (n < 2) return false;\n';
    sketch += '  for (int i = 2; i * i <= n; i++) {\n';
    sketch += '    if (n % i == 0) return false;\n';
    sketch += '  }\n';
    sketch += '  return true;\n';
    sketch += '}\n\n';
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
