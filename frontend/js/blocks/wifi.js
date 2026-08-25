import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg
/**
 * ArduBlock — Bloques: Red WiFi + Servidor Web (UNO R4 WiFi)
 *
 * Usa la librería WiFiS3 (incluida en el core renesas_uno, sin instalar nada).
 * - Conexión a una red existente: WiFi.begin() + espera a WL_CONNECTED.
 * - Modo Access Point: WiFi.beginAP().
 * - Servidor web unificado: un único handler atiende cada cliente, lee la ruta
 *   pedida, ejecuta los bloques "cuando visiten" que coincidan y, si no hay
 *   coincidencia, sirve la página principal (webserver_serve / _serve_file).
 */

// Escapa comillas/backslashes/saltos para embeber en un literal C++.
export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n');
}

// Opciones del dropdown: tabs .html del proyecto.
function _htmlFileOptions() {
  const opts = [];
  try {
    if (window._tabManager) {
      const tabs = window._tabManager.getTabs();
      for (const t of tabs) {
        if (t.filename && /\.html?$/i.test(t.filename)) {
          opts.push([t.filename, t.filename]);
        }
      }
    }
  } catch (_) { /* ignore */ }
  if (opts.length === 0) opts.push([Blockly.Msg.OPT_WEBSERVER_NO_HTML, '']);
  return opts;
}

/**
 * Campo para elegir el archivo .html que se sirve.
 *
 * Las opciones se generan desde los tabs .html abiertos. Con el FieldDropdown
 * estándar eso rompe la deserialización: si el proyecto se carga antes que sus
 * tabs (o si el alumno renombró/borró el archivo), el valor guardado no está
 * entre las opciones, Blockly lo rechaza
 * ("Cannot set the dropdown's value to an unavailable option") y deja el campo
 * vacío → se pierde la referencia en silencio y el Arduino sirve una página
 * vacía.
 *
 * Este campo conserva siempre el valor guardado y, si el archivo no está,
 * lo muestra marcado como faltante (el validador R9e avisa del problema).
 */
export class FieldHtmlFile extends Blockly.FieldDropdown {
  constructor(validator, config) {
    super(_htmlFileOptions, validator, config);
  }

  static fromJson(options) {
    return new FieldHtmlFile(undefined, options);
  }

  /** Acepta cualquier nombre de archivo, esté o no entre los tabs cargados. */
  doClassValidation_(newValue) {
    return newValue == null ? null : String(newValue);
  }

  /** Inyecta el archivo referenciado si no está entre los tabs .html. */
  getOptions(useCache) {
    const opts = super.getOptions(useCache);
    const val = this.getValue();
    if (!val || opts.some(o => o[1] === val)) return opts;
    const suffix = Blockly.Msg.OPT_WEBSERVER_FILE_MISSING || '';
    const missing = [(String(val) + ' ' + suffix).trim(), val];
    return [missing, ...opts.filter(o => o[1] !== '')];
  }
}

try {
  Blockly.fieldRegistry.register('field_html_file', FieldHtmlFile);
} catch (_) {
  // Ya registrado (recarga en caliente de Vite): no es un error.
}

// ═══════════════════════════════════════════════════════════
//  Servidor web unificado (lo emite generateArduinoCode)
// ═══════════════════════════════════════════════════════════

/**
 * Genera las funciones auxiliares del servidor + el fragmento de loop().
 *
 * @param {string|null} page   Contenido HTML de la página principal (raw).
 * @param {Array} routes       Lista de {path, body} de bloques "cuando visiten".
 * @returns {{helpers: string, loop: string}}
 */
export function buildWebServer(page, routes) {
  const pageContent = page
    ? esc(page)
    : '<!DOCTYPE HTML><html><body>Servidor ArduBlock</body></html>';

  let helpers = '';
  helpers += 'String _ardublock_query = "";\n';
  helpers += 'String _ardublock_body = "";\n\n';
  helpers += 'String _readRequestPath(WiFiClient client) {\n';
  helpers += '  String line = "";\n';
  helpers += '  unsigned long _t = millis();\n';
  helpers += '  while (client.connected() && !client.available() && (millis() - _t) < 1000) { }\n';
  helpers += '  while (client.connected() && client.available()) {\n';
  helpers += '    char c = client.read();\n';
  helpers += '    if (c == \'\\n\') break;\n';
  helpers += '    if (c != \'\\r\') line += c;\n';
  helpers += '  }\n';
  helpers += '  int _s = line.indexOf(\' \');\n';
  helpers += '  int _e = (_s >= 0) ? line.indexOf(\' \', _s + 1) : -1;\n';
  helpers += '  String full = (_s >= 0 && _e >= 0) ? line.substring(_s + 1, _e) : "/";\n';
  helpers += '  int _q = full.indexOf(\'?\');\n';
  helpers += '  if (_q >= 0) { _ardublock_query = full.substring(_q + 1); full = full.substring(0, _q); }\n';
  helpers += '  else _ardublock_query = "";\n';
  helpers += '  // leer el resto de headers y, si hay Content-Length, el body\n';
  helpers += '  int _contentLength = 0;\n';
  helpers += '  String _h = "";\n';
  helpers += '  bool _inBody = false;\n';
  helpers += '  _ardublock_body = "";\n';
  helpers += '  while (client.connected() && client.available()) {\n';
  helpers += '    char c = client.read();\n';
  helpers += '    if (_inBody) {\n';
  helpers += '      _ardublock_body += c;\n';
  helpers += '      if ((int)_ardublock_body.length() >= _contentLength) break;\n';
  helpers += '      continue;\n';
  helpers += '    }\n';
  helpers += '    if (c == \'\\n\') {\n';
  helpers += '      if (_h.length() == 0) {\n';
  helpers += '        if (_contentLength > 0) { _inBody = true; }\n';
  helpers += '        else break;\n';
  helpers += '      } else {\n';
  helpers += '        if (_h.startsWith("Content-Length:")) {\n';
  helpers += '          String _v = _h.substring(15); _v.trim();\n';
  helpers += '          _contentLength = _v.toInt();\n';
  helpers += '        }\n';
  helpers += '        _h = "";\n';
  helpers += '      }\n';
  helpers += '    } else if (c != \'\\r\') {\n';
  helpers += '      _h += c;\n';
  helpers += '    }\n';
  helpers += '  }\n';
  helpers += '  return full;\n';
  helpers += '}\n\n';
  helpers += 'String _getQueryParam(String name) {\n';
  helpers += '  String key = name + "=";\n';
  helpers += '  int start = _ardublock_query.indexOf(key);\n';
  helpers += '  if (start < 0) return "";\n';
  helpers += '  start += key.length();\n';
  helpers += '  int end = _ardublock_query.indexOf(\'&\', start);\n';
  helpers += '  if (end < 0) end = _ardublock_query.length();\n';
  helpers += '  return _ardublock_query.substring(start, end);\n';
  helpers += '}\n\n';

  helpers += 'void _handleWebRequest(WiFiClient client, String path) {\n';
  for (const r of (routes || [])) {
    helpers += '  if (path == "' + r.path + '") {\n';
    helpers += (r.body || '  // sin acciones\n');
    if (!r.respond) {
      helpers += '    client.println("HTTP/1.1 303 See Other");\n';
      helpers += '    client.println("Location: /");\n';
      helpers += '    client.println();\n';
      helpers += '    return;\n';
    }
    helpers += '  }\n';
  }
  helpers += '  client.println("HTTP/1.1 200 OK");\n';
  helpers += '  client.println("Content-type:text/html");\n';
  helpers += '  client.println();\n';
  helpers += '  client.println("' + pageContent + '");\n';
  helpers += '}\n\n';

  const loop = 'WiFiClient client = server.available();\n'
             + 'if (client) {\n'
             + '  String path = _readRequestPath(client);\n'
             + '  _handleWebRequest(client, path);\n'
             + '  client.stop();\n'
             + '}\n';

  return { helpers, loop };
}

// ═══ Bloques ═══════════════════════════════════

export const blocks = [
  {
    type: 'wifi_connect',
    message0: Blockly.Msg.MSG_WIFI_CONNECT,
    args0: [
      { type: 'field_input', name: 'SSID', text: 'miRed' },
      { type: 'field_input', name: 'PASS', text: 'clave' }
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: Blockly.Msg.TOOLTIP_WIFI_CONNECT,
    helpUrl: ''
  },
  {
    type: 'wifi_access_point',
    message0: Blockly.Msg.MSG_WIFI_ACCESS_POINT,
    args0: [
      { type: 'field_input', name: 'SSID', text: 'MiArduino' },
      { type: 'field_input', name: 'PASS', text: '12345678' }
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: Blockly.Msg.TOOLTIP_WIFI_ACCESS_POINT,
    helpUrl: ''
  },
  {
    type: 'webserver_begin',
    message0: Blockly.Msg.MSG_WEBSERVER_BEGIN,
    args0: [
      { type: 'field_number', name: 'PORT', value: 80, min: 1, max: 65535 }
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: Blockly.Msg.TOOLTIP_WEBSERVER_BEGIN,
    helpUrl: ''
  },
  {
    type: 'webserver_serve',
    message0: Blockly.Msg.MSG_WEBSERVER_SERVE,
    args0: [
      { type: 'field_input', name: 'TITLE', text: 'Mi proyecto' },
      { type: 'field_input', name: 'BODY', text: '¡Hola desde Arduino!' }
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: Blockly.Msg.TOOLTIP_WEBSERVER_SERVE,
    helpUrl: ''
  },
  {
    type: 'webserver_serve_file',
    message0: Blockly.Msg.MSG_WEBSERVER_SERVE_FILE,
    args0: [
      { type: 'field_html_file', name: 'FILE' }
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: Blockly.Msg.TOOLTIP_WEBSERVER_SERVE_FILE,
    helpUrl: ''
  },
  {
    type: 'webserver_on',
    message0: Blockly.Msg.MSG_WEBSERVER_ON,
    args0: [
      { type: 'field_input', name: 'PATH', text: '/led/on' }
    ],
    message1: Blockly.Msg.MSG_WEBSERVER_ON_DO,
    args1: [
      { type: 'input_statement', name: 'DO' }
    ],
    colour: 210,
    tooltip: Blockly.Msg.TOOLTIP_WEBSERVER_ON,
    helpUrl: ''
  },
  {
    type: 'webserver_respond',
    message0: Blockly.Msg.MSG_WEBSERVER_RESPOND,
    args0: [
      { type: 'field_dropdown', name: 'CTYPE', options: [
        ['texto', 'text/plain'],
        ['HTML', 'text/html'],
        ['JSON', 'application/json']
      ] },
      { type: 'input_value', name: 'VALUE' }
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: Blockly.Msg.TOOLTIP_WEBSERVER_RESPOND,
    helpUrl: ''
  },
  {
    type: 'webserver_query',
    message0: Blockly.Msg.MSG_WEBSERVER_QUERY,
    args0: [
      { type: 'field_input', name: 'NAME', text: 'angulo' }
    ],
    inputsInline: true,
    output: 'String',
    colour: 210,
    tooltip: Blockly.Msg.TOOLTIP_WEBSERVER_QUERY,
    helpUrl: ''
  },
  {
    type: 'webserver_body',
    message0: Blockly.Msg.MSG_WEBSERVER_BODY,
    output: 'String',
    colour: 210,
    tooltip: Blockly.Msg.TOOLTIP_WEBSERVER_BODY,
    helpUrl: ''
  },
  {
    type: 'wifi_ip',
    message0: Blockly.Msg.MSG_WIFI_IP,
    inputsInline: true,
    output: 'String',
    colour: 210,
    tooltip: Blockly.Msg.TOOLTIP_WIFI_IP,
    helpUrl: ''
  },
  {
    type: 'wifi_connected',
    message0: Blockly.Msg.MSG_WIFI_CONNECTED,
    output: 'Boolean',
    colour: 210,
    tooltip: Blockly.Msg.TOOLTIP_WIFI_CONNECTED,
    helpUrl: ''
  },
  {
    type: 'wifi_rssi',
    message0: Blockly.Msg.MSG_WIFI_RSSI,
    output: 'Number',
    colour: 210,
    tooltip: Blockly.Msg.TOOLTIP_WIFI_RSSI,
    helpUrl: ''
  },
  {
    type: 'wifi_mac',
    message0: Blockly.Msg.MSG_WIFI_MAC,
    output: 'String',
    colour: 210,
    tooltip: Blockly.Msg.TOOLTIP_WIFI_MAC,
    helpUrl: ''
  }
];

// ═══ Generadores ═══════════════════════════════

export function registerGenerators(cppGenerator) {

  // ── wifi_connect ─────────────────────────────
  cppGenerator.forBlock['wifi_connect'] = function(block) {
    cppGenerator._wifiUsed = true;
    const ssid = block.getFieldValue('SSID') || 'miRed';
    const pass = block.getFieldValue('PASS') || '';
    return 'WiFi.begin("' + esc(ssid) + '", "' + esc(pass) + '");\n'
         + 'while (WiFi.status() != WL_CONNECTED) {\n'
         + '  delay(500);\n'
         + '}\n';
  };

  // ── wifi_access_point ────────────────────────
  cppGenerator.forBlock['wifi_access_point'] = function(block) {
    cppGenerator._wifiUsed = true;
    const ssid = block.getFieldValue('SSID') || 'MiArduino';
    const pass = block.getFieldValue('PASS') || '';
    return 'WiFi.beginAP("' + esc(ssid) + '", "' + esc(pass) + '");\n';
  };

  // ── webserver_begin ──────────────────────────
  cppGenerator.forBlock['webserver_begin'] = function(block) {
    cppGenerator._webserverUsed = true;
    const port = parseInt(block.getFieldValue('PORT'), 10);
    cppGenerator._webserverPort = (port > 0 && port <= 65535) ? port : 80;
    return 'server.begin();\n';
  };

  // ── webserver_serve ──────────────────────────
  // Registra la página principal (título + texto). La sirve el handler unificado.
  cppGenerator.forBlock['webserver_serve'] = function(block) {
    cppGenerator._webserverUsed = true;
    const title = block.getFieldValue('TITLE') || '';
    const body = block.getFieldValue('BODY') || '';
    const html = '<!DOCTYPE HTML><html><head><meta charset="utf-8">'
               + '<title>' + title + '</title></head>'
               + '<body><h1>' + title + '</h1><p>' + body + '</p></body></html>';
    cppGenerator._webserverPage = html;
    return '';
  };

  // ── webserver_serve_file ─────────────────────
  // Registra la página principal desde el contenido del tab .html.
  cppGenerator.forBlock['webserver_serve_file'] = function(block) {
    cppGenerator._webserverUsed = true;
    const file = block.getFieldValue('FILE') || '';
    let content = '';
    if (file && typeof window !== 'undefined' && window._tabManager) {
      try {
        const tab = window._tabManager.getTabs().find(t => t.filename === file);
        if (tab) content = tab.content || '';
      } catch (_) { /* ignore */ }
    }
    cppGenerator._webserverPage = content;
    return '';
  };

  // ── webserver_on (ruta dinámica) ─────────────
  // Registra una ruta: cuando el navegador pide PATH, ejecuta el cuerpo DO.
  // Si el cuerpo incluye un bloque webserver_respond, responde con ese valor
  // (sin redirect); si no, redirige a "/" tras ejecutar las acciones.
  cppGenerator.forBlock['webserver_on'] = function(block) {
    cppGenerator._webserverUsed = true;
    let path = (block.getFieldValue('PATH') || '/').trim();
    if (!path.startsWith('/')) path = '/' + path;
    const prevRespond = cppGenerator._webRespondUsed;
    cppGenerator._webRespondUsed = false;
    const body = cppGenerator.statementToCode(block, 'DO') || '  // sin acciones\n';
    const respond = cppGenerator._webRespondUsed;
    cppGenerator._webRespondUsed = prevRespond;
    cppGenerator._webRoutes = cppGenerator._webRoutes || [];
    cppGenerator._webRoutes.push({ path: esc(path), body, respond });
    return '';
  };

  // ── webserver_respond (datos en vivo) ────────
  // Responde a la petición con un valor (p. ej. analogRead) en text/plain.
  // Va DENTRO de "cuando visiten"; su presencia desactiva el redirect.
  cppGenerator.forBlock['webserver_respond'] = function(block) {
    cppGenerator._webserverUsed = true;
    cppGenerator._webRespondUsed = true;
    const ctype = block.getFieldValue('CTYPE') || 'text/plain';
    const v = cppGenerator.valueToCode(block, 'VALUE', cppGenerator.ORDER_NONE) || '""';
    return 'client.println("HTTP/1.1 200 OK");\n'
         + 'client.println("Content-type:' + ctype + '");\n'
         + 'client.println();\n'
         + 'client.println(String(' + v + '));\n'
         + 'return;\n';
  };

  // ── webserver_query (parámetro de URL) ───────
  cppGenerator.forBlock['webserver_query'] = function(block) {
    cppGenerator._webserverUsed = true;
    const name = block.getFieldValue('NAME') || 'param';
    return ['_getQueryParam("' + esc(name) + '")', cppGenerator.ORDER_ATOMIC];
  };

  // ── webserver_body (cuerpo del POST) ─────────
  cppGenerator.forBlock['webserver_body'] = function(_block) {
    cppGenerator._webserverUsed = true;
    return ['_ardublock_body', cppGenerator.ORDER_ATOMIC];
  };

  // ── wifi_ip ──────────────────────────────────
  cppGenerator.forBlock['wifi_ip'] = function(_block) {
    cppGenerator._wifiUsed = true;
    return ['WiFi.localIP().toString()', cppGenerator.ORDER_ATOMIC];
  };

  // ── wifi_connected ───────────────────────────
  cppGenerator.forBlock['wifi_connected'] = function(_block) {
    cppGenerator._wifiUsed = true;
    return ['(WiFi.status() == WL_CONNECTED)', cppGenerator.ORDER_ATOMIC];
  };

  // ── wifi_rssi ────────────────────────────────
  cppGenerator.forBlock['wifi_rssi'] = function(_block) {
    cppGenerator._wifiUsed = true;
    return ['WiFi.RSSI()', cppGenerator.ORDER_ATOMIC];
  };

  // ── wifi_mac ─────────────────────────────────
  cppGenerator.forBlock['wifi_mac'] = function(_block) {
    cppGenerator._wifiUsed = true;
    return ['WiFi.macAddress()', cppGenerator.ORDER_ATOMIC];
  };
}
