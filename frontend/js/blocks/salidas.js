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

export function buildSalidas(declaraciones, opciones = {}) {
  const decls = Array.isArray(declaraciones) ? declaraciones : [];
  const { mensajes = false, estadoTexto = false } = opciones;
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

` + (mensajes ? `
// Orden que llega por WebSocket: "luz1=1;bomba=0". Un nombre desconocido
// no escribe nada: _salidaFijar devuelve sin tocar el pin.
void _salidasAtenderMensaje(const String& msg) {
  int i = 0;
  while (i < (int)msg.length()) {
    int fin = msg.indexOf(';', i);
    if (fin < 0) fin = msg.length();
    int igual = msg.indexOf('=', i);
    if (igual >= i && igual < fin) {
      String nombre = msg.substring(i, igual); nombre.trim();
      String valor  = msg.substring(igual + 1, fin); valor.trim(); valor.toLowerCase();
      if (valor == "1" || valor == "on"  || valor == "true"  || valor == "high") _salidaFijar(nombre.c_str(), true);
      else if (valor == "0" || valor == "off" || valor == "false" || valor == "low") _salidaFijar(nombre.c_str(), false);
    }
    i = fin + 1;
  }
}

` : '') + (estadoTexto ? `
// Estado de todas las salidas con el mismo formato que consume el parser.
String _salidasEstadoTexto() {
  String s = "";
  for (uint8_t i = 0; i < _N_SALIDAS; i++) {
    if (i > 0) s += ";";
    s += _salidas[i].nombre;
    s += _salidas[i].estado ? "=1" : "=0";
  }
  return s;
}

` : '');

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
  },
  {
    // Color de la familia WebSocket: este bloque lee _wsMessage.
    type: 'salida_atender_mensaje',
    message0: Blockly.Msg.MSG_SALIDA_ATENDER,
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 230,
    tooltip: Blockly.Msg.TOOLTIP_SALIDA_ATENDER,
    helpUrl: ''
  },
  {
    type: 'salidas_estado_texto',
    message0: Blockly.Msg.MSG_SALIDAS_ESTADO_TEXTO,
    inputsInline: true,
    output: 'String',
    colour: 230,
    tooltip: Blockly.Msg.TOOLTIP_SALIDAS_ESTADO_TEXTO,
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

  // Atiende el texto que llegó por WebSocket: "luz1=1;bomba=0".
  cppGenerator.forBlock['salida_atender_mensaje'] = function(_block) {
    cppGenerator._salidasUsed = true;
    cppGenerator._salidaMensajeUsed = true;
    return '_salidasAtenderMensaje(_wsMessage);\n';
  };

  cppGenerator.forBlock['salidas_estado_texto'] = function(_block) {
    cppGenerator._salidasUsed = true;
    cppGenerator._salidaEstadoTextoUsed = true;
    return ['_salidasEstadoTexto()', cppGenerator.ORDER_ATOMIC];
  };
}
