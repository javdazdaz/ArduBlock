import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg

/**
 * ArduBlock — Bloques WebSocket (UNO R4 WiFi, sin librerías externas).
 *
 * Implementa un servidor WebSocket mínimo sobre WiFiS3:
 *   - handshake HTTP (Upgrade) con Sec-WebSocket-Accept (SHA1 + Base64)
 *   - recibe frames de texto enmascarados del cliente
 *   - envía frames de texto sin máscara
 *
 * El servidor WS corre en un puerto separado (default 81) del HTTP (80).
 * Todo el C++ (SHA1, Base64, codec) se emite como helpers autocontenidos.
 */

// Escapa comillas/backslashes/saltos para embeber en un literal C++.
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n');
}

// ═══════════════════════════════════════════════════════════
//  Generación del servidor WebSocket (la emite generateArduinoCode)
// ═══════════════════════════════════════════════════════════

export function buildWebSocket(port, messageBody, opciones = {}) {
  // compartido: el proyecto ya tiene servidor web, así que el WebSocket entra
  // por el mismo puerto y no se crea un segundo WiFiServer.
  const { compartido = false } = opciones;
  const p = (port > 0 && port <= 65535) ? port : 81;

  const globals =
`${compartido ? '' : 'WiFiServer _wsServer(' + p + ');\n'}WiFiClient _wsClient;
bool _wsConnected = false;
String _wsMessage = "";
int _wsAceptados = 0;
int _wsFallidos = 0;
int _wsMensajes = 0;
int _wsUltimoError = 0;   // 0 ninguno, 1 sin clave, 2 socket caido, 3 envio sin conexion
`;

  const helpers =
`// ── SHA1 (RFC 3174) para el handshake WebSocket ──
void _sha1(const uint8_t* msg, int len, uint8_t* out) {
  uint32_t h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
  int newlen = len + 1;
  while (newlen % 64 != 56) newlen++;
  uint8_t* buf = (uint8_t*)malloc(newlen + 8);
  if (!buf) return;
  memset(buf, 0, newlen + 8);
  memcpy(buf, msg, len);
  buf[len] = 0x80;
  uint64_t bitlen = (uint64_t)len * 8;
  for (int i = 0; i < 8; i++) buf[newlen + 7 - i] = (bitlen >> (i * 8)) & 0xFF;
  for (int off = 0; off < newlen + 8; off += 64) {
    uint32_t w[80];
    for (int i = 0; i < 16; i++) {
      w[i] = ((uint32_t)buf[off + i*4] << 24) | ((uint32_t)buf[off + i*4 + 1] << 16)
           | ((uint32_t)buf[off + i*4 + 2] << 8) | buf[off + i*4 + 3];
    }
    for (int i = 16; i < 80; i++) {
      uint32_t x = w[i-3] ^ w[i-8] ^ w[i-14] ^ w[i-16];
      w[i] = (x << 1) | (x >> 31);
    }
    uint32_t a = h0, b = h1, c = h2, d = h3, e = h4;
    for (int i = 0; i < 80; i++) {
      uint32_t f, k;
      if (i < 20) { f = (b & c) | ((~b) & d); k = 0x5A827999; }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
      else { f = b ^ c ^ d; k = 0xCA62C1D6; }
      uint32_t tmp = ((a << 5) | (a >> 27)) + f + e + k + w[i];
      e = d; d = c; c = (b << 30) | (b >> 2); b = a; a = tmp;
    }
    h0 += a; h1 += b; h2 += c; h3 += d; h4 += e;
  }
  free(buf);
  out[0] = h0 >> 24; out[1] = h0 >> 16; out[2] = h0 >> 8; out[3] = h0;
  out[4] = h1 >> 24; out[5] = h1 >> 16; out[6] = h1 >> 8; out[7] = h1;
  out[8] = h2 >> 24; out[9] = h2 >> 16; out[10] = h2 >> 8; out[11] = h2;
  out[12] = h3 >> 24; out[13] = h3 >> 16; out[14] = h3 >> 8; out[15] = h3;
  out[16] = h4 >> 24; out[17] = h4 >> 16; out[18] = h4 >> 8; out[19] = h4;
}

String _wsBase64(const uint8_t* data, int len) {
  const char* b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  String out = "";
  for (int i = 0; i < len; i += 3) {
    uint32_t n = (uint32_t)data[i] << 16;
    if (i + 1 < len) n |= (uint32_t)data[i + 1] << 8;
    if (i + 2 < len) n |= data[i + 2];
    out += b64[(n >> 18) & 63];
    out += b64[(n >> 12) & 63];
    out += (i + 1 < len) ? b64[(n >> 6) & 63] : '=';
    out += (i + 2 < len) ? b64[n & 63] : '=';
  }
  return out;
}

String _wsAcceptKey(String key) {
  String magic = key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
  uint8_t hash[20];
  _sha1((const uint8_t*)magic.c_str(), magic.length(), hash);
  return _wsBase64(hash, 20);
}

String _wsLeerPedido(WiFiClient& c) {
  // El pedido puede llegar en dos trozos: se acumula hasta la linea en blanco
  // que cierra las cabeceras. Leer solo lo disponible deja la clave vacia y el
  // navegador aborta con "interrupted while the page was loading".
  String req = "";
  unsigned long t0 = millis();
  while (c.connected() && (millis() - t0) < 2000) {
    while (c.available()) req += (char)c.read();
    if (req.indexOf("\\r\\n\\r\\n") >= 0) break;
  }
  return req;
}

// Responde 101 y se queda con la sesion. Falso si el pedido no trae
// Sec-WebSocket-Key: ahi el llamador decide si cierra el socket.
bool _wsAceptar(WiFiClient& c, const String& req) {
  int p = req.indexOf("Sec-WebSocket-Key:");
  int fin = (p >= 0) ? req.indexOf("\\r\\n", p) : -1;
  String key = (p >= 0) ? ((fin < 0) ? req.substring(p + 18) : req.substring(p + 18, fin)) : "";
  key.trim();
  if (key.length() == 0) { _wsUltimoError = 1; return false; }
  c.println("HTTP/1.1 101 Switching Protocols");
  c.println("Upgrade: websocket");
  c.println("Connection: Upgrade");
  c.println("Sec-WebSocket-Accept: " + _wsAcceptKey(key));
  c.println();
  if (_wsConnected) _wsClient.stop();
  _wsClient = c;
  _wsConnected = true;
  _wsAceptados++;
  return true;
}

bool _wsReadMessage() {
  if (!_wsConnected || !_wsClient.connected()) { _wsConnected = false; return false; }
  if (_wsClient.available() < 2) return false;
  uint8_t b0 = _wsClient.read();
  uint8_t b1 = _wsClient.read();
  int opcode = b0 & 0x0F;
  bool masked = (b1 & 0x80) != 0;
  uint64_t len = b1 & 0x7F;
  if (len == 126) {
    len = ((uint64_t)_wsClient.read() << 8) | _wsClient.read();
  } else if (len == 127) {
    len = 0;
    for (int i = 0; i < 8; i++) len = (len << 8) | (uint8_t)_wsClient.read();
  }
  uint8_t mask[4];
  if (masked) {
    for (int i = 0; i < 4; i++) mask[i] = _wsClient.read();
  }
  String payload = "";
  for (uint64_t i = 0; i < len; i++) {
    if (!_wsClient.available()) break;
    uint8_t c = _wsClient.read();
    if (masked) c ^= mask[i % 4];
    payload += (char)c;
  }
  if (opcode == 0x8) {  // close
    _wsConnected = false;
    _wsClient.stop();
    return false;
  }
  if (opcode == 0x1) {  // texto
    _wsMessage = payload;
    _wsMensajes++;
    return true;
  }
  return false;
}

void _wsSend(String msg) {
  if (!_wsConnected || !_wsClient.connected()) { _wsUltimoError = 3; return; }
  _wsClient.write(0x81);  // FIN + opcode texto
  int len = msg.length();
  if (len < 126) {
    _wsClient.write((uint8_t)len);
  } else if (len < 65536) {
    _wsClient.write(126);
    _wsClient.write((len >> 8) & 0xFF);
    _wsClient.write(len & 0xFF);
  } else {
    _wsClient.write(127);
    for (int i = 7; i >= 0; i--) _wsClient.write((uint8_t)(((uint64_t)len >> (i * 8)) & 0xFF));
  }
  _wsClient.print(msg);
}

String _wsDiagTexto() {
  String s = "a=";
  s += _wsAceptados;
  s += " f=";
  s += _wsFallidos;
  s += " m=";
  s += _wsMensajes;
  s += " c=";
  s += (_wsConnected ? 1 : 0);
  s += " e=";
  s += _wsUltimoError;
  return s;
}

`;

  const loop = compartido
    ? `  // WebSocket en el puerto de la pagina: el pedido con Upgrade lo atiende
  // el servidor web, que ya leyó las cabeceras.
  if (_wsConnected && !_wsClient.connected()) { _wsConnected = false; _wsUltimoError = 2; }
  if (_wsConnected && _wsReadMessage()) {
${messageBody || '    // sin acciones\n'}
  }
`
    : `  // WebSocket en su propio puerto. available() vuelve a entregar la conexion
  // cuando llegan datos: solo se acepta si no hay sesion viva.
  if (_wsConnected && !_wsClient.connected()) { _wsConnected = false; _wsUltimoError = 2; }
  WiFiClient _nuevo = _wsServer.available();
  if (_nuevo && !_wsConnected) {
    if (!_wsAceptar(_nuevo, _wsLeerPedido(_nuevo))) { _wsFallidos++; _nuevo.stop(); }
  }
  if (_wsConnected && _wsReadMessage()) {
${messageBody || '    // sin acciones\n'}
  }
`;

  return { globals, helpers, loop };
}

// ═══ Bloques ═══════════════════════════════════

export const blocks = [
  {
    type: 'websocket_begin',
    message0: Blockly.Msg.MSG_WEBSOCKET_BEGIN,
    args0: [
      { type: 'field_number', name: 'PORT', value: 81, min: 1, max: 65535 }
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 230,
    tooltip: Blockly.Msg.TOOLTIP_WEBSOCKET_BEGIN,
    helpUrl: ''
  },
  {
    type: 'websocket_on_message',
    message0: Blockly.Msg.MSG_WEBSOCKET_ON_MESSAGE,
    message1: Blockly.Msg.MSG_WEBSOCKET_ON_MESSAGE_DO,
    args1: [
      { type: 'input_statement', name: 'DO' }
    ],
    colour: 230,
    tooltip: Blockly.Msg.TOOLTIP_WEBSOCKET_ON_MESSAGE,
    helpUrl: ''
  },
  {
    type: 'websocket_send',
    message0: Blockly.Msg.MSG_WEBSOCKET_SEND,
    args0: [
      { type: 'input_value', name: 'VALUE' }
    ],
    inputsInline: true,
    previousStatement: null,
    nextStatement: null,
    colour: 230,
    tooltip: Blockly.Msg.TOOLTIP_WEBSOCKET_SEND,
    helpUrl: ''
  },
  {
    type: 'websocket_message',
    message0: Blockly.Msg.MSG_WEBSOCKET_MESSAGE,
    output: 'String',
    colour: 230,
    tooltip: Blockly.Msg.TOOLTIP_WEBSOCKET_MESSAGE,
    helpUrl: ''
  },
  {
    type: 'websocket_connected',
    message0: Blockly.Msg.MSG_WEBSOCKET_CONNECTED,
    output: 'Boolean',
    colour: 230,
    tooltip: Blockly.Msg.TOOLTIP_WEBSOCKET_CONNECTED,
    helpUrl: ''
  }
];

// ═══ Generadores ═══════════════════════════════

export function registerGenerators(cppGenerator) {
  cppGenerator.forBlock['websocket_begin'] = function(block) {
    cppGenerator._websocketUsed = true;
    cppGenerator._wifiUsed = true;
    const port = parseInt(block.getFieldValue('PORT'), 10);
    cppGenerator._websocketPort = (port > 0 && port <= 65535) ? port : 81;
    // El arranque del servidor propio lo inyecta el generador: con servidor web
    // en el proyecto no hay segundo servidor que arrancar.
    return '';
  };

  cppGenerator.forBlock['websocket_on_message'] = function(block) {
    cppGenerator._websocketUsed = true;
    cppGenerator._wifiUsed = true;
    const body = cppGenerator.statementToCode(block, 'DO') || '  // sin acciones\n';
    cppGenerator._wsMessageBody = (cppGenerator._wsMessageBody || '') + body;
    return '';
  };

  cppGenerator.forBlock['websocket_send'] = function(block) {
    cppGenerator._websocketUsed = true;
    cppGenerator._wifiUsed = true;
    const v = cppGenerator.valueToCode(block, 'VALUE', cppGenerator.ORDER_NONE) || '""';
    return '_wsSend(String(' + v + '));\n';
  };

  cppGenerator.forBlock['websocket_message'] = function(_block) {
    cppGenerator._websocketUsed = true;
    cppGenerator._wifiUsed = true;
    return ['_wsMessage', cppGenerator.ORDER_ATOMIC];
  };

  cppGenerator.forBlock['websocket_connected'] = function(_block) {
    cppGenerator._websocketUsed = true;
    cppGenerator._wifiUsed = true;
    return ['_wsConnected', cppGenerator.ORDER_ATOMIC];
  };
}
