# Selector de Placa Dinámico — Plan de Implementación

> **Para Hermes:** Usar subagent-driven-development para implementar tarea por tarea.

**Goal:** Agregar un selector de placa en la `arduino-toolbar` que configure dinámicamente toolbox, rangos de pines, y dispare `arduino-cli core/lib install` según la placa elegida.

**Architecture:** Módulo nuevo `board.js` con la configuración centralizada de las 5 placas. El selector se inserta en `arduino-toolbar` (HTML). Al cambiar placa: (1) se persiste en localStorage, (2) se actualiza el toolbox vía callback que filtra bloques por placa, (3) se notifica al backend vía POST `/api/board/install` para instalar cores/libs con `arduino-cli`. Los bloques de pines no cambian su `min`/`max` en runtime (Blockly no lo soporta nativamente), en su lugar se usa un dropdown dinámico de pines válidos para la placa.

**Tech Stack:** Vanilla JS (frontend), Python Flask (backend), arduino-cli, Blockly v12.

---

## Configuración de Placas

```js
// frontend/js/board.js — Configuración centralizada
const BOARDS = {
  'arduino:avr:uno': {
    name: 'Arduino Uno R3',
    digitalPins: [0,1,2,3,4,5,6,7,8,9,10,11,12,13],
    analogPins:  [0,1,2,3,4,5],   // A0-A5
    pwmPins:     [3,5,6,9,10,11],
    cores: [],                      // ya instalado por defecto
    libs:  [],
    fqbn: 'arduino:avr:uno'
  },
  'arduino:renesas_uno:minima': {
    name: 'Arduino Uno R4 Minima',
    digitalPins: [0,1,2,3,4,5,6,7,8,9,10,11,12,13],
    analogPins:  [0,1,2,3,4,5],
    pwmPins:     [3,5,6,9,10,11],
    cores: ['arduino:renesas_uno'],
    libs:  [],
    fqbn: 'arduino:renesas_uno:minima'
  },
  'arduino:renesas_uno:wifi': {
    name: 'Arduino Uno R4 WiFi',
    digitalPins: [0,1,2,3,4,5,6,7,8,9,10,11,12,13],
    analogPins:  [0,1,2,3,4,5],
    pwmPins:     [3,5,6,9,10,11],
    cores: ['arduino:renesas_uno'],
    libs:  ['WiFiS3'],
    fqbn: 'arduino:renesas_uno:wifi'
  },
  'arduino:esp32:nano_nora': {
    name: 'Arduino Nano ESP32',
    digitalPins: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21],
    analogPins:  [0,1,2,3,4,5,6,7],
    pwmPins:     [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21],
    cores: ['arduino:esp32'],
    libs:  [],
    fqbn: 'arduino:esp32:nano_nora'
  },
  'arduino:avr:mega': {
    name: 'Arduino Mega 2560',
    digitalPins: Array.from({length:54}, (_,i)=>i),  // 0-53
    analogPins:  Array.from({length:16}, (_,i)=>i),  // A0-A15
    pwmPins:     [2,3,4,5,6,7,8,9,10,11,12,13,44,45,46],
    cores: [],
    libs:  [],
    fqbn: 'arduino:avr:mega'
  }
};
```

---

### Task 1: Crear `board.js` con configuración de placas + API de consulta

**Objective:** Centralizar datos de las 5 placas y exponer funciones de consulta.

**Files:**
- Create: `frontend/js/board.js`

**Step 1: Crear el archivo**

```js
// frontend/js/board.js
/**
 * ArduBlock — Configuración de Placas Arduino
 *
 * Centraliza FQBNs, pines disponibles, cores/libs necesarias.
 * Expone getBoardConfig(), getBoardList(), getBoardByFqbn().
 */

const BOARDS = {
  'arduino:avr:uno': {
    name: 'Arduino Uno R3',
    digitalPins: [0,1,2,3,4,5,6,7,8,9,10,11,12,13],
    analogPins:  [0,1,2,3,4,5],
    pwmPins:     [3,5,6,9,10,11],
    cores: [],
    libs:  []
  },
  'arduino:renesas_uno:minima': {
    name: 'Arduino Uno R4 Minima',
    digitalPins: [0,1,2,3,4,5,6,7,8,9,10,11,12,13],
    analogPins:  [0,1,2,3,4,5],
    pwmPins:     [3,5,6,9,10,11],
    cores: ['arduino:renesas_uno'],
    libs:  []
  },
  'arduino:renesas_uno:wifi': {
    name: 'Arduino Uno R4 WiFi',
    digitalPins: [0,1,2,3,4,5,6,7,8,9,10,11,12,13],
    analogPins:  [0,1,2,3,4,5],
    pwmPins:     [3,5,6,9,10,11],
    cores: ['arduino:renesas_uno'],
    libs:  ['WiFiS3']
  },
  'arduino:esp32:nano_nora': {
    name: 'Arduino Nano ESP32',
    digitalPins: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21],
    analogPins:  [0,1,2,3,4,5,6,7],
    pwmPins:     [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21],
    cores: ['arduino:esp32'],
    libs:  []
  },
  'arduino:avr:mega': {
    name: 'Arduino Mega 2560',
    digitalPins: Array.from({length: 54}, (_, i) => i),
    analogPins:  Array.from({length: 16}, (_, i) => i),
    pwmPins:     [2,3,4,5,6,7,8,9,10,11,12,13,44,45,46],
    cores: [],
    libs:  []
  }
};

export function getBoardConfig(fqbn) {
  return BOARDS[fqbn] || BOARDS['arduino:avr:uno'];
}

export function getBoardList() {
  return Object.entries(BOARDS).map(([fqbn, cfg]) => ({
    fqbn,
    name: cfg.name,
    digitalPins: cfg.digitalPins.length,
    analogPins: cfg.analogPins.length
  }));
}

export function getBoardByFqbn(fqbn) {
  return getBoardConfig(fqbn);
}

export function getDefaultFqbn() {
  return 'arduino:avr:uno';
}
```

**Step 2: Verificar sintaxis**

`node --check frontend/js/board.js`

---

### Task 2: Agregar selector de placa en `arduino-toolbar` (HTML)

**Objective:** Insertar el `<select>` de placa en la toolbar del panel de código.

**Files:**
- Modify: `frontend/index.html:48-51`

**Step 1: Reemplazar el contenido de `arduino-toolbar`**

Buscar en `index.html`:
```html
      <div class="arduino-toolbar">
        <button id="btn-console-toggle" ...>🔌 Consola</button>
        <button id="btn-upload" ...>⚡ Subir</button>
      </div>
```

Reemplazar con:
```html
      <div class="arduino-toolbar">
        <select id="board-selector" class="arduino-select" title="Seleccionar placa Arduino">
          <option value="arduino:avr:uno">Arduino Uno R3</option>
          <option value="arduino:renesas_uno:minima">Arduino Uno R4 Minima</option>
          <option value="arduino:renesas_uno:wifi">Arduino Uno R4 WiFi</option>
          <option value="arduino:esp32:nano_nora">Arduino Nano ESP32</option>
          <option value="arduino:avr:mega">Arduino Mega</option>
        </select>
        <button id="btn-console-toggle" class="arduino-btn console" data-i18n="btn_console" title="Abrir/cerrar monitor serial">🔌 Consola</button>
        <button id="btn-upload" class="arduino-btn upload" data-i18n="btn_upload" title="Compilar y subir al Arduino">⚡ Subir</button>
      </div>
```

---

### Task 3: CSS para el selector en `arduino-toolbar`

**Objective:** Estilizar el `<select>` para que se integre con la toolbar oscura.

**Files:**
- Modify: `frontend/css/style.css`

**Step 1: Agregar regla CSS al final del archivo**

```css
/* Selector de placa en toolbar */
.arduino-toolbar .arduino-select {
  background: var(--bg-input, #2a2a3e);
  color: var(--text, #e0e0e0);
  border: 1px solid var(--border, #2a2a4a);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: inherit;
  cursor: pointer;
  margin-right: 8px;
}
.arduino-toolbar .arduino-select:focus {
  outline: 1px solid var(--btn-secondary-bg, #00b4d8);
}
```

---

### Task 4: Sincronizar selector con settings (main.js + settings.js)

**Objective:** Al cargar la página, el selector refleje la placa guardada. Al cambiar, persista en settings. Además, sincronizar con el settings modal existente (`setting-board`).

**Files:**
- Modify: `frontend/js/settings.js`
- Modify: `frontend/js/main.js`

**Step 1: En `settings.js`, exportar función para sincronizar ambos selectores**

Agregar al final de `settings.js` antes del último `}`:
```js
export function syncBoardSelectors(fqbn) {
  const toolbarSel = document.getElementById('board-selector');
  const settingsSel = document.getElementById('setting-board');
  if (toolbarSel) toolbarSel.value = fqbn;
  if (settingsSel) settingsSel.value = fqbn;
}
```

Modificar `onSettingChange` para que cuando cambie `board`, también llame a `syncBoardSelectors`:
```js
function onSettingChange(key, value, applyFn) {
  const s = loadSettings(); s[key] = value; saveSettings(s);
  if (applyFn) applyFn(value);
  if (key === 'board') syncBoardSelectors(value);
}
```

**Step 2: En `main.js`, agregar listener al selector de toolbar**

Después de `initSettings(...)`:
```js
// Selector de placa en toolbar
const boardSelector = document.getElementById('board-selector');
if (boardSelector) {
  const currentBoard = getSetting('board');
  boardSelector.value = currentBoard;

  boardSelector.addEventListener('change', () => {
    const fqbn = boardSelector.value;
    const s = loadSettings();
    s.board = fqbn;
    saveSettings(s);

    // Sincronizar settings modal
    const settingsBoard = document.getElementById('setting-board');
    if (settingsBoard) settingsBoard.value = fqbn;

    // Disparar instalación de cores/libs
    fetch('/api/board/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fqbn })
    }).catch(e => console.warn('[ArduBlock] board/install:', e));

    // Reconstruir toolbox (se hará en Task 5)
    if (window._rebuildToolbox) window._rebuildToolbox(fqbn);
  });
}
```

Esto requiere importar `getSetting`, `loadSettings`, `saveSettings` de settings.js en main.js (ya están importados indirectamente, verificar).

---

### Task 5: Toolbox dinámico — filtrar bloques por placa

**Objective:** Reconstruir el toolbox cuando cambia la placa. Mega desbloquea más pines; ESP32 añade WiFi; placas sin ciertas capacidades ocultan bloques.

**Files:**
- Modify: `frontend/js/main.js`
- Modify: `frontend/js/blocks.js`

**Step 1: En `blocks.js`, exportar función que devuelva toolbox según placa**

Agregar al final de `blocks.js` (antes del dummy export):
```js
import { getBoardConfig } from './board.js';

export function buildToolboxForBoard(fqbn) {
  const board = getBoardConfig(fqbn);

  // Los pines digitales son un dropdown con los pines disponibles
  const pinOptions = board.digitalPins.map(p => [String(p), String(p)]);

  // Actualizar max en field_number no es posible en runtime con defineBlocksWithJsonArray.
  // En su lugar, usamos el dropdown de pines que ya está limitado a los disponibles.
  // Para field_number con max fijo, no hay cambios necesarios a nivel toolbox.

  const toolbox = {
    'kind': 'categoryToolbox',
    'contents': [
      { 'kind': 'category', 'name': '%{BKY_CAT_ARDUINO}', 'colour': '230',
        'contents': [
          { 'kind': 'block', 'type': 'arduino_setup' },
          { 'kind': 'block', 'type': 'arduino_loop' },
          { 'kind': 'block', 'type': 'include_header' }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_PINES}', 'colour': '190',
        'contents': [
          { 'kind': 'block', 'type': 'pin_mode' },
          { 'kind': 'block', 'type': 'digital_write' },
          { 'kind': 'block', 'type': 'digital_read' },
          { 'kind': 'block', 'type': 'analog_write' },
          { 'kind': 'block', 'type': 'analog_read' },
          { 'kind': 'block', 'type': 'pulse_in' },
          { 'kind': 'block', 'type': 'attach_interrupt' }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_TIEMPO}', 'colour': '290',
        'contents': [
          { 'kind': 'block', 'type': 'delay_ms' },
          { 'kind': 'block', 'type': 'millis' }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_SONIDO}', 'colour': '260',
        'contents': [
          { 'kind': 'block', 'type': 'tone_output' },
          { 'kind': 'block', 'type': 'tone_duration' },
          { 'kind': 'block', 'type': 'no_tone_output' }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_LCD}', 'colour': '180',
        'contents': [
          { 'kind': 'block', 'type': 'lcd_create' },
          { 'kind': 'block', 'type': 'lcd_i2c_create' },
          { 'kind': 'block', 'type': 'lcd_print' },
          { 'kind': 'block', 'type': 'lcd_set_cursor' },
          { 'kind': 'block', 'type': 'lcd_clear' }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_SENSORES}', 'colour': '100',
        'contents': [
          { 'kind': 'block', 'type': 'dht_create' },
          { 'kind': 'block', 'type': 'dht_temp' },
          { 'kind': 'block', 'type': 'dht_humidity' },
          { 'kind': 'block', 'type': 'ultrasonic_create' },
          { 'kind': 'block', 'type': 'ultrasonic_read' }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_MOTOR}', 'colour': '310',
        'contents': [
          { 'kind': 'block', 'type': 'stepper_create' },
          { 'kind': 'block', 'type': 'stepper_speed' },
          { 'kind': 'block', 'type': 'stepper_step' }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_SERVO}', 'colour': '40',
        'contents': [
          { 'kind': 'block', 'type': 'servo_create' },
          { 'kind': 'block', 'type': 'servo_write' },
          { 'kind': 'block', 'type': 'servo_write_us' }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_SERIAL}', 'colour': '120',
        'contents': [
          { 'kind': 'block', 'type': 'serial_begin' },
          { 'kind': 'block', 'type': 'serial_print' },
          { 'kind': 'block', 'type': 'serial_println' },
          { 'kind': 'block', 'type': 'serial_available' },
          { 'kind': 'block', 'type': 'serial_read' },
          { 'kind': 'block', 'type': 'serial_parse_int' },
          { 'kind': 'block', 'type': 'serial_parse_float' },
          { 'kind': 'block', 'type': 'serial_read_string' },
          { 'kind': 'block', 'type': 'serial_write' }
        ]},
      { 'kind': 'sep' },
      { 'kind': 'category', 'name': '%{BKY_CAT_LOGICA}', 'colour': '210',
        'contents': [
          { 'kind': 'block', 'type': 'controls_if' },
          { 'kind': 'block', 'type': 'logic_compare' },
          { 'kind': 'block', 'type': 'logic_operation' },
          { 'kind': 'block', 'type': 'logic_negate' },
          { 'kind': 'block', 'type': 'logic_boolean' }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_BUCLES}', 'colour': '120',
        'contents': [
          { 'kind': 'block', 'type': 'controls_repeat_ext' },
          { 'kind': 'block', 'type': 'controls_whileUntil' },
          { 'kind': 'block', 'type': 'arduino_for_index' }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_MATEMATICAS}', 'colour': '230',
        'contents': [
          { 'kind': 'block', 'type': 'math_number' },
          { 'kind': 'block', 'type': 'math_arithmetic' },
          { 'kind': 'block', 'type': 'math_single' },
          { 'kind': 'block', 'type': 'math_modulo' },
          { 'kind': 'block', 'type': 'math_random_int' },
          { 'kind': 'block', 'type': 'math_constrain' },
          { 'kind': 'block', 'type': 'map_value' },
          { 'kind': 'block', 'type': 'math_number_property' }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_VARIABLES}', 'colour': '330',
        'contents': [
          { 'kind': 'block', 'type': 'variable_declare' },
          { 'kind': 'block', 'type': 'variable_set' },
          { 'kind': 'block', 'type': 'variable_get' }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_ARRAYS}', 'colour': '330',
        'contents': [
          { 'kind': 'block', 'type': 'array_declare' },
          { 'kind': 'block', 'type': 'array_get' },
          { 'kind': 'block', 'type': 'array_set' },
          { 'kind': 'block', 'type': 'array_length' }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_FUNCTIONS}', 'colour': '290', 'custom': 'PROCEDURE' },
      { 'kind': 'category', 'name': '%{BKY_CAT_TEXTO}', 'colour': '160',
        'contents': [
          { 'kind': 'block', 'type': 'text' },
          { 'kind': 'block', 'type': 'text_join' },
          { 'kind': 'block', 'type': 'text_print' },
          { 'kind': 'block', 'type': 'text_length' }
        ]},
      { 'kind': 'search', 'name': '%{BKY_CAT_BUSCAR}', 'contents': [] }
    ]
  };

  return toolbox;
}
```

**Step 2: En `main.js`, reemplazar el toolbox estático por uno inicializado con la placa actual**

Cambiar:
```js
const toolbox = { ... };
```

Por:
```js
import { buildToolboxForBoard } from './blocks.js';
import { getSetting } from './settings.js';

const currentBoard = getSetting('board');
const toolbox = buildToolboxForBoard(currentBoard);

// Registrar función de reconstrucción para cambio de placa
window._rebuildToolbox = function(fqbn) {
  const newToolbox = buildToolboxForBoard(fqbn);
  workspace.updateToolbox(newToolbox);
};
```

---

### Task 6: Endpoint `/api/board/install` en backend

**Objective:** Recibir el FQBN, ejecutar `arduino-cli core install` y `arduino-cli lib install` para instalar cores y librerías necesarias.

**Files:**
- Modify: `backend/app.py`

**Step 1: Agregar mapeo de cores/libs en backend**

Al inicio de `app.py` (después de las constantes):
```python
# ── Board config: cores y libs requeridas ──────
BOARD_DEPS = {
    'arduino:avr:uno':              {'cores': [], 'libs': []},
    'arduino:renesas_uno:minima':   {'cores': ['arduino:renesas_uno'], 'libs': []},
    'arduino:renesas_uno:wifi':     {'cores': ['arduino:renesas_uno'], 'libs': ['WiFiS3']},
    'arduino:esp32:nano_nora':      {'cores': ['arduino:esp32'], 'libs': []},
    'arduino:avr:mega':             {'cores': [], 'libs': []},
}
```

**Step 2: Agregar endpoint**

```python
@app.route('/api/board/install', methods=['POST'])
def board_install():
    """Instala cores y librerías necesarias para la placa seleccionada."""
    data = request.get_json() or {}
    fqbn = data.get('fqbn', 'arduino:avr:uno')

    deps = BOARD_DEPS.get(fqbn, {'cores': [], 'libs': []})
    results = []

    # Instalar cores
    for core in deps.get('cores', []):
        try:
            r = subprocess.run(
                ['arduino-cli', 'core', 'install', core],
                capture_output=True, text=True, timeout=120
            )
            results.append({
                'type': 'core', 'name': core,
                'success': r.returncode == 0,
                'stdout': r.stdout[-500:], 'stderr': r.stderr[-500:]
            })
        except subprocess.TimeoutExpired:
            results.append({'type': 'core', 'name': core, 'success': False, 'error': 'timeout'})
        except Exception as e:
            results.append({'type': 'core', 'name': core, 'success': False, 'error': str(e)})

    # Instalar librerías
    for lib in deps.get('libs', []):
        try:
            r = subprocess.run(
                ['arduino-cli', 'lib', 'install', lib],
                capture_output=True, text=True, timeout=120
            )
            results.append({
                'type': 'lib', 'name': lib,
                'success': r.returncode == 0,
                'stdout': r.stdout[-500:], 'stderr': r.stderr[-500:]
            })
        except subprocess.TimeoutExpired:
            results.append({'type': 'lib', 'name': lib, 'success': False, 'error': 'timeout'})
        except Exception as e:
            results.append({'type': 'lib', 'name': lib, 'success': False, 'error': str(e)})

    return jsonify({'fqbn': fqbn, 'results': results})
```

---

### Task 7: Actualizar settings modal con las 5 placas

**Objective:** Reemplazar el `<select id="setting-board">` en el modal de settings para que incluya las mismas 5 placas que el toolbar selector.

**Files:**
- Modify: `frontend/index.html:97-102`

**Step 1: Reemplazar opciones del select**

Cambiar:
```html
          <select id="setting-board">
            <option value="arduino:avr:uno">Arduino Uno</option>
            <option value="arduino:avr:nano">Arduino Nano</option>
            <option value="arduino:avr:mega">Arduino Mega</option>
            <option value="arduino:avr:leonardo">Arduino Leonardo</option>
          </select>
```

Por:
```html
          <select id="setting-board">
            <option value="arduino:avr:uno">Arduino Uno R3</option>
            <option value="arduino:renesas_uno:minima">Arduino Uno R4 Minima</option>
            <option value="arduino:renesas_uno:wifi">Arduino Uno R4 WiFi</option>
            <option value="arduino:esp32:nano_nora">Arduino Nano ESP32</option>
            <option value="arduino:avr:mega">Arduino Mega</option>
          </select>
```

---

### Task 8: Sincronización bidireccional toolbar ↔ settings modal

**Objective:** Cambiar placa en toolbar actualiza el modal y viceversa. Ambos disparan `POST /api/board/install`.

**Files:**
- Modify: `frontend/js/settings.js`

**Step 1: El listener del settings modal ya existe (línea 55). Solo hay que asegurar que también dispare la instalación y sincronice el toolbar.**

Modificar el listener `setting-board`:
```js
document.getElementById('setting-board').addEventListener('change', function() {
  const fqbn = this.value;
  onSettingChange('board', fqbn);

  // Sincronizar toolbar
  const toolbarSel = document.getElementById('board-selector');
  if (toolbarSel) toolbarSel.value = fqbn;

  // Disparar instalación
  fetch('/api/board/install', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fqbn })
  }).catch(e => console.warn('[ArduBlock] board/install:', e));

  // Reconstruir toolbox si está disponible
  if (window._rebuildToolbox) window._rebuildToolbox(fqbn);
});
```

---

### Task 9: Feedback visual durante instalación de cores/libs

**Objective:** Mostrar un toast/spinner cuando se están instalando dependencias.

**Files:**
- Modify: `frontend/js/main.js`

**Step 1: Agregar indicador en el listener del toolbar**

Modificar el listener de `board-selector` en main.js:
```js
boardSelector.addEventListener('change', async () => {
  const fqbn = boardSelector.value;
  // ... (código existente de sincronización)

  // Instalación con feedback
  showToast(`Instalando ${boardSelector.options[boardSelector.selectedIndex].text}...`);
  try {
    const res = await fetch('/api/board/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fqbn })
    });
    const data = await res.json();
    const failed = data.results.filter(r => !r.success);
    if (failed.length === 0) {
      showToast('✅ Placa lista');
    } else {
      showToast(`⚠ ${failed.length} componente(s) fallaron. Reintentá desde Consola.`);
      console.warn('[ArduBlock] Fallos en instalación:', failed);
    }
  } catch (e) {
    showToast('⚠ Error de conexión al instalar dependencias');
    console.warn('[ArduBlock] board/install:', e);
  }

  if (window._rebuildToolbox) window._rebuildToolbox(fqbn);
});
```

---

### Task 10: Pruebas manuales y verificación

**Objective:** Verificar flujo completo.

**Verification:**
1. Abrir ArduBlock, verificar que el selector en toolbar muestra "Arduino Uno R3" por defecto
2. Cambiar a "Arduino Mega" → verificar que el settings modal refleja el cambio
3. Cambiar a "Arduino Nano ESP32" → verificar que en terminal se ejecuta `arduino-cli core install arduino:esp32`
4. Abrir settings modal, cambiar a "Arduino Uno R4 WiFi" → verificar que toolbar se actualiza
5. Verificar que el endpoint `/api/board/install` responde correctamente con `curl`:
   ```
   curl -X POST http://localhost:5001/api/board/install \
     -H 'Content-Type: application/json' \
     -d '{"fqbn":"arduino:esp32:nano_nora"}'
   ```

---

## Resumen de Archivos

| Archivo | Acción |
|---------|--------|
| `frontend/js/board.js` | CREAR — configuración de 5 placas |
| `frontend/index.html` | MODIFICAR — selector en toolbar + opciones en settings |
| `frontend/css/style.css` | MODIFICAR — estilo `.arduino-select` |
| `frontend/js/main.js` | MODIFICAR — toolbox dinámico, listener selector |
| `frontend/js/blocks.js` | MODIFICAR — exportar `buildToolboxForBoard()` |
| `frontend/js/settings.js` | MODIFICAR — sincronización bidireccional |
| `backend/app.py` | MODIFICAR — endpoint `/api/board/install` |
