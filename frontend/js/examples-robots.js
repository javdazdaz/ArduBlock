/**
 * ArduBlock — Ejemplos: robots
 *
 * Programas de la línea de robótica, convertidos desde los sketches de
 * `~/Arduino/`. La sección agrupa cada robot y sus variantes.
 */

import _smarsUltrasonico from '../../examples/blockly-states/ardublock-examples/robots/smars-ultrasonico.json';

export const robotExamples = [
  {
    name: 'SMARS con ultrasónico',
    source: 'ardublock-examples',
    category: 'robots',
    description: {
      es: 'Robot 2WD con dos motores DC en el shield: mide la distancia, la informa por el monitor serie y esquiva lo que tenga a menos de 20 cm',
      en: '2WD robot with two DC motors on the shield: measures distance, reports it on the serial monitor and avoids anything closer than 20 cm'
    },
    comment: {
      es: '/*\n  SMARS con ultrasónico\n\n  Robot 2WD con dos motores DC en el shield:\n  M1 a la izquierda y M2 a la derecha. El\n  HC-SR04 usa TRIG en A1 y ECHO en A0, que en\n  el R4 son los pines 15 y 14.\n\n  loop()   mide cada vuelta, informa por el\n           monitor serie y, si la distancia baja\n           de 20 cm, retrocede 300 ms, gira a la\n           derecha 400 ms y sigue; si el camino\n           está libre, avanza.\n\n  La velocidad va de 180 en línea recta a 170\n  en la maniobra.\n\n  ArduBlock — 2026\n*/',
      en: '/*\n  SMARS with ultrasonic sensor\n\n  2WD robot with two DC motors on the shield:\n  M1 on the left and M2 on the right. The\n  HC-SR04 uses TRIG on A1 and ECHO on A0,\n  which are pins 15 and 14 on the R4.\n\n  loop()   measures on every pass, reports on\n           the serial monitor and, when the\n           distance drops below 20 cm, backs up\n           for 300 ms, turns right for 400 ms and\n           carries on; otherwise it moves forward.\n\n  Speed goes from 180 straight ahead to 170\n  in the manoeuvre.\n\n  ArduBlock — 2026\n*/'
    },
    state: _smarsUltrasonico,
    board: 'arduino:renesas_uno:unor4wifi',
  },
];
