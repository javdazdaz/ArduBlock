/**
 * ArduBlock — Editor de animaciones para OLED SSD1315 (128x64, I2C)
 *
 * Dibuja sobre un canvas de 128x64 con rejilla por píxel lógico, arma una
 * línea de cuadros con duración y guarda la animación codificada con el mismo
 * formato que el sketch Bad_Apple_Flash. El bloque «OLED reproducir animación»
 * la toma del almacenamiento del navegador o de los tabs .h del proyecto.
 */

import { encodeCuadros, guardarPropia, animacionesPropias, partirEnTabs } from './oled-animations.js';
import { createHeaderTab } from './tab-manager.js';

const ANCHO = 128;
const ALTO = 64;
const ESCALA = 4;

let contenedor = null;
let canvas = null;
let ctx = null;
let tira = null;
let estado = null;

let cuadros = [];
let duraciones = [];
let sel = 0;
let pincel = 1;
let pintando = false;
let reproduciendo = null;

// ── Búfer ─────────────────────────────────────

function vacio() {
  return new Uint8Array(ANCHO * 8);
}

function punto(buf, x, y, on) {
  if (x < 0 || x >= ANCHO || y < 0 || y >= ALTO) return;
  const p = y >> 3;
  const bit = 1 << (y & 7);
  if (on) buf[p * ANCHO + x] |= bit;
  else buf[p * ANCHO + x] &= ~bit;
}

function leer(buf, x, y) {
  return (buf[(y >> 3) * ANCHO + x] >> (y & 7)) & 1;
}

// ── Dibujo ────────────────────────────────────

function pintarCanvas(buf) {
  if (!ctx) return;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, ANCHO * ESCALA, ALTO * ESCALA);
  ctx.fillStyle = '#8fd3ff';
  for (let y = 0; y < ALTO; y++) {
    for (let x = 0; x < ANCHO; x++) {
      if (leer(buf, x, y)) ctx.fillRect(x * ESCALA, y * ESCALA, ESCALA, ESCALA);
    }
  }
  // Rejilla cada 8 píxeles lógicos: marca los bloques que se codifican juntos.
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= ANCHO; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x * ESCALA + 0.5, 0);
    ctx.lineTo(x * ESCALA + 0.5, ALTO * ESCALA);
    ctx.stroke();
  }
  for (let y = 0; y <= ALTO; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y * ESCALA + 0.5);
    ctx.lineTo(ANCHO * ESCALA, y * ESCALA + 0.5);
    ctx.stroke();
  }
}

function pintarTira() {
  if (!tira) return;
  tira.innerHTML = '';
  cuadros.forEach((buf, i) => {
    const mini = document.createElement('canvas');
    mini.width = 64;
    mini.height = 32;
    const c = mini.getContext('2d');
    c.fillStyle = '#000';
    c.fillRect(0, 0, 64, 32);
    c.fillStyle = '#8fd3ff';
    for (let y = 0; y < ALTO; y++) {
      for (let x = 0; x < ANCHO; x++) {
        if (leer(buf, x, y)) c.fillRect((x * 64) / ANCHO, (y * 32) / ALTO, 0.5, 0.5);
      }
    }
    const marco = document.createElement('div');
    marco.className = 'oled-cuadro' + (i === sel ? ' activo' : '');
    marco.appendChild(mini);
    const pie = document.createElement('span');
    pie.textContent = (i + 1) + ' · ' + (duraciones[i] || 100) + ' ms';
    marco.appendChild(pie);
    marco.addEventListener('click', () => {
      sel = i;
      pintarCanvas(cuadros[sel]);
      pintarTira();
    });
    tira.appendChild(marco);
  });
}

function actualizar() {
  pintarCanvas(cuadros[sel] || vacio());
  pintarTira();
  if (estado) {
    estado.textContent = cuadros.length + ' cuadro(s) · ' +
      (duraciones.reduce((a, b) => a + b, 0) / 1000).toFixed(1) + ' s · cuadro ' +
      (sel + 1) + ' de ' + cuadros.length;
  }
}

// ── Edición ───────────────────────────────────

function pintarDesdeEvento(e) {
  const r = canvas.getBoundingClientRect();
  const x = Math.floor(((e.clientX - r.left) / r.width) * ANCHO);
  const y = Math.floor(((e.clientY - r.top) / r.height) * ALTO);
  const buf = cuadros[sel];
  if (!buf) return;
  const on = e.buttons !== 2;
  for (let dy = 0; dy < pincel; dy++) {
    for (let dx = 0; dx < pincel; dx++) punto(buf, x + dx, y + dy, on);
  }
  pintarCanvas(buf);
}

function nuevoCuadro() {
  const copia = sel >= 0 && cuadros[sel] ? Uint8Array.from(cuadros[sel]) : vacio();
  cuadros.splice(sel + 1, 0, copia);
  duraciones.splice(sel + 1, 0, duraciones[sel] || 100);
  sel += 1;
  actualizar();
}

function duplicarCuadro() {
  if (!cuadros.length) return;
  cuadros.splice(sel + 1, 0, Uint8Array.from(cuadros[sel]));
  duraciones.splice(sel + 1, 0, duraciones[sel] || 100);
  sel += 1;
  actualizar();
}

function borrarCuadro() {
  if (cuadros.length <= 1) return;
  cuadros.splice(sel, 1);
  duraciones.splice(sel, 1);
  sel = Math.max(0, sel - 1);
  actualizar();
}

function limpiarCuadro() {
  if (!cuadros[sel]) return;
  cuadros[sel] = vacio();
  actualizar();
}

function invertirCuadro() {
  const buf = cuadros[sel];
  if (!buf) return;
  for (let i = 0; i < buf.length; i++) buf[i] = ~buf[i];
  actualizar();
}

// ── Reproducción ──────────────────────────────

function reproducir() {
  parar();
  if (!cuadros.length) return;
  let i = 0;
  const paso = () => {
    pintarCanvas(cuadros[i]);
    const ms = duraciones[i] || 100;
    i = (i + 1) % cuadros.length;
    reproduciendo = setTimeout(paso, ms);
  };
  paso();
}

function parar() {
  if (reproduciendo) clearTimeout(reproduciendo);
  reproduciendo = null;
  if (cuadros[sel]) pintarCanvas(cuadros[sel]);
}

// ── Guardar y cargar ──────────────────────────

function guardar() {
  const nombreInput = contenedor.querySelector('#oled-anim-nombre');
  const nombre = (nombreInput.value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '');
  if (!nombre) {
    estado.textContent = 'Escriba un nombre para guardar la animación.';
    return;
  }
  if (!cuadros.length) return;
  const bytes = encodeCuadros(cuadros);
  const fps = Math.max(1, Math.round(1000 / (duraciones[0] || 100)));
  // btoa con spread revienta sobre 65k argumentos: se trocea por bloques.
  let binario = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binario += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  }
  const b64 = btoa(binario);
  guardarPropia(nombre, { fps, cuadros: cuadros.length, b64 });
  estado.textContent = 'Guardada «' + nombre + '»: ' + bytes.length +
    ' bytes. Aparece en el bloque OLED reproducir animación.';
}

async function cargarBadApple() {
  estado.textContent = 'Cargando el recurso…';
  try {
    const mod = await import('./oled-anim-badapple.js');
    const bytes = mod.badappleBytes();
    const partes = partirEnTabs(bytes, 'oled_anim_badapple', 'Bad Apple!!');
    const nombres = partes.map(p => createHeaderTab(p.tab, p.texto));
    estado.textContent = 'Bad Apple!!: ' + mod.BADAPPLE_CUADROS + ' cuadros, ' +
      bytes.length + ' bytes en ' + nombres.length + ' tab(s) (' +
      partes.map(p => Math.round(p.texto.length / 1024) + ' KB').join(' + ') +
      '). El bloque ya lo lista; el tab agrega el #include.';
  } catch (e) {
    estado.textContent = 'No se pudo cargar Bad Apple!!: ' + e.message;
  }
}

function mostrarPropias() {
  const propias = animacionesPropias();
  const nombres = Object.keys(propias);
  const lista = contenedor.querySelector('#oled-propias');
  if (!lista) return;
  lista.innerHTML = nombres.length
    ? 'Guardadas: ' + nombres.map(n => '«' + n + '» (' + (propias[n].cuadros || '?') + ')').join(', ')
    : 'Todavía no hay animaciones guardadas.';
}

// ── Montaje ───────────────────────────────────

function montar() {
  contenedor.dataset.montado = '1';
  contenedor.innerHTML = `
    <div class="oled-toolbar">
      <button class="matrix-btn" data-acc="nuevo">+ Cuadro</button>
      <button class="matrix-btn" data-acc="duplicar">Duplicar</button>
      <button class="matrix-btn" data-acc="borrar">Borrar cuadro</button>
      <button class="matrix-btn" data-acc="limpiar">Limpiar</button>
      <button class="matrix-btn" data-acc="invertir">Invertir</button>
      <label class="oled-lapiz">Pincel
        <input type="range" id="oled-pincel" min="1" max="8" value="1">
      </label>
      <label class="oled-dur">ms por cuadro
        <input type="number" id="oled-dur" min="10" max="5000" value="100">
      </label>
      <button class="matrix-btn" data-acc="play">▶ Reproducir</button>
      <button class="matrix-btn" data-acc="parar">⏹ Parar</button>
    </div>
    <div class="oled-lienzo">
      <canvas id="oled-canvas" width="${ANCHO * ESCALA}" height="${ALTO * ESCALA}"></canvas>
    </div>
    <div class="oled-tira" id="oled-tira"></div>
    <div class="oled-acciones">
      <input type="text" id="oled-anim-nombre" placeholder="nombre de la animación" maxlength="24">
      <button class="matrix-btn matrix-btn-save" data-acc="guardar">Guardar animación</button>
      <button class="matrix-btn" data-acc="badapple">Cargar Bad Apple!!</button>
    </div>
    <div class="oled-estado" id="oled-estado"></div>
    <div class="oled-propias" id="oled-propias"></div>
  `;

  canvas = contenedor.querySelector('#oled-canvas');
  ctx = canvas.getContext('2d');
  tira = contenedor.querySelector('#oled-tira');
  estado = contenedor.querySelector('#oled-estado');

  canvas.addEventListener('mousedown', e => { e.preventDefault(); pintando = true; pintarDesdeEvento(e); });
  canvas.addEventListener('mousemove', e => { if (pintando) pintarDesdeEvento(e); });
  canvas.addEventListener('mouseup', () => { pintando = false; });
  canvas.addEventListener('mouseleave', () => { pintando = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  contenedor.querySelector('#oled-pincel').addEventListener('input', e => {
    pincel = Number(e.target.value) || 1;
  });
  contenedor.querySelector('#oled-dur').addEventListener('change', e => {
    const ms = Math.max(10, Number(e.target.value) || 100);
    if (cuadros[sel] !== undefined) duraciones[sel] = ms;
    actualizar();
  });

  contenedor.querySelectorAll('[data-acc]').forEach(btn => {
    btn.addEventListener('click', () => {
      const acc = btn.dataset.acc;
      if (acc === 'nuevo') nuevoCuadro();
      else if (acc === 'duplicar') duplicarCuadro();
      else if (acc === 'borrar') borrarCuadro();
      else if (acc === 'limpiar') limpiarCuadro();
      else if (acc === 'invertir') invertirCuadro();
      else if (acc === 'play') reproducir();
      else if (acc === 'parar') parar();
      else if (acc === 'guardar') guardar();
      else if (acc === 'badapple') cargarBadApple();
    });
  });
}

/** Muestra el editor OLED dentro del panel de animaciones. */
export function mostrarEditorOled() {
  if (!contenedor) contenedor = document.getElementById('oled-editor');
  if (!contenedor) return false;
  if (!contenedor.dataset.montado) montar();
  if (!cuadros.length) {
    cuadros = [vacio()];
    duraciones = [100];
    sel = 0;
  }
  mostrarPropias();
  actualizar();
  return true;
}

/** Oculta el editor (al volver a otro modo del panel). */
export function ocultarEditorOled() {
  parar();
}

/** Inicializa el contenedor sin mostrarlo. */
export function initOledEditor() {
  contenedor = document.getElementById('oled-editor');
  if (!contenedor) return;
  if (!contenedor.dataset.montado) montar();
  cuadros = [vacio()];
  duraciones = [100];
  sel = 0;
  actualizar();
  mostrarPropias();
}
