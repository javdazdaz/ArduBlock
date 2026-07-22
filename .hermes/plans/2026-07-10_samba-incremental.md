# SAM-BA Web Serial — Plan incremental desde cero

> **Para Hermes:** Usar subagent-driven-development para implementar tarea por tarea.

**Goal:** Determinar si es posible flashear la UNO R4 WiFi vía SAM-BA por Web Serial, partiendo de verificación mínima y avanzando incrementalmente.

**Architecture:** HTML standalone → comandos básicos → flasheo completo → integración ArduBlock. Cada fase valida un supuesto; si una fase falla, paramos y diagnosticamos antes de seguir.

**Tech Stack:** Web Serial API, JavaScript vanilla, bossac (referencia nativa), Python+pyserial (diagnóstico auxiliar).

**Supuesto a verificar:** `port.open({baudRate: 230400})` mata la conexión SAM-BA (SET_LINE_CODING). Si es así, explorar workarounds. Si no, el flasheo debería funcionar.

---

## Fase 0: Diagnóstico de línea base con Python

Antes de tocar el navegador, verificar que el bootloader responde desde esta máquina.

### Task 0.1: Script Python mínimo de diagnóstico

**Objective:** Confirmar que `/dev/ttyACM0` (modo bootloader, doble-reset) responde a comandos SAM-BA.

**Files:**
- Create: `~/Projects/ardublock/debug/samba-baseline.py`

**Paso 1:** Crear script que:
- Abre `/dev/ttyACM0` a 230400 baud, timeout 1s
- Espera input del usuario ("Hacé doble-reset y presioná Enter")
- Envía `N#`, lee respuesta
- Envía `V#`, lee respuesta
- Envía `I#`, lee respuesta
- Muestra todo en hex y ASCII

**Paso 2:** Ejecutar con R4 WiFi en modo bootloader (LED pulsando)

**Paso 3:** Si responde → fase 1. Si no → diagnosticar:
- ¿El puerto correcto? `ls -la /dev/ttyACM*`
- ¿Bootloader activo? Verificar LED
- ¿Permisos? `ls -la /dev/ttyACM0`

---

## Fase 1: HTML standalone — ¿Web Serial puede hablar SAM-BA?

### Task 1.1: Página HTML mínima de prueba

**Objective:** Página standalone que abre puerto Web Serial, envía N#/V#/I# y muestra respuestas.

**Files:**
- Create: `~/Projects/ardublock/debug/samba-webserial-test.html`

**Requisitos:**
- Un botón "Conectar" → `navigator.serial.requestPort()` → `port.open({baudRate: 230400})`
- Campo de texto + botón "Enviar" para comandos manuales
- Área de log que muestra bytes enviados/recibidos en hex y ASCII
- Sin dependencias externas, un solo archivo HTML+JS

**Paso 1:** Escribir el HTML

**Paso 2:** Abrir en Firefox 151 (`file:///home/mortem/Projects/ardublock/debug/samba-webserial-test.html`)

**Paso 3:** Hacer doble-reset en la R4 WiFi, presionar "Conectar", seleccionar puerto

**Paso 4:** Enviar `N#` manualmente, observar respuesta

**Criterio de éxito:** Respuesta `0x0a 0x0d` (2 bytes) de `N#`
**Criterio de fracaso:** Timeout, sin respuesta, o `port.open()` lanza error

### Task 1.2: Si Fase 1 falla — investigar SET_LINE_CODING

**Si `port.open()` no tira error pero no hay respuesta:**
- Agregar log de eventos del puerto
- Probar abrir sin baudRate explícito (si la API lo permite)
- Probar `port.open({baudRate: 1200})` primero, luego cerrar, luego `port.open({baudRate: 230400})` (emulando el touch de bossac)

**Si `port.open()` tira error:**
- Verificar permisos del dispositivo en el navegador (chrome://device-log o about:device-log)
- Probar en Chromium como control

### Task 1.3: Si Fase 1 funciona — probar secuencia completa de comandos

**Agregar al HTML:**
- Botón "Init" (N# → V# → I# secuencial)
- Botón "Flash 4KB" (Y<buffer>,4096# + datos dummy + Y<flash>,00001000#)
- Botón "Reset" (Z#)

---

## Fase 2: Flasheo real con .bin de prueba

### Task 2.1: Compilar Blink para R4 WiFi

**Objective:** Obtener un .bin mínimo para probar flasheo.

**Comando:**
```bash
arduino-cli compile --fqbn arduino:renesas_uno:unor4wifi --output-dir /tmp/r4test /tmp/blink_test/
```

Donde `/tmp/blink_test/blink_test.ino` es un Blink estándar.

### Task 2.2: Extender HTML standalone con flasheo completo

**Agregar:**
- Input file para cargar .bin
- Botón "Flash completo" que ejecuta la secuencia completa:
  1. Init (N#/V#/I#)
  2. X00000000# (borrar flash app)
  3. Por cada página de 4096 bytes: Y subir + Y flashear
  4. Z# (reset)
- Barra de progreso
- Timeouts y reintentos para páginas que fallen

### Task 2.3: Verificar que el sketch flasheado funciona

- LED L debe parpadear (Blink estándar)
- Si no funciona, verificar offset de flash (0x00004000 vs 0x00000000)

---

## Fase 3: Integración a ArduBlock

Solo si Fase 2 funciona.

### Task 3.1: Sincronizar SAMBAFlasher con lo validado

- Actualizar `samba-flasher-vA.js` con los hallazgos de las fases anteriores
- Si la vA no funcionó pero la vB sí, cambiar el import en `upload.js`
- Si ninguna funcionó pero el HTML standalone sí, identificar diferencias

### Task 3.2: Test end-to-end en ArduBlock

- Cargar ArduBlock en Firefox
- Crear sketch Blink con bloques
- Subir vía Web Serial (PATH B2)
- Verificar que el LED parpadea

---

## Riesgos y preguntas abiertas

1. **SET_LINE_CODING:** Si `port.open()` efectivamente rompe la conexión, no hay workaround en la Web Serial API actual. Posibles vías:
   - Feature request a Chrome/Firefox para `port.open({setLineCoding: false})`
   - Proxy local (WebSocket ↔ serial nativo) como alternativa al VPS puro
   - Aceptar que R4 WiFi requiere PATH A (arduino-cli local)

2. **Doble-reset manual:** Requiere coordinación usuario-agente. No automatizable desde browser.

3. **Timing del bootloader:** ~5 segundos de ventana. Si la compilación tarda más, el bootloader expira.

4. **Direcciones de flash:** 0x00000000 (vA, applet) vs 0x00004000 (vB, nativo). Depende del bootloader instalado.
