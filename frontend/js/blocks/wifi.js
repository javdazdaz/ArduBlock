import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg
/**
 * ArduBlock — Bloques: Red WiFi + Servidor Web (UNO R4 WiFi)
 *
 * Usa la librería WiFiS3 (incluida en el core renesas_uno, sin instalar nada).
 * - Conexión a una red existente: WiFi.begin() + espera a WL_CONNECTED.
 * - Modo Access Point: WiFi.beginAP().
 * - Servidor web: WiFiServer / WiFiClient (HTTP/1.1, página HTML simple).
 * - webserver_serve_file sirve el contenido de un tab .html del proyecto.
 */

// Escapa comillas/backslashes/saltos para embeber en un literal C++.
function esc(s) {
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

// Genera el handler HTTP que atiende clientes y sirve `html` (ya escapado).
function _serveHtmlHandler(html) {
  let code = '';
  code += 'WiFiClient client = server.available();\n';
  code += 'if (client) {\n';
  code += '  String currentLine = "";\n';
  code += '  while (client.connected()) {\n';
  code += '    if (client.available()) {\n';
  code += '      char c = client.read();\n';
  code += '      if (c == \'\\n\') {\n';
  code += '        if (currentLine.length() == 0) {\n';
  code += '          client.println("HTTP/1.1 200 OK");\n';
  code += '          client.println("Content-type:text/html");\n';
  code += '          client.println();\n';
  code += '          client.println("' + html + '");\n';
  code += '          break;\n';
  code += '        } else {\n';
  code += '          currentLine = "";\n';
  code += '        }\n';
  code += '      } else if (c != \'\\r\') {\n';
  code += '        currentLine += c;\n';
  code += '      }\n';
  code += '    }\n';
  code += '  }\n';
  code += '  client.stop();\n';
  code += '}\n';
  return code;
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
      { type: 'field_dropdown', name: 'FILE', options: _htmlFileOptions }
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 210,
    tooltip: Blockly.Msg.TOOLTIP_WEBSERVER_SERVE_FILE,
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
  cppGenerator.forBlock['webserver_serve'] = function(block) {
    cppGenerator._webserverUsed = true;
    const title = esc(block.getFieldValue('TITLE') || '');
    const body = esc(block.getFieldValue('BODY') || '');
    const html = '<!DOCTYPE HTML><html><head><meta charset="utf-8">'
               + '<title>' + title + '</title></head>'
               + '<body><h1>' + title + '</h1><p>' + body + '</p></body></html>';
    return _serveHtmlHandler(html);
  };

  // ── webserver_serve_file ─────────────────────
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
    return _serveHtmlHandler(esc(content));
  };

  // ── wifi_ip ──────────────────────────────────
  cppGenerator.forBlock['wifi_ip'] = function(_block) {
    cppGenerator._wifiUsed = true;
    return ['WiFi.localIP().toString()', cppGenerator.ORDER_ATOMIC];
  };
}
