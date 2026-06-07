# ArduBlock

Programación visual para Arduino con [Blockly](https://developers.google.com/blockly).
Los estudiantes construyen sketches arrastrando bloques, ven el código C++ generado
en tiempo real, y lo suben a la placa sin salir del navegador.

**[ardublock.matemancia.net](https://ardublock.matemancia.net)** — uso libre, sin
instalación.

## Inicio rápido

### Usar la versión hosteada

Abrir https://ardublock.matemancia.net. La primera vez, si arduino-cli no está
instalado, un modal ofrece instalarlo con un clic. Compatible con Linux, Windows y
macOS (x86_64 y ARM).

### Montar un servidor local

Requisitos: **Node.js** y **Python 3.10+**.

```bash
# Debian / Ubuntu
sudo apt install nodejs npm python3 python3-venv

# Arch
sudo pacman -S nodejs npm python python-virtualenv

# Gentoo
sudo emerge -av net-libs/nodejs dev-lang/python
```

```bash
npm install                                    # dependencias frontend
python -m venv backend/.venv                   # entorno virtual Python
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
./ardublock.sh start                           # iniciar servidor
```

Dos servicios: Vite en `:5000` (interfaz) y Flask en `:5001` (API). Abrir
http://localhost:5000. Para que otras máquinas de la red accedan, usar la IP
local en vez de `localhost`.

Otros comandos: `./ardublock.sh stop | restart | status | logs`.

## Funcionalidades

| Funcionalidad | Descripción |
|---|---|
| **Editor de bloques** | Blockly v12 con toolbox dinámica según placa y nivel (Básico / Intermedio / Avanzado). |
| **Código C++ en vivo** | Cada cambio en los bloques genera el código equivalente al instante. CodeMirror 6 con tabs `.ino` y `.h`. |
| **Compilar y subir** | Un solo botón: detecta la placa, compila con arduino-cli y sube el sketch. Si falta un core, lo instala automáticamente. |
| **Monitor Serial** | Consola integrada con salida en tiempo real, selector de baud rate, conectar/desconectar. |
| **Validación pedagógica** | Analiza los bloques en tiempo real y advierte de errores antes de compilar. Los bloques con error se deshabilitan — nunca se borran. |
| **Persistencia local** | Proyectos guardados automáticamente en localStorage cada 2 segundos. Sin backend, sin login. |
| **Historial undo/redo** | Árbol completo de estados: bloques, tabs, nombre y placa. Botones ↩ y ↪. |
| **Diagnóstico del sistema** | Menú ☰ → 🔍 Diagnóstico: estado de arduino-cli, drivers USB-Serial y placas conectadas. |
| **Niveles de bloques** | Selector Básico / Intermedio / Avanzado. Bloques de niveles superiores muestran advertencia pero siguen funcionando. |

## Placas soportadas

| Placa | FQBN | Identificación |
|---|---|---|
| Arduino Uno R3 | `arduino:avr:uno` | Oficial y clones CH340/CH341 |
| Arduino Nano | `arduino:avr:nano` | Clones CH340/CP2102 |
| Arduino Mega | `arduino:avr:mega` | Oficial y clones |
| Arduino Uno R4 Minima | `arduino:renesas_uno:minima` | Oficial |
| Arduino Uno R4 WiFi | `arduino:renesas_uno:wifi` | Oficial |
| Arduino Nano ESP32 | `arduino:esp32:nano_nora` | Oficial |


## arduino-cli

ArduBlock gestiona arduino-cli de forma automática:

- **Detección al cargar** — si no está instalado, abre un modal ofreciendo
  instalarlo (descarga desde `downloads.arduino.cc`).
- **Diagnóstico** — el menú ☰ → 🔍 Diagnóstico muestra estado, ruta y permite
  reinstalar.
- **Auto-install de cores** — si al compilar falta un core (`arduino:avr`,
  `arduino:renesas_uno`, etc.), lo instala y reintenta.

### Instalación manual

Si prefieres instalar arduino-cli por tu cuenta:

```powershell
# Windows
winget install ArduinoSA.CLI
```

```bash
# macOS
brew install arduino-cli
```

```bash
# Debian / Ubuntu
sudo apt install arduino-cli

# Arch
sudo pacman -S arduino-cli

# Gentoo (overlay GURU)
sudo emerge -av dev-embedded/arduino-cli
```

### Permisos del puerto serial (Linux)

Agregar el usuario al grupo correspondiente y vuelve a iniciar sesión:

| Distro | Grupo | Comando |
|---|---|---|
| Debian / Ubuntu | `dialout` | `sudo gpasswd -a $USER dialout` |
| Arch | `uucp` | `sudo gpasswd -a $USER uucp` |
| Gentoo | `dialout` | `sudo gpasswd -a $USER dialout` |

### Drivers USB-Serial

Las placas clon usan chips CH340/CH341 que en Windows y macOS requieren drivers
manuales. ArduBlock los detecta y muestra el enlace de descarga en el diagnóstico.
En Linux funcionan sin drivers adicionales (kernel ≥ 2.6).

## Reglas de validación

Cada aviso explica al estudiante qué ocurre y por qué. Las advertencias buscan dar retroalimentación y explicar porque algo falla.

| # | Regla | Descripción |
|---|---|---|
| R1 | Dos bloques `al iniciar` | Solo puede haber un `setup()`. El duplicado se deshabilita. |
| R2 | Dos bloques `repetir siempre` | Solo puede haber un `loop()`. El duplicado se deshabilita. |
| R3 | `iniciar Serial` fuera de setup() | Debe ir dentro de `al iniciar`. |
| R4 | Bloque suelto | No está conectado a `al iniciar` ni a `repetir siempre`. |
| R5 | `iniciar variable` dentro de loop() | La variable se redeclararía en cada iteración. |
| R6a | Servo sin declarar | No hay un bloque `crear servo` con ese nombre. |
| R6b | `crear servo` fuera de setup() | Debe ir dentro de `al iniciar`. |
| R6c | `crear LCD/DHT/ultrasónico` fuera de setup() | Debe ir dentro de `al iniciar`. |
| R7 | Pin sin `configurar pin` | El pin no fue declarado con `configurar pin` en setup(). |

## Desarrollo

### Stack técnico

Blockly v12 · Vite · Flask · arduino-cli · pyserial · CodeMirror 6

### Estructura del proyecto

```
ardublock/
├── frontend/           # HTML, CSS, JS (Blockly + Vite)
│   ├── js/             # Módulos: blocks, generator, upload, serial, ...
│   └── css/
├── backend/            # API Flask (compilar, subir, serial, drivers)
├── examples/           # Sketches .ino de ejemplo
└── ardublock.sh        # Script de control del servicio
```
## Licencia

GPL-3.0-or-later
