/**
 * ArduBlock — Registro de fuentes de ejemplos.
 *
 * Cada fuente agrupa ejemplos bajo un namespace (ej: arduino-examples).
 * El UI muestra primero el selector de fuente, luego las categorías.
 */
export const sources = [
  {
    id: 'arduino-examples',
    label: { es: '📦 Ejemplos Arduino', en: '📦 Arduino Examples' },
    description: {
      es: 'Ejemplos oficiales de Arduino convertidos a bloques',
      en: 'Official Arduino examples converted to blocks'
    },
    categories: [
      { id: '01.Basics',        label: { es: '01. Básicos',          en: '01. Basics' } },
      { id: '02.Digital',       label: { es: '02. Digital',          en: '02. Digital' } },
      { id: '03.Analog',        label: { es: '03. Analógico',        en: '03. Analog' } },
      { id: '04.Communication', label: { es: '04. Comunicación',     en: '04. Communication' } },
      { id: '05.Control',       label: { es: '05. Control',          en: '05. Control' } },
    ]
  },
  {
    id: 'ardublock-examples',
    label: { es: '🧩 Ejemplos ArduBlock', en: '🧩 ArduBlock Examples' },
    description: {
      es: 'Ejemplos creados específicamente para ArduBlock',
      en: 'Examples created specifically for ArduBlock'
    },
    categories: [
      { id: 'matrix', label: { es: 'Matriz LED R4', en: 'LED Matrix R4' } },
    ]
  },
];
