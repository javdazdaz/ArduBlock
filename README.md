# ArduBlock

ArduBlock es un entorno de programación visual para Arduino pensado para el aula.
Los estudiantes construyen programas arrastrando bloques, ven el código C++
equivalente en tiempo real y lo suben a la placa sin salir del navegador.

El docente crea aulas con un código de acceso; los estudiantes se registran con ese
código y trabajan en sus proyectos. Todo desde el navegador, sin instalar nada.

**[ardublock.matemancia.net](https://ardublock.matemancia.net)** — uso libre.

## Inicio rápido

### Usar la versión hosteada

Ingresar https://ardublock.matemancia.net. Sin instalación: funciona en Linux, Windows
y macOS (x86_64 y ARM).

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

Dos servicios: Vite en `:5000` (interfaz) y Flask en `:5001` (API). Abra
http://localhost:5000. Para que otras máquinas de la red accedan, use la IP local
en vez de `localhost`.

Otros comandos: `./ardublock.sh stop | restart | status | logs`.

## Funcionalidades

| Funcionalidad                   | Descripción                                                                                                                                          |
|---------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Editor de bloques**           | Blockly v12 con toolbox dinámica según placa y nivel (Básico / Intermedio / Avanzado).                                                               |
| **Código C++ en vivo**          | Cada cambio en los bloques genera el código equivalente al instante. CodeMirror 6 con tabs `.ino` y `.h`.                                            |
| **Compilar y subir**            | Un solo botón: detecta la placa, compila con arduino-cli y sube el sketch. Si falta un core, lo instala automáticamente.                             |
| **Monitor Serial**              | Consola integrada con salida en tiempo real, selector de baud rate, conectar/desconectar.                                                            |
| **Validación pedagógica**       | Analiza los bloques en tiempo real y advierte de errores antes de compilar (reglas R1–R12). Los bloques con error se deshabilitan — nunca se borran. |
| **Barra de estado y problemas** | Barra inferior estilo IDE con resumen de errores y avisos; al hacer clic despliega la lista de problemas y centra el bloque afectado.                |
| **Cuentas y aulas**             | Roles docente/estudiante. El docente crea aulas con código de acceso; los estudiantes se registran con ese código. Dashboard unificado por rol.      |
| **Editor de matriz LED**        | Editor visual de animaciones (12×8 y MAX7219 8×8) que genera el código del frame.                                                                    |
| **Persistencia**                | Modo invitado: guardado automático en localStorage cada 2 s. Con cuenta: proyectos en el servidor.                                                   |
| **Idiomas**                     | Español e inglés (interfaz, bloques y mensajes del validador).                                                                                       |
| **Temas**                       | Paletas de color seleccionables (Calcite, Calcite Dark, Dracula, ArduBlock).                                                                         |
| **Historial undo/redo**         | Árbol completo de estados: bloques, tabs, nombre y placa. Botones ↩ y ↪.                                                                             |
| **Diagnóstico del sistema**     | Menú ☰ → 🔍 Diagnóstico: estado de arduino-cli, drivers USB-Serial y placas conectadas.                                                              |
| **Niveles de bloques**          | Selector Básico / Intermedio / Avanzado. Bloques de niveles superiores muestran advertencia pero siguen funcionando.                                 |

## Cuentas y aulas

- **Docente** — crea aulas con un código de acceso de 8 caracteres (ej. `A1B2C3D4`),
  organiza clases dentro de cada aula, asigna actividades y ve el progreso de cada
  estudiante.
- **Estudiante** — se registra con el código del aula (nombre + email + contraseña)
  y accede a sus cursos y proyectos.
- Recuperación de contraseña por email.

## Placas soportadas

| Placa                 | FQBN                            | Identificación               |
|-----------------------|---------------------------------|------------------------------|
| Arduino Uno R3        | `arduino:avr:uno`               | Oficial y clones CH340/CH341 |
| Arduino Uno R4 Minima | `arduino:renesas_uno:minima`    | Oficial                      |
| Arduino Uno R4 WiFi   | `arduino:renesas_uno:unor4wifi` | Oficial                      |


## arduino-cli

ArduBlock gestiona arduino-cli de forma automática:

- **Detección al cargar** — si no está instalado, abre un modal ofreciendo
  instalarlo (descarga desde `downloads.arduino.cc`).
- **Diagnóstico** — el menú ☰ → 🔍 Diagnóstico muestra estado, ruta y permite
  reinstalar.

## Reglas de validación

Cada aviso explica al estudiante qué ocurre y por qué. Las advertencias buscan dar
retroalimentación y explicar por qué algo falla, antes de compilar.

| # | Regla | Descripción |
|---|---|---|
| R1 | Dos bloques `al iniciar` | Solo puede haber un `setup()`. El duplicado se deshabilita. |
| R2 | Dos bloques `repetir siempre` | Solo puede haber un `loop()`. El duplicado se deshabilita. |
| R3 | `iniciar Serial` fuera de setup() | Debe ir dentro de `al iniciar`. |
| R4 | Bloque suelto | No está conectado a `al iniciar` ni a `repetir siempre`. |
| R5 | Variable asignada dentro de loop() | Se redeclararía en cada iteración; declárela fuera de setup()/loop(). |
| R6a | Servo sin declarar | No hay un bloque `crear servo` con ese nombre. |
| R6b | `crear servo` fuera de setup() | Debe ir dentro de `al iniciar`. |
| R6c | `crear` de LCD/DHT/ultrasónico/motor fuera de setup() | Debe ir dentro de `al iniciar`. |
| R6d | `configurar pin` o `interrupción` fuera de setup() | Debe ir dentro de `al iniciar`. |
| R6e | Motor sin crear | Se usa `velocidad` o `girar` de un motor que no fue creado. |
| R7 | Pin sin `configurar pin` | El pin no fue declarado en setup(), o su modo no coincide con el uso. |
| R8 | Pin fuera de rango | El pin no existe en la placa seleccionada. |
| R9 | Serial sin `iniciar Serial` | Hay bloques de Serial pero falta iniciarlo en setup(); compila pero no verá output. |
| R10 | Muchas concatenaciones | Muchos bloques `unir texto` pueden fragmentar la RAM en placas AVR (2 KB). |
| R11 | Pin 0/1 en uso | Reservados para Serial (RX/TX); pueden interferir con la comunicación y la carga. |
| R12 | Pines A4/A5 con LCD I2C | El LCD I2C usa SDA=A4 y SCL=A5; evite usar esos pines. |

## Desarrollo

### Stack técnico

Blockly v12 · Vite · Flask · arduino-cli · pyserial · CodeMirror 6

### Estructura del proyecto

```
ardublock/
├── frontend/           # HTML, CSS, JS (Blockly + Vite)
│   ├── js/             # Módulos: blocks, generator, validator, i18n, ...
│   ├── css/
│   ├── templates/      # Plantillas Jinja (base, dashboard, aulas, ...)
│   └── public/         # Landing (frontpage)
├── backend/            # API Flask
│   ├── routes/         # auth, projects, compile, serial, ...
│   ├── services/       # arduino-cli, serial, usb
│   └── tests/
├── examples/           # Ejemplos: arduino/*.ino (API) + blockly-states/*.json (bloques)
└── ardublock.sh        # Script de control del servicio
```

### Notas de desarrollo

- **Compilación asíncrona**: `POST /api/compile` encola (202 con `job_id`); polling a
  `GET /api/compile/<job_id>`. Cola en memoria (`backend/compile_queue.py`).
- **i18n**: es/en vía cookie `lang` (`backend/messages.py`, `frontend/js/i18n.js`).
- **Actividades**: guiadas (`frontend/activities/*.js`) vs. biblioteca del docente
  (entidad `Activity` en la DB, asignable a clases).
- **Ejemplos**: `examples/arduino/*.ino` (servidos por `/api/examples`) y
  `examples/blockly-states/*.json` (estados Blockly bundleados por Vite).
- **Seguridad**: ver [SECURITY.md](SECURITY.md).

## Licencia

GPL-3.0-or-later
