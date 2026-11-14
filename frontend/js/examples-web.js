/**
 * ArduBlock — Ejemplos: web y WebSocket
 *
 * El estado solo lleva los bloques. La página vive en `examples/web/luces.html`
 * y la sirve el panel de sitios web: el cargador la pide a `/api/web-presets`
 * y la escribe como tab antes de deserializar, así que el ejemplo llega con
 * todo lo necesario para compilar y subir.
 */

import _LucesWebSocket from '../../examples/blockly-states/ardublock-examples/web/LucesWebSocket.json';
import _SensorLlamaWebSocket from '../../examples/blockly-states/ardublock-examples/web/SensorLlamaWebSocket.json';

/**
 * Pide una página del panel de sitios web y la devuelve como tab.
 *
 * Así el `.html` vive en un solo archivo (`examples/web/`), que el panel lista,
 * previsualiza y analiza, y el ejemplo de ArduBlock lo escribe en el proyecto
 * sin copiarlo. Devuelve el arreglo que consume `restoreWorkspaceState`.
 */
export async function cargarTabRecursoHtml(archivo) {
  const respuesta = await fetch('/api/web-presets/' + encodeURIComponent(archivo));
  if (!respuesta.ok) throw new Error('No se pudo leer ' + archivo);
  const datos = await respuesta.json();
  if (!datos || typeof datos.content !== 'string') {
    throw new Error('La respuesta del preset no trae contenido');
  }
  return [{ filename: archivo, content: datos.content }];
}

export const webExamples = [
  {
    name: 'LucesWebSocket',
    source: 'ardublock-examples',
    category: 'web',
    description: {
      es: 'Controla tres salidas desde una página que sirve la placa; los botones viajan por WebSocket y el estado vuelve al navegador sin recargar',
      en: 'Controls three outputs from a page served by the board; the buttons travel over WebSocket and the state comes back to the browser without reloading'
    },
    comment: {
      es: '/*\n  LucesWebSocket\n\n  Enciende y apaga tres salidas del Arduino\n  desde una página que sirve la placa, y\n  devuelve el estado al navegador por\n  WebSocket.\n\n  setup()   crea la red "MiArduino" (clave\n            12345678), sirve luces.html en el\n            puerto 80, abre el WebSocket en el\n            81 y declara las salidas: luz1 en el\n            pin 4, luz2 en el 5 y el relé en el\n            7, activo en bajo.\n  mensaje   "luz1=1;rele=0" cambia el estado y\n            la respuesta lleva las tres salidas.\n\n  Conéctese a la red MiArduino y abra\n  http://192.168.4.1 desde el teléfono.\n  Atiende un navegador por vez.\n\n  ArduBlock — 2026\n*/',
      en: '/*\n  LucesWebSocket\n\n  Turns three Arduino outputs on and off from\n  a page the board serves, and sends the state\n  back to the browser over WebSocket.\n\n  setup()   starts the "MiArduino" network\n            (password 12345678), serves luces.html\n            on port 80, opens the WebSocket on\n            port 81 and declares the outputs: luz1\n            on pin 4, luz2 on pin 5 and the relay on\n            pin 7, active low.\n  message   "luz1=1;rele=0" changes the state and\n            the reply carries all three outputs.\n\n  Join the MiArduino network and open\n  http://192.168.4.1 from a phone. It serves\n  one browser at a time.\n\n  ArduBlock — 2026\n*/'
    },
    state: _LucesWebSocket,
    // Página del panel de sitios web: el cargador la escribe como tab.
    recursoHtml: 'luces.html',
    board: 'arduino:renesas_uno:unor4wifi',
  },
  {
    name: 'SensorLlamaWebSocket',
    source: 'ardublock-examples',
    category: 'web',
    description: {
      es: 'Lee la salida digital de un sensor de llama y la envía por WebSocket; la página servida por la placa muestra el estado en vivo, sin recargar',
      en: 'Reads the digital output of a flame sensor and sends it over WebSocket; the page served by the board shows the state live, without reloading'
    },
    comment: {
      es: '/*\n  SensorLlamaWebSocket\n\n  Lee la salida digital de un sensor de\n  llama y la envía por WebSocket a la\n  página que sirve la placa.\n\n  setup()   crea la red "MiArduino" (clave\n            12345678), sirve sensor-llama.html\n            en el puerto 80, abre el WebSocket\n            en ese mismo puerto y deja el pin 2\n            como entrada.\n  loop()    cada 250 ms envía llama=1 cuando\n            la salida está en LOW y llama=0\n            cuando está en HIGH.\n\n  Conéctese a la red MiArduino y abra\n  http://192.168.4.1 desde el teléfono.\n\n  ArduBlock — 2026\n*/',
      en: '/*\n  SensorLlamaWebSocket\n\n  Reads the digital output of a flame\n  sensor and sends it over WebSocket to the\n  page the board serves.\n\n  setup()   starts the "MiArduino" network\n            (password 12345678), serves\n            sensor-llama.html on port 80, opens\n            the WebSocket on that same port and\n            sets pin 2 as an input.\n  loop()    every 250 ms sends llama=1 when\n            the output is LOW and llama=0 when\n            it is HIGH.\n\n  Join the MiArduino network and open\n  http://192.168.4.1 from a phone.\n\n  ArduBlock — 2026\n*/'
    },
    state: _SensorLlamaWebSocket,
    recursoHtml: 'sensor-llama.html',
    board: 'arduino:renesas_uno:unor4wifi',
  },
];
