/**
 * ArduBlock — Ejemplos faltantes (05.Control, 06.Sensors)
 */
export const missingExamples = [
  {
    "name": "Arrays",
    "category": "05.Control",
    "description": "Demostración de arrays para controlar LEDs en orden arbitrario",
    "comment": "/*\n  Arrays — Demonstrates the use of an array to hold pin numbers.\n  created 2006 by David A. Mellis, modified 30 Aug 2011 by Tom Igoe\n  This example code is in the public domain.\n*/\nAgregado a ArduBlock — 2026-05-31",
    "reason": "NOT_CONVERTIBLE",
    "note": "Ejemplo diseñado específicamente para demostrar arrays (ledPins[6]). Sin soporte de arrays en ArduBlock. El mismo patrón secuencial se puede hacer con bloques individuales (ver ForLoopIteration)."
  },
  {
    "name": "switchCase2",
    "category": "05.Control",
    "description": "Switch/case con entrada Serial",
    "comment": "/*\n  Switch statement with serial input\n  created 1 Jul 2009 by Tom Igoe\n  This example code is in the public domain.\n*/\nAgregado a ArduBlock — 2026-05-31",
    "reason": "NOT_CONVERTIBLE",
    "note": "Usa Serial.available() y Serial.read() para recibir caracteres (sin bloques serial_read), y switch/case con valores ASCII (sin bloque switch)."
  },
  {
    "name": "ADXL3xx",
    "category": "06.Sensors",
    "description": "Acelerómetro ADXL3xx — lectura de 3 ejes",
    "comment": "/*\n  ADXL3xx — Reads an Analog Devices ADXL3xx accelerometer.\n  created 2 Jul 2008 by David A. Mellis, modified 30 Aug 2011 by Tom Igoe\n  This example code is in the public domain.\n*/\nAgregado a ArduBlock — 2026-05-31",
    "reason": "NOT_CONVERTIBLE",
    "note": "Usa analogRead en pines A1-A3 como ground/power para el acelerómetro (técnica de cableado directo). Requiere Serial.print con tabuladores para formatear 3 columnas. Serial.print repetido con \\t no tiene equivalente en bloques."
  },
  {
    "name": "Knock",
    "category": "06.Sensors",
    "description": "Sensor de golpe piezoeléctrico",
    "comment": "/*\n  Knock Sensor — Reads a piezo element to detect a knocking sound.\n  created 25 Mar 2007 by David Cuartielles, modified 30 Aug 2011 by Tom Igoe\n  This example code is in the public domain.\n*/\nAgregado a ArduBlock — 2026-05-31",
    "reason": "NOT_CONVERTIBLE",
    "note": "Usa ledState = !ledState (toggle lógico) y digitalWrite(ledPin, ledState) con variable. El bloque digital_write solo acepta dropdown estático HIGH/LOW. Mismo problema que BlinkWithoutDelay."
  },
  {
    "name": "Memsic2125",
    "category": "06.Sensors",
    "description": "Acelerómetro Memsic 2125 — lectura de pulsos",
    "comment": "/*\n  Memsic2125 — Read the Memsic 2125 two-axis accelerometer.\n  created 6 Nov 2008 by David A. Mellis, modified 30 Aug 2011 by Tom Igoe\n  This example code is in the public domain.\n*/\nAgregado a ArduBlock — 2026-05-31",
    "reason": "NOT_CONVERTIBLE",
    "note": "Usa pulseIn() para medir ancho de pulso (tenemos bloque pulse_in), pero requiere aritmética compleja: ((pulseX/10)-500)*8 con variables intermedias y Serial.print formateado con tabuladores. El workspace resultante con 4 niveles de math_arithmetic anidados sería difícil de leer para un estudiante."
  }
];
