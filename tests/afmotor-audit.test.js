import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { generateArduinoCode } from '../frontend/js/generator.js';
import { validateWorkspace } from '../frontend/js/validator.js';

/**
 * Auditoría de la familia AFMotor: arma un proyecto con los trece bloques, el
 * include del shield y nombres coherentes, y muestra los avisos del validador
 * y el sketch generado. No corre en la suite normal.
 *
 *   AFMOTOR_AUDIT=1 npx vitest run tests/afmotor-audit.test.js
 */
it.runIf(Boolean(process.env.AFMOTOR_AUDIT))('audita la familia AFMotor', () => {
  const ws = new Blockly.Workspace();

  const include = ws.newBlock('library_include');
  include.setFieldValue('AFMotor_R4.h', 'LIB');

  const setup = ws.newBlock('arduino_setup');
  const loop = ws.newBlock('arduino_loop');

  // Declaraciones: van sueltas, como las define el módulo.
  const dcCreate = ws.newBlock('afmotor_dc_create');
  dcCreate.setFieldValue('motor1', 'NAME');
  dcCreate.setFieldValue('1', 'CHANNEL');

  const stCreate = ws.newBlock('afmotor_stepper_create');
  stCreate.setFieldValue('stepper1', 'NAME');
  stCreate.setFieldValue('200', 'STEPS');
  stCreate.setFieldValue('1', 'CHANNEL');

  const servoCreate = ws.newBlock('afmotor_servo_create');
  servoCreate.setFieldValue('servo1', 'NAME');
  servoCreate.setFieldValue('1', 'SERVO');

  const encadenar = (bloques) => {
    for (let i = 0; i < bloques.length - 1; i++) {
      bloques[i].nextConnection.connect(bloques[i + 1].previousConnection);
    }
    return bloques[0];
  };

  const dcSpeed = ws.newBlock('afmotor_dc_speed');
  dcSpeed.setFieldValue('motor1', 'NAME');
  dcSpeed.setFieldValue('200', 'SPEED');
  const dcRun = ws.newBlock('afmotor_dc_run');
  dcRun.setFieldValue('motor1', 'NAME');
  dcRun.setFieldValue('FORWARD', 'DIR');

  const stSpeed = ws.newBlock('afmotor_stepper_speed');
  stSpeed.setFieldValue('stepper1', 'NAME');
  stSpeed.setFieldValue('60', 'RPM');
  const stStep = ws.newBlock('afmotor_stepper_step');
  stStep.setFieldValue('stepper1', 'NAME');
  stStep.setFieldValue('100', 'COUNT');
  stStep.setFieldValue('FORWARD', 'DIR');
  stStep.setFieldValue('SINGLE', 'STYLE');
  const stRelease = ws.newBlock('afmotor_stepper_release');
  stRelease.setFieldValue('stepper1', 'NAME');

  const svWrite = ws.newBlock('afmotor_servo_write');
  svWrite.setFieldValue('servo1', 'NAME');
  svWrite.setFieldValue('90', 'ANGLE');
  const svWriteUs = ws.newBlock('afmotor_servo_write_us');
  svWriteUs.setFieldValue('servo1', 'NAME');
  svWriteUs.setFieldValue('1500', 'US');
  const svDetach = ws.newBlock('afmotor_servo_detach');
  svDetach.setFieldValue('servo1', 'NAME');

  // onestep y read entregan valor: van colgados de un serial_println.
  const imprimirOnestep = ws.newBlock('serial_println');
  const onestep = ws.newBlock('afmotor_stepper_onestep');
  onestep.setFieldValue('stepper1', 'NAME');
  onestep.setFieldValue('FORWARD', 'DIR');
  onestep.setFieldValue('SINGLE', 'STYLE');
  imprimirOnestep.getInput('TEXT').connection.connect(onestep.outputConnection);

  const imprimirRead = ws.newBlock('serial_println');
  const svRead = ws.newBlock('afmotor_servo_read');
  svRead.setFieldValue('servo1', 'NAME');
  imprimirRead.getInput('TEXT').connection.connect(svRead.outputConnection);

  // Casos negativos: motor sin declarar y un segundo motor en el canal 1.
  const dcFantasma = ws.newBlock('afmotor_dc_run');
  dcFantasma.setFieldValue('motorX', 'NAME');
  dcFantasma.setFieldValue('FORWARD', 'DIR');

  const dcDuplicado = ws.newBlock('afmotor_dc_create');
  dcDuplicado.setFieldValue('motor2', 'NAME');
  dcDuplicado.setFieldValue('1', 'CHANNEL');

  loop.getInput('BODY').connection.connect(
    encadenar([dcSpeed, dcRun, stSpeed, stStep, stRelease,
               svWrite, svWriteUs, svDetach, imprimirOnestep, imprimirRead,
               dcFantasma]).previousConnection
  );

  const sketch = generateArduinoCode(ws);
  const avisos = validateWorkspace(ws);

  // eslint-disable-next-line no-console
  console.log('─── avisos ───');
  for (const a of avisos) {
    // eslint-disable-next-line no-console
    console.log(`[${a.severity}] ${a.type}: ${a.message}`);
  }
  // eslint-disable-next-line no-console
  console.log('─── sketch ───\n' + sketch);
  if (process.env.AFMOTOR_OUT) {
    writeFileSync(process.env.AFMOTOR_OUT + '/SketchAFMotor.ino.tmp', sketch);
  }
  ws.dispose();
});
