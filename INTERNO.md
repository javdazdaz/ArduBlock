# Registro de Commits — ArduBlock

Última actualización: 2026-06-04

## ✅ Paleta App Inventor — Colores de bloques compartidos

Los bloques built-in de Blockly usan `style:"loop_blocks"`, `style:"logic_blocks"`,
etc. heredados del tema. El `jsonInit` de Blockly v12 descarta `colour` si hay `style`.

**Pitfall de saturación:** `colour: N` usa HSV defaults (S=45%, V=65%) → tonos apagados.
`style:"*_blocks"` vía tema usa hex explícitos (S=85%, V=90%) → tonos vibrantes App Inventor.

**Solución: tema centralizado** (`main.js`) con los 7 estilos de App Inventor:

| Estilo            | colourPrimary | Categoría       | Bloques cubiertos |
|-------------------|---------------|-----------------|--------------------|
| `loop_blocks`     | `#cfac4b`     | Control — ámbar | if, repeat, while, for, flow, arduino_for_index |
| `logic_blocks`    | `#88b652`     | Lógica — verde  | compare, operation, negate, boolean, ternary |
| `math_blocks`     | `#4f86c2`     | Matemát — azul  | number, arithmetic, single, random, constrain, map |
| `text_blocks`     | `#58b5dc`     | Texto — cyan    | text, join, print, length |
| `list_blocks`     | `#2d1799`     | Arreglos — púrpura oscuro | array_declare, get, set, length |
| `variable_blocks` | `#db743a`     | Variables — naranja | declare, set, get |
| `procedure_blocks`| `#8f6997`     | Funciones — violeta | defnoreturn, defreturn |

**Redefinición manual** (`blocks.js`): solo `controls_if` + 3 hijos porque usan
`style:"logic_blocks"` built-in pero deben ser ámbar (Control).

Los bloques custom en categorías App Inventor (`variable_*`, `array_*`, `map_value`,
`arduino_for_index`) usan `style:"*_blocks"` en vez de `colour` → heredan saturación del tema.

Resultado: ~30 bloques con colores App Inventor, 0 `colour` crudo, 0 init wrappers.

Commits ordenados del más reciente al más antiguo.

| Fecha | Hash | Descripción |
|-------|------|-------------|
| 2026-06-04 | `46008a9` | pin_mode progresivo: variantes Básico y Avanzado + protección de nivel |
| 2026-06-04 | `47fbeff` | Selector de nivel Básico/Intermedio/Avanzado con filtro de toolbox |
| 2026-06-02 | `1e7b5f8` | feat: selector de placa en toolbar con instalación de dependencias |
| 2026-06-01 | `a40ee50` | fix: limpia warnings ESLint — 0 errores, −40% warnings |
| 2026-06-01 | `b4c9222` | feat: navegación 2 niveles en ejemplos + description bilingüe |
| 2026-06-01 | `6657e73` | refactor: externaliza states a JSON, agrega source y description bilingüe |
| 2026-06-01 | `f878eb3` | refactor: extrae 29 Blockly states a examples/blockly-states/ |
| 2026-06-01 | `0d8b221` | chore: actualiza vite 8.0.14→8.0.16, vitest 4.1.7→4.1.8 |
| 2026-06-01 | `455cd78` | fix: agrega globals de Vitest en ESLint para archivos de test |
| 2026-06-01 | `9924b3e` | fix: reemplaza catch vacíos por console.warn para diagnóstico |
| 2026-06-01 | `61d2bd2` | fix: exime serial_read del rate limiting global |
| 2026-06-01 | `a0d185e` | fix: corrige doble coma y output types en bloques |
| 2026-06-01 | `5d1caf6` | feat: bloques Serial avanzados + 6 ejemplos Communication convertidos |
| 2026-06-01 | `9ddfac8` | Conversión de ejemplos digitales + analógicos, bloque array_set |
| 2026-06-01 | `cf340f5` | CodeMirror 6, nombres .ino dinámicos y corrección de ejemplos |
| 2026-05-31 | `c614b96` | feat: tabs .h, arrays, for-loop y ejemplo toneMelody completo |
| 2026-05-31 | `9cac42b` | docs: agrega roadmap con tabs múltiples y selector de placa |
| 2026-05-31 | `92fa03a` | fix: corrige serialización de ejemplos para Blockly v12 |
| 2026-05-31 | `11ac9f9` | ejemplos: 02.Digital completo — 9 sketches consolidados |
| 2026-05-31 | `b3cbb7e` | fix: Button — agregar variable_declare global de buttonState |
| 2026-05-31 | `7fc85ce` | ejemplos: 02.Digital corregidos + comentarios bilingües |
| 2026-05-31 | `efc6334` | ejemplos: 01.Basics corregidos + comentarios bilingües |
| 2026-05-31 | `7c60cb7` | fix: importar Blockly directamente en examples.js |
| 2026-05-31 | `1a7c2fd` | ejemplos: 9 sketches faltantes clasificados (1 convertible) |
| 2026-05-31 | `377cf8a` | ejemplos: cablear UI para cargar todos los sketches convertidos |
| 2026-05-31 | `92ceb26` | ejemplos: 16 convertidos + 52 documentados como no viables |
| 2026-05-31 | `ce72c37` | README: sección de instalación por distro |
| 2026-05-31 | `77faed7` | procedures: parámetros tipados con dropdown de tipo |
| 2026-05-31 | `f38f56a` | README: reescritura del readme |
| 2026-05-31 | `a17ca93` | plugins: fixed-edges + block-shareable-procedures, cleanup 3 unused |
| 2026-05-31 | `a66acc4` | docs: agregar reglas de validación R1-R7 al README |
| 2026-05-31 | `148e548` | tests: ampliar cobertura de 5 a 32 tests (variables + validación) |

---

## Resumen por categoría

- **feat**: 8 commits (selector de placa, navegación ejemplos, Serial avanzados, tabs .h, CodeMirror 6, selector de nivel, pin_mode progresivo)
- **fix**: 8 commits (ESLint, catch vacíos, rate limiting, doble coma, serialización, imports)
- **refactor**: 3 commits (states JSON, extracción blockly-states, modularización bloques en 14 archivos)
- **docs**: 3 commits (roadmap, validación R1-R7, README instalación)
- **ejemplos**: 6 commits (conversión Basics, Digital, Communication, clasificación)
- **tests**: 1 commit (cobertura 5→32 tests)
- **chore**: 1 commit (vite + vitest)
- **plugins**: 1 commit (fixed-edges, shareable-procedures)
- **procedures**: 1 commit (parámetros tipados)

Total: 33 commits entre 2026-05-31 y 2026-06-04.

---

## Mapa de Archivos

### Frontend — `frontend/`

| Archivo | LOC | Responsabilidad |
|---------|-----|-----------------|
| `index.html` | — | Punto de entrada HTML, layout de paneles, toolbar, modales |
| `css/style.css` | — | Estilos globales, temas claro/oscuro, layout |
| **Núcleo** | | |
| `js/main.js` | 415 | Orquestador: inicializa workspace Blockly, plugins, conecta todos los módulos |
| `js/blocks.js` | 1255 | Definiciones JSON de bloques Arduino (~80 tipos de bloque, incluye BLOCK_LEVELS) |
| `js/generator.js` | 1015 | Generadores C++ para cada tipo de bloque (Blockly.JavaScript.forBlock), incluye variantes progresivas |
| `js/validator.js` | 488 | Validación semántica en tiempo real (reglas R1-R7) |
| **Funcionalidad** | | |
| `js/settings.js` | 245 | Tema (claro/oscuro), renderer (geras/zelos), fuentes, placa. Persiste en localStorage |
| `js/i18n.js` | 505 | Internacionalización español ↔ inglés. `t(key)`, `applyDOMLanguage()`. Recarga al cambiar idioma |
| `js/project-manager.js` | 190 | Guardar/cargar/eliminar proyectos en localStorage. Autosave cada 2s. Export `escapeHtml()` |
| `js/tab-manager.js` | 383 | Tabs de código: sketch.ino (readonly) + tabs .h editables. CodeMirror 6. |
| `js/board.js` | 111 | Configuración de placas (FQBN, pines, cores/libs). 5 placas soportadas |
| `js/serial.js` | 109 | Monitor Serial vía WebSocket. `connectSerial`, `consoleLog`, `toggleConsole` |
| `js/upload.js` | 86 | Compilación + upload vía arduino-cli. Endpoint Flask `/api/compile` |
| `js/resize.js` | 128 | Redimensionamiento arrastrable de paneles (toolbox, código) |
| **Ejemplos** | | |
| `js/examples.js` | 298 | Sistema de ejemplos: navegación 2 niveles (fuente → categorías → sketches) |
| `js/examples-index.js` | 32 | Índice maestro: re-exporta todos los ejemplos por categoría |
| `js/examples-sources.js` | 26 | Registro de fuentes de ejemplos (namespaces, metadata) |
| `js/examples-{categoria}.js` | ~30 c/u | Workspaces JSON de ejemplos por categoría (Basics, Digital, Analog, Communication, Control, Data) |
| `js/examples-remaining.js` | — | Sketches pendientes de clasificar |
| `js/examples-missing.js` | — | Sketches no convertibles documentados |

### Backend — `backend/`

| Archivo | LOC | Responsabilidad |
|---------|-----|-----------------|
| `app.py` | 476 | Flask: endpoints REST (`/api/compile`, `/api/board-*`, `/api/serial`, `/api/lib-install`) + WebSocket serial |

### Ejemplos — `examples/`

| Directorio | Contenido |
|------------|-----------|
| `examples/arduino/` | Sketches .ino originales organizados por categoría Arduino |
| `examples/blockly-states/` | Workspaces JSON exportados, uno por sketch convertido |

### Raíz

| Archivo | Uso |
|---------|-----|
| `package.json` | Dependencias npm + scripts (dev, build, test) |
| `eslint.config.js` | Configuración ESLint |
| `ardublock.sh` | Script de inicio/parada del servidor (Vite :5000 + Flask :5001) |
| `README.md` | Documentación para el profesor (instalación, uso) |
| `INTERNO.md` | Este archivo — documentación para desarrolladores |

---

## Convenciones del Proyecto

### Commits
- **Idioma:** español
- **Formato:** 1-2 bullets descriptivos, sin punto final
- **Prefijos:** `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`
- **Antes de commit:** revisar `git diff` para evitar subir ruido o archivos no deseados

### Código
- **Idioma UI:** español por defecto. Strings usan forma "tú" (Revisa, Conecta, Asegurate), NUNCA "vos" (Revisá, Conectalo)
- **Comentarios en código:** bilingües (español principal, inglés secundario). Headers de archivo en español
- **Nombrado de archivos:** kebab-case para módulos (`project-manager.js`), camelCase para funciones exportadas
- **Módulos ES6:** `import`/`export`. Sin `require()` — el proyecto es `"type": "module"`

### Pedagógico
- **NUNCA borrar trabajo del alumno automáticamente.** Bloque inválido → deshabilitar (gris) + warning descriptivo
- **Reglas de validación (R1-R7):** pensadas como ayuda pedagógica, no como restricciones técnicas. Cada aviso explica qué pasa y por qué
- **C++ generado:** debe ser sintácticamente válido y compilable en Arduino. Orden canónico: `#include` → globales → `setup()` → `loop()`

### Code Review
- Post-auditoría: corregir bugs críticos primero, un commit por fix
- Refactors grandes (DRY, arquitectura) requieren discusión previa mostrando antes/después
- Items de baja prioridad (warnings sin impacto, catch vacíos preexistentes) se agrupan en un commit de limpieza

---

## Decisiones de Arquitectura

### ¿Por qué Blockly v12?
v12 introdujo cambios en la serialización de workspaces que rompieron compatibilidad con v11. La migración fue necesaria para usar plugins modernos (`fixed-edges`, `block-shareable-procedures`, `cross-tab-copy-paste`). Ver `references/serialization-debugging.md` en el skill.

### ¿Por qué CodeMirror 6 y no Monaco/textarea?
- Monaco (~5 MB) es excesivo para mostrar código generado readonly
- textarea no tiene resaltado de sintaxis
- CodeMirror 6 es modular (~200 KB con lang-cpp + theme), ligero, y su API de transacciones encaja con el patrón de sync unidireccional Blockly → editor

### ¿Por qué localStorage y no IndexedDB?
- localStorage es síncrono y trivial de usar. Suficiente para workspaces JSON (<100 KB)
- Sin backend de base de datos, sin login — el proyecto del alumno vive en su navegador
- IndexedDB solo se justificaría con múltiples proyectos grandes o assets binarios, que ArduBlock no maneja

### ¿Por qué dual-service Vite :5000 + Flask :5001?
- Vite sirve el frontend con HMR en desarrollo. Flask maneja la comunicación con arduino-cli y pyserial
- Separación limpia: el frontend nunca ejecuta comandos del sistema. El backend es el único que habla con el hardware
- CORS configurado para permitir requests cross-origin en desarrollo

### ¿Por qué español como idioma por defecto?
Contexto educativo: profesores y estudiantes son hispanohablantes. El inglés es opción secundaria (toggle en settings). Blockly.Msg se sobreescribe con strings en español al iniciar.

---

## Deuda Técnica

### Ejemplos no convertibles
52 sketches de Arduino documentados como "no viables" (commit `92ceb26`). Razones típicas:
- Usan librerías sin bloque equivalente (Ethernet, WiFi, SD, TFT, GSM)
- Manipulación directa de registros o punteros
- Estructuras de control que Blockly no modela bien (switch-case con muchos casos, máquinas de estado)
- Sketches que dependen de timing muy preciso o interrupciones complejas

### Plataformas no verificadas
- Solo testeado en Linux. Windows y Mac: instalación documentada pero upload/compilación no verificado
- Placas ARM (Due, Zero, MKR): dependencias documentadas en `board.js` pero no probadas físicamente

### Cobertura de tests
- 32 tests (commit `148e548`), enfocados en variables + validación
- Sin tests para: generador C++, serialización de ejemplos, upload pipeline, serial monitor
- Tests corren con Vitest + jsdom (para DOM de Blockly)

### Deuda de código
- `catch` vacíos reemplazados por `console.warn` en `9924b3e`. Pueden quedar casos sin revisar
- `blocks.js` (1172 LOC) y `generator.js` (1002 LOC) son archivos grandes que se beneficiarían de particionar por categoría
- Rate limiting global con exención puntual para `serial_read` — patrón frágil si se agregan más endpoints

---

## Roadmap

### ✅ Completado
- [x] Múltiples tabs en el workspace (`.ino` readonly + `.h` editables)
- [x] Selector de placa en toolbar con instalación de dependencias
- [x] Selector de nivel Básico/Intermedio/Avanzado con filtro de toolbox
- [x] Bloques progresivos: 6 bloques con 3 variantes por nivel (dropdown → field_number → input_value)
- [x] Protección de nivel: warning en bloques de nivel superior sin deshabilitar
- [x] Modularización: blocks.js partido en 14 archivos de categoría + toolbox por secciones
- [x] CodeMirror 6 con resaltado C++
- [x] Bloques Serial avanzados (read, write, available, parseInt, parseFloat, readString)
- [x] Navegación de ejemplos en 2 niveles (fuente → categorías)
- [x] Parámetros tipados en procedures
- [x] Arrays (declare, get, set, length)
- [x] Validación semántica R1-R7

### 📋 Bloques pendientes (por categoría Arduino)

#### Digital I/O
- [ ] `digitalPinToInterrupt(pin)` — helper para attachInterrupt (expresión)

#### Analog I/O
- [ ] `analogReference(type)` — DEFAULT/INTERNAL/EXTERNAL (statement, solo setup)
- [ ] `analogWrite` — variante _basic con dropdown de pines
- [ ] `analogRead` — variante _basic con dropdown A0-A15

#### Time
- [ ] `micros()` — microsegundos desde inicio (expresión)
- [ ] `delayMicroseconds(us)` — espera en microsegundos (statement)

#### Math
- [ ] `randomSeed(seed)` — semilla para random (statement, solo setup)
- [ ] `abs(x)` — valor absoluto (cubierto por math_single)
- [ ] `sq(x)`, `pow(base, exp)` — potencia (cubierto por math_arithmetic)

#### Bits & Bytes
- [ ] `bitRead(x, n)` — leer bit n de x (expresión)
- [ ] `bitWrite(x, n, b)` — escribir bit (statement)
- [ ] `bitSet(x, n)` / `bitClear(x, n)` — poner/limpiar bit (statement)
- [ ] `highByte(x)` / `lowByte(x)` — byte alto/bajo (expresión)

#### Communication — Serial
- [ ] `Serial.end()` — cerrar comunicación serial
- [ ] `Serial.flush()` — esperar a que se envíen todos los datos
- [ ] `serial_print` — variante con formato (DEC/HEX/OCT/BIN) (pitfall conocido)
- [ ] `serial_println` — variante con formato

#### Advanced I/O
- [ ] `shiftOut(dataPin, clockPin, bitOrder, value)` — registro de desplazamiento
- [ ] `shiftIn(dataPin, clockPin, bitOrder)` — leer registro de desplazamiento
- [ ] `pulseIn` — variante _basic con dropdown de pin

#### Interrupts
- [ ] `interrupts()` / `noInterrupts()` — habilitar/deshabilitar interrupciones

#### Librerías externas (bloques nuevos)
- [ ] **EEPROM**: `eeprom_read(addr)`, `eeprom_write(addr, val)`, `eeprom_length()`
- [ ] **Wire (I2C)**: `wire_begin()`, `wire_beginTransmission(addr)`, `wire_write(val)`, `wire_endTransmission()`, `wire_requestFrom(addr, n)`, `wire_read()`
- [ ] **SPI**: `spi_begin()`, `spi_transfer(val)`, `spi_end()`
- [ ] **SoftwareSerial**: `softserial_create(rx, tx)`, `softserial_begin(baud)`, `softserial_print/println`
- [ ] **WiFi** (ESP32 / UNO R4): `wifi_connect(ssid, pass)`, `wifi_status()`, `wifi_localIP()`

### 🔜 Próximos pasos (sin orden fijo)
- [ ] **Dark mode completo** — toolbar, modales, panel de ejemplos (CodeMirror ya tiene tema oscuro)
- [ ] **Undo/Redo global** — el historial de Blockly no cubre cambios de tabs .h ni selección de placa
- [ ] **Exportar sketch como .ino** — descarga del código generado con los .h incluidos
- [ ] **Importar .ino existente** — parseo inverso: C++ → bloques (alcance limitado, solo patrones reconocibles)
- [ ] **Monitor Serial: gráfico** — plotter básico de valores numéricos
- [ ] **Tests de generador C++** — validar que cada bloque produce código sintácticamente correcto
- [ ] **CI/CD** — GitHub Actions para lint + tests + build en cada push

---

## Setup Rápido de Desarrollo

```bash
# Instalar dependencias
npm install

# Dev server con HMR (Vite :5000 + Flask :5001)
./ardublock.sh start

# Solo frontend (sin backend)
npm run dev          # Vite en :5000

# Tests
npm test             # Vitest run (una vez)
npm run test:watch   # Vitest en modo watch

# Build producción
npm run build        # Output en frontend/dist/

# Lint
npx eslint frontend/js/

# Logs del servidor
./ardublock.sh logs
./ardublock.sh status
./ardublock.sh stop
```

---

## Plugins Blockly Instalados

| Plugin | Versión | Para qué |
|--------|---------|----------|
| `blockly` | ^12.5.1 | Core de Blockly |
| `@blockly/fixed-edges` | ^6.0.9 | Evita scroll infinito del workspace |
| `@blockly/block-shareable-procedures` | ^6.0.12 | Funciones con parámetros tipados (dropdown de tipo) |
| `@blockly/plugin-cross-tab-copy-paste` | ^8.0.8 | Copiar/pegar bloques entre pestañas del workspace |
| `@blockly/plugin-workspace-search` | ^10.1.8 | Buscar bloques por texto en el workspace |
| `@blockly/plugin-scroll-options` | ^7.0.9 | Scroll suave con rueda del mouse |
| `@blockly/shadow-block-converter` | ^7.0.10 | Convertir shadow blocks ↔ bloques reales |
| `@blockly/toolbox-search` | ^3.1.9 | Buscar bloques en la toolbox |
| `@blockly/workspace-backpack` | ^7.0.11 | Mochila para guardar/reutilizar bloques |
| `@blockly/theme-dark` | ^8.0.4 | Tema oscuro para el workspace |
| `@blockly/field-angle` | ^6.0.9 | Selector gráfico de ángulo (0-360°) |
| `@blockly/continuous-toolbox` | ^7.0.9 | Toolbox con scroll continuo (categorías largas) |
| `@blockly/plugin-typed-variable-modal` | ^9.0.9 | Modal para crear variables con tipo (int, float, String...) |

---

## Cómo Agregar un Bloque Nuevo

Todo bloque nuevo requiere cambios en 3 archivos (4 si tiene regla de validación):

### 1. Definir el bloque — `frontend/js/blocks.js`
```js
Blockly.Blocks['mi_bloque'] = {
  init: function() {
    this.appendValueInput('PIN')
        .setCheck('Number')
        .appendField('leer pin digital');
    this.setOutput(true, 'Boolean');
    this.setColour(0);  // color de categoría
    this.setTooltip('Lee el valor HIGH o LOW de un pin digital.');
    this.setHelpUrl('');
  }
};
```
- `appendValueInput`: entrada que acepta otro bloque. `appendDummyInput`: sin entrada. `appendStatementInput`: acepta bloques apilables
- `setOutput(true, type)`: bloque que devuelve valor. `setPreviousStatement/setNextStatement`: bloque apilable
- Colores por categoría: 0=digital, 120=analog, 180=serial, 210=time, 290=components

### 2. Generar código C++ — `frontend/js/generator.js`
```js
Blockly.JavaScript.forBlock['mi_bloque'] = function(block) {
  var pin = Blockly.JavaScript.valueToCode(block, 'PIN', Blockly.JavaScript.ORDER_ATOMIC) || '0';
  var code = 'digitalRead(' + pin + ')';
  return [code, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};
```
- `valueToCode`: obtiene el código de un bloque conectado a una entrada
- El segundo valor del return es la precedencia del operador (ORDER_ATOMIC, ORDER_FUNCTION_CALL, ORDER_NONE, etc.)

### 3. Agregar a la toolbox — `frontend/index.html`
```xml
<block type="mi_bloque"></block>
```
Buscar la categoría correcta (`<category name="...">`) y agregar dentro.

### 4. (Opcional) Regla de validación — `frontend/js/validator.js`
Si el bloque tiene restricciones semánticas (ej: "debe ir dentro de setup"), agregar la regla:
```js
rules.push({
  id: 'R8',
  name: 'mi_bloque fuera de setup()',
  message: 'mi_bloque debe ir dentro de "al iniciar (setup)".',
  check: function(workspace, block) {
    // lógica de validación
  }
});
```

### 5. Actualizar skill de referencia
Si el bloque corresponde a una función Arduino, verificar que esté documentada en `arduino-language-reference`.

---

## Referencias (Skills de Hermes)

Documentación offline indexada para búsqueda interna rápida desde el agente Hermes.
Cada skill se carga bajo demanda con `skill_view(nombre)`.

| Skill | Contenido | Cuándo cargar |
|-------|-----------|---------------|
| `blockly-ardublock-development` | API Blockly v12, bloques, generadores, validación, plugins, ejemplos, pitfalls (107 KB + 50+ refs) | Siempre — es el skill principal del proyecto |
| `arduino-language-reference` | Funciones Arduino (digital/analog IO, time, math, serial), variables, control de flujo, componentes (Servo, LCD, DHT, Ultrasonic, Stepper) | Al crear/editar bloques o generadores C++ |
| `arduino-cli-reference` | Comandos compile, upload, board list/details, core/lib install, FQBN, permisos serial, pitfalls de compilación | Al trabajar en upload.js, board.js, o backend Flask |
| `codemirror6-reference` | Arquitectura CM6, paquetes (@codemirror/state, view, lang-cpp, theme-one-dark), API esencial, patrones de sync con Blockly | Al modificar el panel de código o el resaltado de sintaxis |
