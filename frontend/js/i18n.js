/**
 * ArduBlock — Internacionalización (i18n)
 *
 * Soporte español ↔ inglés.
 * - initLanguage() lee el idioma de localStorage y configura Blockly.Msg.
 * - t(key) devuelve la traducción actual para strings de UI.
 * - applyDOMLanguage() actualiza elementos [data-i18n] en el DOM.
 * - El cambio de idioma requiere recarga (location.reload).
 */

/* global location */

import * as Blockly from 'blockly';

// ═══ Traducciones ═════════════════════════════

const messages = {
  es: {
    // ── Categorías del toolbox ──
    CAT_ARDUINO: 'Arduino',
    CAT_PINES: 'Pines',
    CAT_TIEMPO: 'Tiempo',
    CAT_SONIDO: 'Sonido',
    CAT_LCD: 'Pantalla LCD',
    CAT_SENSORES: 'Sensores',
    CAT_MOTOR: 'Motor',
    CAT_SERVO: 'Servo',
    CAT_SERIAL: 'Serial',
    CAT_LOGICA: 'Lógica',
    CAT_BUCLES: 'Bucles',
    CAT_MATEMATICAS: 'Matemáticas',
    CAT_VARIABLES: 'Variables',
    CAT_TEXTO: 'Texto',
    CAT_BUSCAR: 'Buscar',
    // ── Etiquetas de bloques (Blockly.Msg) ──
    ARD_SETUP: 'al iniciar (setup)',
    ARD_LOOP: 'repetir siempre (loop)',
    PINMODE_PIN: 'pin',
    PINMODE_MODE: 'modo',
    INPUT: 'ENTRADA',
    OUTPUT: 'SALIDA',
    INPUT_PULLUP: 'ENTRADA_PULLUP',
    DWRITE_PIN: 'pin',
    DWRITE_VAL: 'valor',
    HIGH: 'HIGH',
    LOW: 'LOW',
    AREAD_PIN: 'pin',
    AWRITE_PIN: 'pin',
    AWRITE_VAL: 'valor',
    DELAY_MS: 'esperar',
    DELAY_UNIT: 'milisegundos',
    SERIAL_BEGIN: 'iniciar comunicación Serial a',
    SERIAL_PRINT: 'enviar por Serial',
    SERIAL_PRINTLN: 'enviar por Serial (con salto)',
    SERIAL_BAUD: 'baudios',
    // ── Mensajes de bloques (message0) ──
    MSG_ARDUINO_SETUP: 'al iniciar %1 %2',
    TOOLTIP_ARDUINO_SETUP: 'Código que se ejecuta una sola vez al iniciar el Arduino',
    MSG_ARDUINO_LOOP: 'repetir siempre %1 %2',
    TOOLTIP_ARDUINO_LOOP: 'Código que se ejecuta en bucle infinito',
    MSG_PIN_MODE: 'configurar pin %1 como %2',
    TOOLTIP_PIN_MODE: 'Configura el modo de un pin (ENTRADA, SALIDA, ENTRADA_PULLUP)',
    MSG_DIGITAL_WRITE: 'escribir digital pin %1 → %2',
    TOOLTIP_DIGITAL_WRITE: 'Escribe HIGH o LOW en un pin digital',
    MSG_DIGITAL_READ: 'leer pin digital %1',
    TOOLTIP_DIGITAL_READ: 'Lee el valor de un pin digital (HIGH o LOW)',
    MSG_ANALOG_WRITE: 'escribir analógico pin %1 ~ %2',
    TOOLTIP_ANALOG_WRITE: 'Escribe un valor PWM (0-255) en un pin analógico (~)',
    MSG_ANALOG_READ: 'leer pin analógico A%1',
    TOOLTIP_ANALOG_READ: 'Lee el valor analógico (0-1023) del pin A0-A15',
    MSG_DELAY_MS: 'esperar %1 ms',
    TOOLTIP_DELAY_MS: 'Espera una cantidad de milisegundos',
    MSG_SERIAL_BEGIN: 'iniciar comunicación Serial a %1 baudios',
    TOOLTIP_SERIAL_BEGIN: 'Inicia la comunicación serial a la velocidad especificada. Se usa dentro de setup().',
    MSG_SERIAL_PRINT: 'enviar por Serial %1',
    TOOLTIP_SERIAL_PRINT: 'Envía texto o número por el puerto Serial',
    MSG_SERIAL_PRINTLN: 'enviar por Serial (con salto) %1',
    TOOLTIP_SERIAL_PRINTLN: 'Envía texto o número por el puerto Serial y añade un salto de línea',
    MSG_SERVO_CREATE: 'crear servo %1 en pin %2',
    TOOLTIP_SERVO_CREATE: 'Declara un servo con el nombre indicado y lo conecta al pin.',
    MSG_SERVO_WRITE: 'mover servo %1 a %2',
    TOOLTIP_SERVO_WRITE: 'Gira el servo indicado al ángulo elegido (0-180°).',
    MSG_SERVO_WRITE_US: 'mover servo %1 a %2 μs',
    TOOLTIP_SERVO_WRITE_US: 'Gira el servo usando microsegundos (500-2500). Para ajustes finos.',
    MSG_TONE_OUTPUT: 'generar tono pin %1 frecuencia %2 Hz',
    TOOLTIP_TONE_OUTPUT: 'Genera un tono de la frecuencia indicada en el pin.',
    MSG_TONE_DURATION: 'generar tono pin %1 frecuencia %2 Hz durante %3 ms',
    TOOLTIP_TONE_DURATION: 'Genera un tono durante el tiempo indicado y se apaga solo.',
    MSG_NO_TONE_OUTPUT: 'detener tono en pin %1',
    TOOLTIP_NO_TONE_OUTPUT: 'Detiene el tono que se está generando en el pin indicado.',
    MSG_MAP_VALUE: 'mapear %1 de [ %2 … %3 ] a [ %4 … %5 ]',
    TOOLTIP_MAP_VALUE: 'Re-mapea un número de un rango a otro.',
    MSG_PULSE_IN: 'medir pulso en pin %1 nivel %2 timeout %3 μs',
    TOOLTIP_PULSE_IN: 'Mide la duración de un pulso en el pin (en microsegundos).',
    MSG_ATTACH_INTERRUPT: 'interrupción en pin %1 modo %2 ejecutar %3 %4',
    TOOLTIP_ATTACH_INTERRUPT: 'Ejecuta los bloques internos cuando ocurre un cambio en el pin.',
    MSG_LCD_CREATE: 'crear LCD %1 RS %2 EN %3 D4 %4 D5 %5 D6 %6 D7 %7 %8 cols %9 filas %10',
    TOOLTIP_LCD_CREATE: 'Crea un LCD con pines RS, EN, D4-D7. Debe ir dentro de setup().',
    MSG_LCD_PRINT: 'LCD %1 imprimir %2',
    TOOLTIP_LCD_PRINT: 'Imprime texto o número en la posición actual del cursor.',
    MSG_LCD_SET_CURSOR: 'LCD %1 cursor col %2 fila %3',
    TOOLTIP_LCD_SET_CURSOR: 'Posiciona el cursor en la columna y fila indicadas (empiezan en 0).',
    MSG_LCD_CLEAR: 'LCD %1 limpiar pantalla',
    TOOLTIP_LCD_CLEAR: 'Borra todo el contenido del LCD.',
    MSG_LCD_I2C_CREATE: 'crear LCD I2C %1 dirección %2 cols %3 filas %4',
    TOOLTIP_LCD_I2C_CREATE: 'Crea un LCD con interfaz I2C (solo 2 pines: SDA/A4 y SCL/A5). Debe ir dentro de setup().',
    MSG_DHT_CREATE: 'crear sensor DHT %1 pin %2 tipo %3',
    TOOLTIP_DHT_CREATE: 'Crea un sensor DHT11 o DHT22. Debe ir dentro de setup().',
    MSG_DHT_TEMP: 'temperatura de %1',
    TOOLTIP_DHT_TEMP: 'Lee la temperatura en °C del sensor DHT.',
    MSG_DHT_HUMIDITY: 'humedad de %1',
    TOOLTIP_DHT_HUMIDITY: 'Lee la humedad relativa (0-100%) del sensor DHT.',
    MSG_ULTRASONIC_CREATE: 'crear ultrasónico %1 trig %2 echo %3',
    TOOLTIP_ULTRASONIC_CREATE: 'Crea un sensor ultrasónico HC-SR04. Debe ir dentro de setup().',
    MSG_ULTRASONIC_READ: 'distancia de %1 (cm)',
    TOOLTIP_ULTRASONIC_READ: 'Mide la distancia en centímetros usando el sensor ultrasónico.',
    MSG_STEPPER_CREATE: 'crear motor paso a paso %1 pasos/vuelta %2 IN1 %3 IN2 %4 IN3 %5 IN4 %6',
    TOOLTIP_STEPPER_CREATE: 'Crea un motor paso a paso. Puede ir en scope global (fuera de setup/loop).',
    MSG_STEPPER_SPEED: 'motor %1 velocidad %2 RPM',
    TOOLTIP_STEPPER_SPEED: 'Configura la velocidad del motor en RPM. Debe ir dentro de setup().',
    MSG_STEPPER_STEP: 'motor %1 girar %2 pasos',
    TOOLTIP_STEPPER_STEP: 'Gira el motor la cantidad de pasos indicada. Negativo = sentido contrario.',
    MSG_VARIABLE_DECLARE: 'iniciar %1 como %2 = %3',
    TOOLTIP_VARIABLE_DECLARE: 'Declara una variable del tipo elegido con un valor inicial.',
    MSG_VARIABLE_SET: 'asignar a %1 el valor %2',
    TOOLTIP_VARIABLE_SET: 'Cambia el valor de una variable ya declarada.',
    MSG_VARIABLE_GET: 'valor de %1',
    TOOLTIP_VARIABLE_GET: 'Devuelve el valor actual de la variable.',
    // ── UI principal ──
    app_title: '⚡ ArduBlock',
    app_subtitle: 'Programación visual para Arduino — C++',
    // ── Toolbar principal ──
    btn_new: '📄 Nuevo',
    btn_copy: '📋 Copiar',
    btn_examples: '📚 Ejemplos',
    btn_settings: '⚙',
    // ── Toolbar Arduino ──
    btn_console: '🔌 Consola',
    btn_upload: '⚡ Subir',
    // ── Panel de código ──
    panel_code: 'Código C++',
    panel_lines: 'líneas',
    // ── Gestor de proyectos ──
    project_placeholder: 'Nombre del proyecto...',
    btn_load: '📂 Cargar',
    btn_save: '💾 Guardar',
    btn_delete: '🗑 Eliminar',
    // ── Consola serial ──
    console_title: '⚡ Consola Arduino',
    serial_connect: '🔌 Conectar',
    serial_disconnect: '🔌 Desconectar',
    serial_clear: '🗑 Limpiar',
    serial_close: '✕',
    serial_connected: '✓ Conectado a',
    serial_baud_label: 'baud',
    // ── Settings ──
    settings_title: 'Configuración',
    settings_hardware: 'Hardware',
    settings_board: 'Placa',
    settings_baud: 'Baud rate',
    settings_blockly: 'Blockly',
    settings_theme: 'Tema',
    settings_dark: 'Oscuro',
    settings_light: 'Claro',
    settings_renderer: 'Renderer',
    settings_fonts: 'Tamaño de fuente',
    settings_font_ui: 'Interfaz',
    settings_font_code: 'Código',
    settings_font_serial: 'Serial',
    settings_font_blocks: 'Bloques',
    settings_font_toolbox: 'Toolbox',
    settings_language: 'Idioma',
    settings_lang_es: 'Español',
    settings_lang_en: 'English',
    // ── Toasts ──
    toast_copied: '¡Copiado!',
    toast_new_project: 'Proyecto nuevo',
    toast_saved: 'Proyecto guardado',
    toast_deleted: 'Proyecto eliminado',
    toast_loaded: 'Proyecto cargado',
    toast_example_loaded: 'Ejemplo cargado',
    toast_code_copied: 'Código copiado',
    toast_error: 'Error',
    toast_invalid_name: 'El nombre solo puede tener letras, números, guiones y guiones bajos.',
    // ── Validación ──
    val_missing_setup: 'Falta el bloque "al iniciar (setup)". El sketch no tendrá setup().',
    val_missing_loop: 'Falta el bloque "repetir siempre (loop)". El sketch no tendrá loop().',
    val_duplicate_setup: '¡Hay más de un bloque "al iniciar (setup)"! Solo puede haber uno. Elimina los que sobran.',
    val_duplicate_loop: '¡Hay más de un bloque "repetir siempre (loop)"! Solo puede haber uno. Elimina los que sobran.',
    val_orphan_suffix: 'está fuera de setup() o loop(). No se ejecutará.',
    val_servo_undeclared_prefix: 'El servo',
    val_servo_undeclared_suffix: 'no está declarado. Agregá un bloque "crear servo" primero.',
    val_servo_attach_suffix: 'Debe ir dentro de setup() para que servo.attach() funcione.',
    val_create_in_setup: 'Debe ir dentro de setup().',
    val_pin_dir_out: 'salida',
    val_pin_dir_in: 'entrada',
    val_pin_not_conf_suffix: 'lo usa pero no está configurado con pinMode() en setup(). Debe ser',
    // ── Ejemplos ──
    examples_title: 'Ejemplos Arduino',
    examples_browse: '📂 Explorar todos los ejemplos...',
    examples_back: '← Volver a ejemplos con bloques',
    examples_loading: 'Cargando ejemplos...',
    examples_count: '81 sketches de Arduino',
    // ── Modal de ejemplos (código) ──
    example_copy_btn: '📋 Copiar a portapapeles',
  },

  en: {
    // ── Toolbox categories ──
    CAT_ARDUINO: 'Arduino',
    CAT_PINES: 'Pins',
    CAT_TIEMPO: 'Time',
    CAT_SONIDO: 'Sound',
    CAT_LCD: 'LCD Display',
    CAT_SENSORES: 'Sensors',
    CAT_MOTOR: 'Motor',
    CAT_SERVO: 'Servo',
    CAT_SERIAL: 'Serial',
    CAT_LOGICA: 'Logic',
    CAT_BUCLES: 'Loops',
    CAT_MATEMATICAS: 'Math',
    CAT_VARIABLES: 'Variables',
    CAT_TEXTO: 'Text',
    CAT_BUSCAR: 'Search',
    // ── Block labels ──
    ARD_SETUP: 'on start (setup)',
    ARD_LOOP: 'repeat forever (loop)',
    PINMODE_PIN: 'pin',
    PINMODE_MODE: 'mode',
    INPUT: 'INPUT',
    OUTPUT: 'OUTPUT',
    INPUT_PULLUP: 'INPUT_PULLUP',
    DWRITE_PIN: 'pin',
    DWRITE_VAL: 'value',
    HIGH: 'HIGH',
    LOW: 'LOW',
    AREAD_PIN: 'pin',
    AWRITE_PIN: 'pin',
    AWRITE_VAL: 'value',
    DELAY_MS: 'wait',
    DELAY_UNIT: 'milliseconds',
    SERIAL_BEGIN: 'start Serial at',
    SERIAL_PRINT: 'send via Serial',
    SERIAL_PRINTLN: 'send via Serial (new line)',
    SERIAL_BAUD: 'baud',
    // ── Block messages (message0) ──
    MSG_ARDUINO_SETUP: 'on start %1 %2',
    TOOLTIP_ARDUINO_SETUP: 'Code that runs once when the Arduino starts',
    MSG_ARDUINO_LOOP: 'repeat forever %1 %2',
    TOOLTIP_ARDUINO_LOOP: 'Code that runs in an infinite loop',
    MSG_PIN_MODE: 'set pin %1 as %2',
    TOOLTIP_PIN_MODE: 'Sets the mode of a pin (INPUT, OUTPUT, INPUT_PULLUP)',
    MSG_DIGITAL_WRITE: 'digital write pin %1 → %2',
    TOOLTIP_DIGITAL_WRITE: 'Writes HIGH or LOW to a digital pin',
    MSG_DIGITAL_READ: 'read digital pin %1',
    TOOLTIP_DIGITAL_READ: 'Reads the value of a digital pin (HIGH or LOW)',
    MSG_ANALOG_WRITE: 'analog write pin %1 ~ %2',
    TOOLTIP_ANALOG_WRITE: 'Writes a PWM value (0-255) to an analog pin (~)',
    MSG_ANALOG_READ: 'read analog pin A%1',
    TOOLTIP_ANALOG_READ: 'Reads the analog value (0-1023) from pin A0-A15',
    MSG_DELAY_MS: 'wait %1 ms',
    TOOLTIP_DELAY_MS: 'Waits for a number of milliseconds',
    MSG_SERIAL_BEGIN: 'start Serial at %1 baud',
    TOOLTIP_SERIAL_BEGIN: 'Starts serial communication at the specified speed. Use inside setup().',
    MSG_SERIAL_PRINT: 'send via Serial %1',
    TOOLTIP_SERIAL_PRINT: 'Sends text or number via the Serial port',
    MSG_SERIAL_PRINTLN: 'send via Serial (new line) %1',
    TOOLTIP_SERIAL_PRINTLN: 'Sends text or number via Serial and adds a line break',
    MSG_SERVO_CREATE: 'create servo %1 on pin %2',
    TOOLTIP_SERVO_CREATE: 'Declares a servo with the given name and attaches it to the pin.',
    MSG_SERVO_WRITE: 'move servo %1 to %2',
    TOOLTIP_SERVO_WRITE: 'Rotates the servo to the chosen angle (0-180°).',
    MSG_SERVO_WRITE_US: 'move servo %1 to %2 μs',
    TOOLTIP_SERVO_WRITE_US: 'Rotates the servo using microseconds (500-2500). For fine adjustments.',
    MSG_TONE_OUTPUT: 'play tone pin %1 frequency %2 Hz',
    TOOLTIP_TONE_OUTPUT: 'Generates a tone at the given frequency on the pin.',
    MSG_TONE_DURATION: 'play tone pin %1 freq %2 Hz for %3 ms',
    TOOLTIP_TONE_DURATION: 'Generates a tone for the given duration and auto-stops.',
    MSG_NO_TONE_OUTPUT: 'stop tone on pin %1',
    TOOLTIP_NO_TONE_OUTPUT: 'Stops the tone being generated on the given pin.',
    MSG_MAP_VALUE: 'map %1 from [ %2 … %3 ] to [ %4 … %5 ]',
    TOOLTIP_MAP_VALUE: 'Re-maps a number from one range to another.',
    MSG_PULSE_IN: 'measure pulse on pin %1 level %2 timeout %3 μs',
    TOOLTIP_PULSE_IN: 'Measures the duration of a pulse on the pin (in microseconds).',
    MSG_ATTACH_INTERRUPT: 'interrupt on pin %1 mode %2 run %3 %4',
    TOOLTIP_ATTACH_INTERRUPT: 'Runs the inner blocks when a change occurs on the pin.',
    MSG_LCD_CREATE: 'create LCD %1 RS %2 EN %3 D4 %4 D5 %5 D6 %6 D7 %7 %8 cols %9 rows %10',
    TOOLTIP_LCD_CREATE: 'Creates an LCD with pins RS, EN, D4-D7. Must go inside setup().',
    MSG_LCD_PRINT: 'LCD %1 print %2',
    TOOLTIP_LCD_PRINT: 'Prints text or number at the current cursor position.',
    MSG_LCD_SET_CURSOR: 'LCD %1 cursor col %2 row %3',
    TOOLTIP_LCD_SET_CURSOR: 'Positions the cursor at the given column and row (0-indexed).',
    MSG_LCD_CLEAR: 'LCD %1 clear display',
    TOOLTIP_LCD_CLEAR: 'Clears all content from the LCD.',
    MSG_LCD_I2C_CREATE: 'create I2C LCD %1 address %2 cols %3 rows %4',
    TOOLTIP_LCD_I2C_CREATE: 'Creates an LCD with I2C interface (only 2 pins: SDA/A4 and SCL/A5). Must go inside setup().',
    MSG_DHT_CREATE: 'create DHT sensor %1 pin %2 type %3',
    TOOLTIP_DHT_CREATE: 'Creates a DHT11 or DHT22 sensor. Must go inside setup().',
    MSG_DHT_TEMP: 'temperature of %1',
    TOOLTIP_DHT_TEMP: 'Reads the temperature in °C from the DHT sensor.',
    MSG_DHT_HUMIDITY: 'humidity of %1',
    TOOLTIP_DHT_HUMIDITY: 'Reads the relative humidity (0-100%) from the DHT sensor.',
    MSG_ULTRASONIC_CREATE: 'create ultrasonic %1 trig %2 echo %3',
    TOOLTIP_ULTRASONIC_CREATE: 'Creates an HC-SR04 ultrasonic sensor. Must go inside setup().',
    MSG_ULTRASONIC_READ: 'distance of %1 (cm)',
    TOOLTIP_ULTRASONIC_READ: 'Measures distance in centimeters using the ultrasonic sensor.',
    MSG_STEPPER_CREATE: 'create stepper motor %1 steps/rev %2 IN1 %3 IN2 %4 IN3 %5 IN4 %6',
    TOOLTIP_STEPPER_CREATE: 'Creates a stepper motor. Can go in global scope (outside setup/loop).',
    MSG_STEPPER_SPEED: 'motor %1 speed %2 RPM',
    TOOLTIP_STEPPER_SPEED: 'Sets the motor speed in RPM. Must go inside setup().',
    MSG_STEPPER_STEP: 'motor %1 rotate %2 steps',
    TOOLTIP_STEPPER_STEP: 'Rotates the motor the given number of steps. Negative = reverse direction.',
    MSG_VARIABLE_DECLARE: 'declare %1 as %2 = %3',
    TOOLTIP_VARIABLE_DECLARE: 'Declares a variable of the chosen type with an initial value.',
    MSG_VARIABLE_SET: 'set %1 to %2',
    TOOLTIP_VARIABLE_SET: 'Changes the value of a previously declared variable.',
    MSG_VARIABLE_GET: 'value of %1',
    TOOLTIP_VARIABLE_GET: 'Returns the current value of the variable.',
    // ── UI principal ──
    app_title: '⚡ ArduBlock',
    app_subtitle: 'Visual programming for Arduino — C++',
    // ── Main toolbar ──
    btn_new: '📄 New',
    btn_copy: '📋 Copy',
    btn_examples: '📚 Examples',
    btn_settings: '⚙',
    // ── Arduino toolbar ──
    btn_console: '🔌 Console',
    btn_upload: '⚡ Upload',
    // ── Code panel ──
    panel_code: 'C++ Code',
    panel_lines: 'lines',
    // ── Project manager ──
    project_placeholder: 'Project name...',
    btn_load: '📂 Load',
    btn_save: '💾 Save',
    btn_delete: '🗑 Delete',
    // ── Serial console ──
    console_title: '⚡ Arduino Console',
    serial_connect: '🔌 Connect',
    serial_disconnect: '🔌 Disconnect',
    serial_clear: '🗑 Clear',
    serial_close: '✕',
    serial_connected: '✓ Connected to',
    serial_baud_label: 'baud',
    // ── Settings ──
    settings_title: 'Settings',
    settings_hardware: 'Hardware',
    settings_board: 'Board',
    settings_baud: 'Baud rate',
    settings_blockly: 'Blockly',
    settings_theme: 'Theme',
    settings_dark: 'Dark',
    settings_light: 'Light',
    settings_renderer: 'Renderer',
    settings_fonts: 'Font size',
    settings_font_ui: 'Interface',
    settings_font_code: 'Code',
    settings_font_serial: 'Serial',
    settings_font_blocks: 'Blocks',
    settings_font_toolbox: 'Toolbox',
    settings_language: 'Language',
    settings_lang_es: 'Español',
    settings_lang_en: 'English',
    // ── Toasts ──
    toast_copied: 'Copied!',
    toast_new_project: 'New project',
    toast_saved: 'Project saved',
    toast_deleted: 'Project deleted',
    toast_loaded: 'Project loaded',
    toast_example_loaded: 'Example loaded',
    toast_code_copied: 'Code copied',
    toast_error: 'Error',
    toast_invalid_name: 'Name can only contain letters, numbers, hyphens, and underscores.',
    // ── Validation ──
    val_missing_setup: 'Missing "on start (setup)" block. The sketch will have no setup().',
    val_missing_loop: 'Missing "repeat forever (loop)" block. The sketch will have no loop().',
    val_duplicate_setup: 'There is more than one "on start (setup)" block! Only one is allowed. Remove the extras.',
    val_duplicate_loop: 'There is more than one "repeat forever (loop)" block! Only one is allowed. Remove the extras.',
    val_orphan_suffix: 'is outside setup() or loop(). It won\'t execute.',
    val_servo_undeclared_prefix: 'Servo',
    val_servo_undeclared_suffix: 'is not declared. Add a "create servo" block first.',
    val_servo_attach_suffix: 'Must go inside setup() for servo.attach() to work.',
    val_create_in_setup: 'Must go inside setup().',
    val_pin_dir_out: 'output',
    val_pin_dir_in: 'input',
    val_pin_not_conf_suffix: 'uses it but it\'s not configured with pinMode() in setup(). Should be',
    // ── Examples ──
    examples_title: 'Arduino Examples',
    examples_browse: '📂 Browse all examples...',
    examples_back: '← Back to block examples',
    examples_loading: 'Loading examples...',
    examples_count: '81 Arduino sketches',
    // ── Example modal (code) ──
    example_copy_btn: '📋 Copy to clipboard',
  }
};

// ═══ Estado ═══════════════════════════════════

let currentLang = 'es';

// ═══ API pública ══════════════════════════════

export function initLanguage() {
  let lang = 'es';
  try {
    const raw = localStorage.getItem('ardublock:settings');
    if (raw) {
      const s = JSON.parse(raw);
      if (s.language && messages[s.language]) lang = s.language;
    }
  } catch (_) { /* usar default */ }

  currentLang = lang;
  const msgs = messages[lang];
  Object.assign(Blockly.Msg, msgs);
}

export function setLanguage(lang) {
  if (!messages[lang]) return;
  try {
    const raw = localStorage.getItem('ardublock:settings') || '{}';
    const s = JSON.parse(raw);
    s.language = lang;
    localStorage.setItem('ardublock:settings', JSON.stringify(s));
  } catch (_) { /* ignorar */ }
  location.reload();
}

export function t(key) {
  const msgs = messages[currentLang];
  return msgs[key] || key;
}

export function getLanguage() {
  return currentLang;
}

export function applyDOMLanguage() {
  const langMsgs = messages[currentLang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (langMsgs[key]) el.textContent = langMsgs[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (langMsgs[key]) el.placeholder = langMsgs[key];
  });
}
