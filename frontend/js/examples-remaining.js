/**
 * ArduBlock — Ejemplos restantes (06.Sensors, 07.Display, 08.Strings, 09.USB, 10.StarterKit, 11.ArduinoISP)
 * La mayoría NO son convertibles por requerir arrays, librerías externas, String operations, USB HID, o hardware específico.
 */
export const remainingExamples = [
  // ═══ Ping ═════════════════════════════════
  {
    name: 'Ping',
    category: '06.Sensors',
    description: 'Sensor ultrasónico PING))) — mide distancia',
    comment: `/*
  Ping))) Sensor

  This sketch reads a PING))) ultrasonic rangefinder and returns the distance
  to the closest object in range.

  created 3 Nov 2008 by David A. Mellis
  modified 30 Aug 2011 by Tom Igoe
  This example code is in the public domain.

  Agregado a ArduBlock — 2026-05-31
*/`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa funciones personalizadas (microsecondsToInches, microsecondsToCentimeters) y cambio de pinMode en el mismo pin (OUTPUT → INPUT). ArduBlock tiene bloque ultrasonic_read con helper interno — usar ese en vez de este ejemplo crudo.'
  },

  {
    name: 'BarGraph',
    category: '07.Display',
    description: 'Gráfico de barras LED con 10 LEDs',
    comment: `/*
  LED bar graph — Turns on a series of LEDs based on analog sensor value.
  created 4 Sep 2010 by Tom Igoe
  This example code is in the public domain.

  Agregado a ArduBlock — 2026-05-31
*/`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa array ledPins[10] y for-loop sobre índices del array. Sin soporte de arrays en ArduBlock.'
  },

  {
    name: 'RowColumnScanning',
    category: '07.Display',
    description: 'Control de matriz LED por barrido fila/columna',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Usa arrays para pines de filas y columnas, y funciones de barrido con temporización precisa. No representable con bloques visuales.'
  },

  {
    name: 'StringAdditionOperator',
    category: '08.Strings',
    description: 'Concatena strings con +',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere operaciones con String de Arduino (concatenación, reemplazo, substring, etc.). No existen bloques de manipulación de texto avanzada en ArduBlock — solo text y text_join.'
  },

  {
    name: 'StringAppendOperator',
    category: '08.Strings',
    description: 'Usa .concat() y +=',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere operaciones con String de Arduino (concatenación, reemplazo, substring, etc.). No existen bloques de manipulación de texto avanzada en ArduBlock — solo text y text_join.'
  },

  {
    name: 'StringCaseChanges',
    category: '08.Strings',
    description: 'Convierte mayúsculas/minúsculas',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere operaciones con String de Arduino (concatenación, reemplazo, substring, etc.). No existen bloques de manipulación de texto avanzada en ArduBlock — solo text y text_join.'
  },

  {
    name: 'StringCharacters',
    category: '08.Strings',
    description: 'Accede a caracteres individuales',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere operaciones con String de Arduino (concatenación, reemplazo, substring, etc.). No existen bloques de manipulación de texto avanzada en ArduBlock — solo text y text_join.'
  },

  {
    name: 'StringComparisonOperators',
    category: '08.Strings',
    description: 'Compara strings con ==',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere operaciones con String de Arduino (concatenación, reemplazo, substring, etc.). No existen bloques de manipulación de texto avanzada en ArduBlock — solo text y text_join.'
  },

  {
    name: 'StringConstructors',
    category: '08.Strings',
    description: 'Construye strings desde distintos tipos',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere operaciones con String de Arduino (concatenación, reemplazo, substring, etc.). No existen bloques de manipulación de texto avanzada en ArduBlock — solo text y text_join.'
  },

  {
    name: 'StringIndexOf',
    category: '08.Strings',
    description: 'Busca substrings',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere operaciones con String de Arduino (concatenación, reemplazo, substring, etc.). No existen bloques de manipulación de texto avanzada en ArduBlock — solo text y text_join.'
  },

  {
    name: 'StringLength',
    category: '08.Strings',
    description: 'Mide longitud de string',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere operaciones con String de Arduino (concatenación, reemplazo, substring, etc.). No existen bloques de manipulación de texto avanzada en ArduBlock — solo text y text_join.'
  },

  {
    name: 'StringLengthTrim',
    category: '08.Strings',
    description: 'Recorta espacios y mide',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere operaciones con String de Arduino (concatenación, reemplazo, substring, etc.). No existen bloques de manipulación de texto avanzada en ArduBlock — solo text y text_join.'
  },

  {
    name: 'StringReplace',
    category: '08.Strings',
    description: 'Reemplaza texto en strings',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere operaciones con String de Arduino (concatenación, reemplazo, substring, etc.). No existen bloques de manipulación de texto avanzada en ArduBlock — solo text y text_join.'
  },

  {
    name: 'StringStartsWithEndsWith',
    category: '08.Strings',
    description: 'Verifica prefijos/sufijos',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere operaciones con String de Arduino (concatenación, reemplazo, substring, etc.). No existen bloques de manipulación de texto avanzada en ArduBlock — solo text y text_join.'
  },

  {
    name: 'StringSubstring',
    category: '08.Strings',
    description: 'Extrae substrings',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere operaciones con String de Arduino (concatenación, reemplazo, substring, etc.). No existen bloques de manipulación de texto avanzada en ArduBlock — solo text y text_join.'
  },

  {
    name: 'StringToInt',
    category: '08.Strings',
    description: 'Convierte string a int',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere operaciones con String de Arduino (concatenación, reemplazo, substring, etc.). No existen bloques de manipulación de texto avanzada en ArduBlock — solo text y text_join.'
  },

  {
    name: 'StringToFloat',
    category: '08.Strings',
    description: 'Convierte string a float',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere operaciones con String de Arduino (concatenación, reemplazo, substring, etc.). No existen bloques de manipulación de texto avanzada en ArduBlock — solo text y text_join.'
  },

  {
    name: 'KeyboardAndMouseControl',
    category: '09.USB',
    description: 'Control combinado teclado+ratón',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere Arduino Leonardo/Micro/Due con capacidad USB HID. No compatible con Arduino Uno (placa objetivo de ArduBlock).'
  },

  {
    name: 'KeyboardLogout',
    category: '09.USB',
    description: 'Cierra sesión del sistema',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere Arduino Leonardo/Micro/Due con capacidad USB HID. No compatible con Arduino Uno (placa objetivo de ArduBlock).'
  },

  {
    name: 'KeyboardMessage',
    category: '09.USB',
    description: 'Escribe texto como teclado',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere Arduino Leonardo/Micro/Due con capacidad USB HID. No compatible con Arduino Uno (placa objetivo de ArduBlock).'
  },

  {
    name: 'KeyboardReprogram',
    category: '09.USB',
    description: 'Abre IDE y pega código',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere Arduino Leonardo/Micro/Due con capacidad USB HID. No compatible con Arduino Uno (placa objetivo de ArduBlock).'
  },

  {
    name: 'KeyboardSerial',
    category: '09.USB',
    description: 'Envía Serial como teclado',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere Arduino Leonardo/Micro/Due con capacidad USB HID. No compatible con Arduino Uno (placa objetivo de ArduBlock).'
  },

  {
    name: 'MouseButtonControl',
    category: '09.USB',
    description: 'Control de botones del ratón',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere Arduino Leonardo/Micro/Due con capacidad USB HID. No compatible con Arduino Uno (placa objetivo de ArduBlock).'
  },

  {
    name: 'JoystickMouseControl',
    category: '09.USB',
    description: 'Control de ratón con joystick',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere Arduino Leonardo/Micro/Due con capacidad USB HID. No compatible con Arduino Uno (placa objetivo de ArduBlock).'
  },

  {
    name: 'p01_Parpadeo',
    category: '10.StarterKit_BasicKit',
    description: 'Parpadeo de LED (similar a Blink)',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere revisión manual — puede ser convertible si usa solo bloques básicos (digitalWrite, analogRead, delay, etc.)'
  },

  {
    name: 'p02_LucesDeColores',
    category: '10.StarterKit_BasicKit',
    description: 'LED RGB con PWM',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere revisión manual — puede ser convertible si usa solo bloques básicos (digitalWrite, analogRead, delay, etc.)'
  },

  {
    name: 'p03_SensorDeProximidad',
    category: '10.StarterKit_BasicKit',
    description: 'Sensor de proximidad infrarrojo',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere revisión manual — puede ser convertible si usa solo bloques básicos (digitalWrite, analogRead, delay, etc.)'
  },

  {
    name: 'p04_VelocidadDelSonido',
    category: '10.StarterKit_BasicKit',
    description: 'Sensor ultrasónico de velocidad',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere revisión manual — puede ser convertible si usa solo bloques básicos (digitalWrite, analogRead, delay, etc.)'
  },

  {
    name: 'p05_Pulsador',
    category: '10.StarterKit_BasicKit',
    description: 'Control con pulsador',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere revisión manual — puede ser convertible si usa solo bloques básicos (digitalWrite, analogRead, delay, etc.)'
  },

  {
    name: 'p06_InterruptorOscilante',
    category: '10.StarterKit_BasicKit',
    description: 'Interruptor tilt/tumbler',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere revisión manual — puede ser convertible si usa solo bloques básicos (digitalWrite, analogRead, delay, etc.)'
  },

  {
    name: 'p07_LamparaTactil',
    category: '10.StarterKit_BasicKit',
    description: 'Lámpara táctil capacitiva',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere revisión manual — puede ser convertible si usa solo bloques básicos (digitalWrite, analogRead, delay, etc.)'
  },

  {
    name: 'p08_TecladoConBuzzer',
    category: '10.StarterKit_BasicKit',
    description: 'Teclado piezoeléctrico con tonos',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere revisión manual — puede ser convertible si usa solo bloques básicos (digitalWrite, analogRead, delay, etc.)'
  },

  {
    name: 'p09_RelojDeArena',
    category: '10.StarterKit_BasicKit',
    description: 'Reloj de arena digital con LEDs',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere revisión manual — puede ser convertible si usa solo bloques básicos (digitalWrite, analogRead, delay, etc.)'
  },

  {
    name: 'p10_ServoMotor',
    category: '10.StarterKit_BasicKit',
    description: 'Control de servo motor',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere revisión manual — puede ser convertible si usa solo bloques básicos (digitalWrite, analogRead, delay, etc.)'
  },

  {
    name: 'p11_LED_RGB',
    category: '10.StarterKit_BasicKit',
    description: 'LED RGB con mezcla de colores',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere revisión manual — puede ser convertible si usa solo bloques básicos (digitalWrite, analogRead, delay, etc.)'
  },

  {
    name: 'p12_PuertaEstrecha',
    category: '10.StarterKit_BasicKit',
    description: 'Sensor de paso estrecho con buzzer',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere revisión manual — puede ser convertible si usa solo bloques básicos (digitalWrite, analogRead, delay, etc.)'
  },

  {
    name: 'p13_VelocidadDelViento',
    category: '10.StarterKit_BasicKit',
    description: 'Anemómetro digital',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere revisión manual — puede ser convertible si usa solo bloques básicos (digitalWrite, analogRead, delay, etc.)'
  },

  {
    name: 'p14_DigitalHourglass',
    category: '10.StarterKit_BasicKit',
    description: 'Reloj de arena digital con tilt switch',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere revisión manual — puede ser convertible si usa solo bloques básicos (digitalWrite, analogRead, delay, etc.)'
  },

  {
    name: 'ArduinoISP',
    category: '11.ArduinoISP',
    description: 'Programador ISP para grabar bootloaders',
    comment: `Agregado a ArduBlock — 2026-05-31`,
    reason: 'NOT_CONVERTIBLE',
    note: 'Requiere programación ISP de bajo nivel (SPI, fusibles, bootloader). No aplicable a bloques visuales educativos.'
  }
];
