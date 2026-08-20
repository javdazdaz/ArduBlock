/**
 * ArduBlock — "Proyectos esperados" de los sitios web avanzados.
 *
 * Cada preset avanzado trae un proyecto completo: los bloques Blockly
 * pre-armados que hacen funcionar la demo. Se construyen como JSON de
 * serialización de Blockly (mantenible, sin escribir JSON a mano).
 *
 * La clave del mapa es la ruta del preset (ej. 'websocket.html').
 */

let _bid = 0;
const nid = () => 'wp' + (++_bid);

function blk(type, fields = {}, x, y) {
  const b = { type, id: nid() };
  if (fields && Object.keys(fields).length) b.fields = fields;
  if (x != null) { b.x = x; b.y = y; }
  return b;
}

function stmt(parent, input, child) {
  parent.inputs = parent.inputs || {};
  parent.inputs[input] = { block: child };
  return parent;
}

function val(parent, input, child) {
  parent.inputs = parent.inputs || {};
  parent.inputs[input] = { block: child };
  return parent;
}

function next(prev, following) {
  prev.next = { block: following };
  return prev;
}

function chain(...blocks) {
  for (let i = 0; i < blocks.length - 1; i++) next(blocks[i], blocks[i + 1]);
  return blocks[0];
}

function state(...topBlocks) {
  return { blocks: { languageVersion: 0, blocks: topBlocks } };
}

// ── Presets ─────────────────────────────────────

function buildPanelControl(htmlFile) {
  const setup = blk('arduino_setup', {}, 20, 20);
  stmt(setup, 'BODY', chain(
    blk('pin_mode_basic', { PIN: '13', MODE: 'OUTPUT' }),
    blk('wifi_access_point', { SSID: 'MiArduino', PASS: '12345678' }),
    blk('webserver_begin', { PORT: 80 })
  ));

  const loop = blk('arduino_loop', {}, 20, 240);
  stmt(loop, 'BODY', blk('webserver_serve_file', { FILE: htmlFile }));

  const on = blk('webserver_on', { PATH: '/led/on' }, 460, 20);
  stmt(on, 'DO', blk('digital_write_basic', { PIN: '13', VALUE: 'HIGH' }));

  const off = blk('webserver_on', { PATH: '/led/off' }, 460, 130);
  stmt(off, 'DO', blk('digital_write_basic', { PIN: '13', VALUE: 'LOW' }));

  const blink = blk('webserver_on', { PATH: '/blink' }, 460, 240);
  const rep = blk('controls_repeat_ext');
  val(rep, 'TIMES', blk('math_number', { NUM: 5 }));
  stmt(rep, 'DO', chain(
    blk('digital_write_basic', { PIN: '13', VALUE: 'HIGH' }),
    blk('delay_ms_basic', { MS: '250' }),
    blk('digital_write_basic', { PIN: '13', VALUE: 'LOW' }),
    blk('delay_ms_basic', { MS: '250' })
  ));
  stmt(blink, 'DO', rep);

  return state(setup, loop, on, off, blink);
}

function buildTablero(htmlFile) {
  const setup = blk('arduino_setup', {}, 20, 20);
  stmt(setup, 'BODY', chain(
    blk('wifi_access_point', { SSID: 'MiArduino', PASS: '12345678' }),
    blk('webserver_begin', { PORT: 80 })
  ));

  const loop = blk('arduino_loop', {}, 20, 220);
  stmt(loop, 'BODY', blk('webserver_serve_file', { FILE: htmlFile }));

  const temp = blk('webserver_on', { PATH: '/temp' }, 460, 20);
  const tempResp = blk('webserver_respond', { CTYPE: 'text/plain' });
  val(tempResp, 'VALUE', blk('analog_read_basic', { PIN: '0' }));
  stmt(temp, 'DO', tempResp);

  const luz = blk('webserver_on', { PATH: '/luz' }, 460, 130);
  const luzResp = blk('webserver_respond', { CTYPE: 'text/plain' });
  val(luzResp, 'VALUE', blk('analog_read_basic', { PIN: '1' }));
  stmt(luz, 'DO', luzResp);

  const rssi = blk('webserver_on', { PATH: '/rssi' }, 460, 240);
  const rssiResp = blk('webserver_respond', { CTYPE: 'text/plain' });
  val(rssiResp, 'VALUE', blk('wifi_rssi'));
  stmt(rssi, 'DO', rssiResp);

  return state(setup, loop, temp, luz, rssi);
}

function buildRest(htmlFile) {
  const setup = blk('arduino_setup', {}, 20, 20);
  stmt(setup, 'BODY', chain(
    blk('wifi_access_point', { SSID: 'MiArduino', PASS: '12345678' }),
    blk('webserver_begin', { PORT: 80 }),
    blk('servo_create', { NAME: 'servo', PIN: 9 })
  ));

  const loop = blk('arduino_loop', {}, 20, 240);
  stmt(loop, 'BODY', blk('webserver_serve_file', { FILE: htmlFile }));

  const servo = blk('webserver_on', { PATH: '/servo' }, 460, 20);
  const servoWrite = blk('servo_write_advanced', { NAME: 'servo' });
  const angle = blk('text_to_number');
  val(angle, 'VALUE', blk('webserver_query', { NAME: 'angulo' }));
  val(servoWrite, 'ANGLE', angle);
  stmt(servo, 'DO', servoWrite);

  const led = blk('webserver_on', { PATH: '/led' }, 460, 140);
  const ledResp = blk('webserver_respond', { CTYPE: 'application/json' });
  val(ledResp, 'VALUE', blk('webserver_body'));
  stmt(led, 'DO', ledResp);

  return state(setup, loop, servo, led);
}

function buildWebSocket(htmlFile) {
  const setup = blk('arduino_setup', {}, 20, 20);
  stmt(setup, 'BODY', chain(
    blk('wifi_access_point', { SSID: 'MiArduino', PASS: '12345678' }),
    blk('webserver_begin', { PORT: 80 }),
    blk('websocket_begin', { PORT: 81 })
  ));

  const loop = blk('arduino_loop', {}, 20, 260);
  stmt(loop, 'BODY', blk('webserver_serve_file', { FILE: htmlFile }));

  const onMsg = blk('websocket_on_message', {}, 460, 20);

  const ifOn = blk('controls_if');
  const cmpOn = blk('logic_compare', { OP: 'EQ' });
  val(cmpOn, 'A', blk('websocket_message'));
  val(cmpOn, 'B', blk('text', { TEXT: 'on' }));
  val(ifOn, 'IF0', cmpOn);
  stmt(ifOn, 'DO0', blk('digital_write_basic', { PIN: '13', VALUE: 'HIGH' }));

  const ifOff = blk('controls_if');
  const cmpOff = blk('logic_compare', { OP: 'EQ' });
  val(cmpOff, 'A', blk('websocket_message'));
  val(cmpOff, 'B', blk('text', { TEXT: 'off' }));
  val(ifOff, 'IF0', cmpOff);
  stmt(ifOff, 'DO0', blk('digital_write_basic', { PIN: '13', VALUE: 'LOW' }));

  const echo = blk('websocket_send');
  val(echo, 'VALUE', blk('websocket_message'));

  stmt(onMsg, 'DO', chain(ifOn, ifOff, echo));

  return state(setup, loop, onMsg);
}

export const webPresetProjects = {
  'panel-control.html': buildPanelControl,
  'tablero.html': buildTablero,
  'rest.html': buildRest,
  'websocket.html': buildWebSocket,
};

export function hasWebPresetProject(path) {
  return Object.prototype.hasOwnProperty.call(webPresetProjects, path);
}
