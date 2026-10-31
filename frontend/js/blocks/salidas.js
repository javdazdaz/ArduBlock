import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg

/**
 * ArduBlock — Bloques: salidas nombradas
 *
 * Sustituyen las cadenas de `if (luz1 == true) digitalWrite(...)` por una
 * tabla de descriptores en el sketch: nombre, pin, polaridad y estado. El pin
 * se declara una vez, el generador configura el pinMode y el sketch escribe el
 * pin solo cuando el estado cambia.
 *
 * El C++ de la tabla y sus funciones lo emite `buildSalidas()`, que llama
 * `generateArduinoCode()`; los bloques de sentencia no emiten nada propio.
 */

const PINES = [
  ['0', '0'], ['1', '1'],
  ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'],
  ['6', '6'], ['7', '7'], ['8', '8'], ['9', '9'],
  ['10', '10'], ['11', '11'], ['12', '12'], ['13', '13'],
  ['A0', 'A0'], ['A1', 'A1'], ['A2', 'A2'],
  ['A3', 'A3'], ['A4', 'A4'], ['A5', 'A5']
];

// Escapa comillas/backslashes/saltos para embeber el nombre en un literal C++.
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n');
}

// ═══ C++ de la tabla de salidas ═══════════════════════

export function buildSalidas(declaraciones) {
  const decls = Array.isArray(declaraciones) ? declaraciones : [];
  const filas = decls.length > 0
    ? decls.map(d => '  { "' + esc(d.nombre) + '", ' + d.pin + ', '
        + (d.activoBajo ? 'true' : 'false') + ', false }').join(',\n')
    : '  { "", 255, false, false }';

  const globals =
`// ── Salidas nombradas: la tabla es la única fuente del estado ──
struct _Salida {
  const char* nombre;
  uint8_t pin;
  bool activoBajo;
  bool estado;
};

_Salida _salidas[${decls.length > 0 ? decls.length : 1}] = {
${filas}
};
const uint8_t _N_SALIDAS = ${decls.length};
`;

  const helpers =
`
int8_t _salidaIndice(const char* n) {
  for (uint8_t i = 0; i < _N_SALIDAS; i++) {
    if (strcmp(_salidas[i].nombre, n) == 0) return (int8_t)i;
  }
  return -1;
}

void _salidaFijar(const char* n, bool v) {
  int8_t i = _salidaIndice(n);
  if (i < 0) return;
  if (_salidas[i].estado == v) return;
  _salidas[i].estado = v;
  digitalWrite(_salidas[i].pin, _salidas[i].activoBajo ? !v : v);
}

bool _salidaEstado(const char* n) {
  int8_t i = _salidaIndice(n);
  return (i >= 0) ? _salidas[i].estado : false;
}

void _salidaAlternar(const char* n) {
  _salidaFijar(n, !_salidaEstado(n));
}

void _salidasIniciar() {
  for (uint8_t i = 0; i < _N_SALIDAS; i++) {
    pinMode(_salidas[i].pin, OUTPUT);
    digitalWrite(_salidas[i].pin, _salidas[i].activoBajo ? HIGH : LOW);
  }
}

`;

  return { globals, helpers };
}

// ═══ Bloques ═══════════════════════════════════

export const blocks = [
  {
    type: 'salida_declarar',
    message0: Blockly.Msg.MSG_SALIDA_DECLARAR,
    args0: [
      { type: 'field_input', name: 'NAME', text: 'luz1' },
      { type: 'field_dropdown', name: 'PIN', options: PINES },
      {
        type: 'field_dropdown', name: 'ACTIVO',
        options: [
          [Blockly.Msg.SALIDA_ACTIVA_ALTO, 'HIGH'],
          [Blockly.Msg.SALIDA_ACTIVA_BAJO, 'LOW']
        ]
      }
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 60,
    tooltip: Blockly.Msg.TOOLTIP_SALIDA_DECLARAR,
    helpUrl: ''
  },
  {
    type: 'salida_fijar',
    message0: Blockly.Msg.MSG_SALIDA_FIJAR,
    args0: [
      { type: 'field_input', name: 'NAME', text: 'luz1' },
      {
        type: 'field_dropdown', name: 'ESTADO',
        options: [
          [Blockly.Msg.SALIDA_ENCENDIDA, '1'],
          [Blockly.Msg.SALIDA_APAGADA, '0']
        ]
      }
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 60,
    tooltip: Blockly.Msg.TOOLTIP_SALIDA_FIJAR,
    helpUrl: ''
  },
  {
    type: 'salida_alternar',
    message0: Blockly.Msg.MSG_SALIDA_ALTERNAR,
    args0: [
      { type: 'field_input', name: 'NAME', text: 'luz1' }
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 60,
    tooltip: Blockly.Msg.TOOLTIP_SALIDA_ALTERNAR,
    helpUrl: ''
  },
  {
    type: 'salida_estado',
    message0: Blockly.Msg.MSG_SALIDA_ESTADO,
    args0: [
      { type: 'field_input', name: 'NAME', text: 'luz1' }
    ],
    inputsInline: true,
    output: 'Boolean',
    colour: 60,
    tooltip: Blockly.Msg.TOOLTIP_SALIDA_ESTADO,
    helpUrl: ''
  }
];

// ═══ Generadores ═══════════════════════════════

export function registerGenerators(cppGenerator) {
  // Declarar no emite sentencia: la tabla se arma en generateArduinoCode y
  // `_salidasIniciar()` entra al inicio de setup.
  cppGenerator.forBlock['salida_declarar'] = function(block) {
    cppGenerator._salidasUsed = true;
    return '';
  };

  cppGenerator.forBlock['salida_fijar'] = function(block) {
    cppGenerator._salidasUsed = true;
    const nombre = (block.getFieldValue('NAME') || '').trim();
    const valor = block.getFieldValue('ESTADO') === '1' ? 'true' : 'false';
    return '_salidaFijar("' + esc(nombre) + '", ' + valor + ');\n';
  };

  cppGenerator.forBlock['salida_alternar'] = function(block) {
    cppGenerator._salidasUsed = true;
    const nombre = (block.getFieldValue('NAME') || '').trim();
    return '_salidaAlternar("' + esc(nombre) + '");\n';
  };

  cppGenerator.forBlock['salida_estado'] = function(block) {
    cppGenerator._salidasUsed = true;
    const nombre = (block.getFieldValue('NAME') || '').trim();
    return ['_salidaEstado("' + esc(nombre) + '")', cppGenerator.ORDER_ATOMIC];
  };
}
