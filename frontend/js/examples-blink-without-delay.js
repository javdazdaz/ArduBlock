/**
 * ArduBlock — BlinkWithoutDelay (02.Digital)
 */
export const blinkWithoutDelay = [
  {
    name: 'BlinkWithoutDelay',
    category: '02.Digital',
    description: 'Parpadea un LED sin usar delay(), usando millis()',
    comment: `/*
  Blink without Delay

  Turns on and off a light emitting diode (LED) connected to a digital pin,
  without using the delay() function.

  created 2005 by David A. Mellis
  modified 8 Feb 2010 by Paul Stoffregen
  modified 11 Nov 2013 by Scott Fitzgerald
  modified 9 Jan 2017 by Arturo Guadalupi
  This example code is in the public domain.
*/
Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'El bloque digital_write usa un dropdown estático (HIGH/LOW). El sketch original usa digitalWrite(13, ledState) donde ledState es una variable que alterna. Se necesitaría un bloque digital_write con entrada de valor dinámica.'
  }
];
