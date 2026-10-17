/**
 * ArduBlock — bloques del shield AFMotor.
 *
 * Los bloques del shield dependen de la librería AFMotor_R4.h. La categoría
 * "Motor AF" solo aparece cuando el proyecto incluye ese header, y se retira
 * cuando se borra: sin el include los bloques generan un sketch que no compila.
 */

export const AFMOTOR_INCLUDE = 'AFMotor_R4.h';

/** ¿El workspace tiene el include del shield? */
export function hasAfmotorInclude(workspace) {
  if (!workspace) return false;
  return workspace.getAllBlocks(false).some(block =>
    block.type === 'library_include' &&
    block.getFieldValue('LIB') === AFMOTOR_INCLUDE
  );
}

/** Contenido de la categoría cuando el include está presente. */
export const AFMOTOR_CATEGORY_BLOCKS = [
  { kind: 'block', type: 'afmotor_dc_create' },
  { kind: 'block', type: 'afmotor_dc_speed' },
  { kind: 'block', type: 'afmotor_dc_run' },
  { kind: 'block', type: 'afmotor_stepper_create' },
  { kind: 'block', type: 'afmotor_stepper_speed' },
  { kind: 'block', type: 'afmotor_stepper_step' },
  { kind: 'block', type: 'afmotor_stepper_onestep' },
  { kind: 'block', type: 'afmotor_stepper_release' },
  { kind: 'block', type: 'afmotor_servo_create' },
  { kind: 'block', type: 'afmotor_servo_write' },
  { kind: 'block', type: 'afmotor_servo_write_us' },
  { kind: 'block', type: 'afmotor_servo_read' },
  { kind: 'block', type: 'afmotor_servo_detach' },
];
