/**
 * ArduBlock — Ejemplos: pantalla OLED SSD1315 (I2C crudo)
 *
 * El estado solo lleva los bloques. Las dos tablas .h que el bloque de
 * animación referencia no viajan en el bundle: `recursoOled` le dice al
 * cargador de ejemplos que las escriba al abrir el ejemplo, con el mismo
 * reparto que usa el botón «Cargar Bad Apple!!».
 */

import _OledBadApple from '../../examples/blockly-states/ardublock-examples/oled/OledBadApple.json';

export const oledExamples = [
  {
    name: 'OledBadApple',
    source: 'ardublock-examples',
    category: 'oled',
    description: {
      es: 'Reproduce Bad Apple!! (871 cuadros, 34,8 s) en una OLED SSD1315; ocupa 243 KB de flash, así que necesita un R4 WiFi',
      en: 'Plays Bad Apple!! (871 frames, 34.8 s) on an SSD1315 OLED; it takes 243 KB of flash, so it needs an R4 WiFi'
    },
    comment: {
      es: '/*\n  OledBadApple\n\n  Reproduce Bad Apple!! (34,8 s, 871 cuadros a\n  25 FPS) en una pantalla OLED SSD1315 de\n  128x64 por I2C, sin librerías gráficas.\n\n  setup()  inicia la pantalla en 0x3C a 400 kHz:\n           el refresco de 1024 B por cuadro exige\n           ese reloj para llegar a 25 FPS.\n  loop()   llama a la animación completa; al\n           terminar, la vuelta siguiente la repite.\n\n  Los 871 cuadros viven en oled_anim_badapple.h:\n  615 KB de tabla en un solo tab, bajo el tope\n  de 1 MB por archivo del proyecto.\n\n  La tabla completa ocupa 243 KB de flash: entra\n  en el UNO R4 WiFi y no en el UNO R3.\n\n  ArduBlock — 2026\n*/',
      en: '/*\n  OledBadApple\n\n  Plays Bad Apple!! (34.8 s, 871 frames at\n  25 FPS) on a 128x64 SSD1315 OLED display\n  over I2C, without graphics libraries.\n\n  setup()  starts the display at 0x3C, 400 kHz:\n           pushing 1024 B per frame needs that\n           clock to reach 25 FPS.\n  loop()   calls the full animation; when it\n           ends, the next pass repeats it.\n\n  The 871 frames live in oled_anim_badapple.h:\n  615 KB of table in a single tab, under the\n  1 MB per-file limit of the project.\n\n  ArduBlock — 2026\n*/'
    },
    state: _OledBadApple,
    recursoOled: 'badapple',
    // La tabla ocupa 243 KB: el ejemplo elige la placa que puede con ella y no
    // deja al usuario con el UNO R3, donde la compilación falla.
    board: 'arduino:renesas_uno:unor4wifi',
  },
];
