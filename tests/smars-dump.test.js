import { it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { generateArduinoCode } from '../frontend/js/generator.js';

/**
 * Genera el estado del ejemplo SMARS con ultrasónico a partir del sketch
 * `~/Arduino/Smars_Ultrasonico/Smars_Ultrasonico.ino`, y el C++ que produce.
 *
 *   SMARS_DUMP=1 SMARS_OUT=<dir> npx vitest run tests/smars-dump.test.js
 */
it.runIf(Boolean(process.env.SMARS_DUMP))('escribe el estado y el sketch del SMARS', () => {
  const base = process.env.SMARS_OUT || '/tmp/ardublock-smars';
  const ws = new Blockly.Workspace();
  const setup = ws.newBlock('arduino_setup');
  const loop = ws.newBlock('arduino_loop');

  const cadena = (bloques) => {
    for (let i = 0; i < bloques.length - 1; i++) {
      bloques[i].nextConnection.connect(bloques[i + 1].previousConnection);
    }
    return bloques[0];
  };

  // ── Includes y motores: bloques sueltos ──
  const include = ws.newBlock('library_include');
  include.setFieldValue('AFMotor_R4.h', 'LIB');

  const motores = [
    ['motorIzquierdo', '2'], ['motorDerecho', '1'],
  ];
  const creates = motores.map(([nombre, canal]) => {
    const b = ws.newBlock('afmotor_dc_create');
    b.setFieldValue(nombre, 'NAME');
    b.setFieldValue(canal, 'CHANNEL');
    return b;
  });

  // ── setup ──
  const serial = ws.newBlock('serial_begin');
  serial.setFieldValue('115200', 'BAUD');
  const sensor = ws.newBlock('ultrasonic_create');
  sensor.setFieldValue('us', 'NAME');
  // A1 y A0 del R4: los números de pin del core son 15 y 14.
  sensor.setFieldValue('15', 'TRIG');
  sensor.setFieldValue('14', 'ECHO');

  const velocidad = (v) => motores.map(([nombre]) => {
    const b = ws.newBlock('afmotor_dc_speed');
    b.setFieldValue(nombre, 'NAME');
    b.setFieldValue(String(v), 'SPEED');
    return b;
  });

  const mover = (sentidos) => motores.map(([nombre], i) => {
    const b = ws.newBlock('afmotor_dc_run');
    b.setFieldValue(nombre, 'NAME');
    b.setFieldValue(sentidos[i], 'DIR');
    return b;
  });

  const espera = (ms) => {
    const b = ws.newBlock('delay_ms');
    b.setFieldValue(String(ms), 'MS');
    return b;
  };

  setup.getInput('BODY').connection.connect(
    cadena([serial, sensor, ...velocidad(180), espera(500)]).previousConnection
  );

  // ── loop ──
  const etiqueta = ws.newBlock('serial_print');
  const textoEtiqueta = ws.newBlock('text');
  textoEtiqueta.setFieldValue('Distancia: ', 'TEXT');
  etiqueta.getInput('TEXT').connection.connect(textoEtiqueta.outputConnection);

  const lectura = (() => {
    const b = ws.newBlock('ultrasonic_read');
    b.setFieldValue('us', 'NAME');
    return b;
  })();
  const declarar = ws.newBlock('variable_declare');
  declarar.setFieldValue('distancia', 'NAME');
  declarar.setFieldValue('long', 'TYPE');
  declarar.getInput('VALUE').connection.connect(lectura.outputConnection);

  const leerDistancia = () => {
    const b = ws.newBlock('variable_get');
    b.setFieldValue('distancia', 'NAME');
    return b;
  };

  const imprimirLectura = ws.newBlock('serial_print');
  imprimirLectura.getInput('TEXT').connection.connect(leerDistancia().outputConnection);

  const unidad = ws.newBlock('serial_println');
  const textoUnidad = ws.newBlock('text');
  textoUnidad.setFieldValue(' cm', 'TEXT');
  unidad.getInput('TEXT').connection.connect(textoUnidad.outputConnection);

  const si = Blockly.serialization.blocks.append(
    { type: 'controls_if', extraState: { elseIfCount: 0, hasElse: true } }, ws
  );
  const compara = ws.newBlock('logic_compare');
  compara.setFieldValue('LTE', 'OP');
  const limite = ws.newBlock('math_number');
  limite.setFieldValue('20', 'NUM');
  compara.getInput('A').connection.connect(leerDistancia().outputConnection);
  compara.getInput('B').connection.connect(limite.outputConnection);

  // Obstáculo: retroceder, girar a la derecha y seguir.
  const esquiva = [
    ...velocidad(170),
    ...mover(['BACKWARD', 'FORWARD']),  // retroceder
    espera(300),
    ...mover(['RELEASE', 'RELEASE']),
    ...mover(['FORWARD', 'FORWARD']),   // girar a la derecha
    espera(400),
    ...mover(['RELEASE', 'RELEASE']),
    ...velocidad(180),
  ];
  // Camino libre: avanzar.
  const avance = [
    ...mover(['FORWARD', 'BACKWARD']),
    espera(50),
  ];

  si.getInput('IF0').connection.connect(compara.outputConnection);
  si.getInput('DO0').connection.connect(cadena(esquiva).previousConnection);
  si.getInput('ELSE').connection.connect(cadena(avance).previousConnection);

  loop.getInput('BODY').connection.connect(
    cadena([declarar, etiqueta, imprimirLectura, unidad, si]).previousConnection
  );

  const estado = Blockly.serialization.workspaces.save(ws);
  const sketch = generateArduinoCode(ws);
  ws.dispose();

  // Ids legibles, como los demás ejemplos del menú.
  const prefijo = new Map();
  let n = 0;
  const renombrar = (nodo) => {
    if (Array.isArray(nodo)) { nodo.forEach(renombrar); return; }
    if (!nodo || typeof nodo !== 'object') return;
    if (typeof nodo.id === 'string') {
      n += 1;
      nodo.id = 'smars_' + n;
    }
    for (const v of Object.values(nodo)) renombrar(v);
  };
  renombrar(estado);

  // Posiciones: setup, loop y los cinco bloques sueltos a la derecha.
  const raiz = estado.blocks.blocks;
  const posiciones = { arduino_setup: [20, 20], arduino_loop: [20, 340] };
  let suelto = 0;
  for (const b of raiz) {
    if (posiciones[b.type]) {
      [b.x, b.y] = posiciones[b.type];
    } else {
      b.x = 700;
      b.y = 20 + suelto * 120;
      suelto += 1;
    }
  }

  mkdirSync(base, { recursive: true });
  writeFileSync(base + '/smars-ultrasonico.json', JSON.stringify(estado, null, 2) + '\n');
  writeFileSync(base + '/SmarsUltrasonico.ino.tmp', sketch);
  // eslint-disable-next-line no-console
  console.log('bloques:', raiz.length, '| sketch:', sketch.length, 'bytes');
});
