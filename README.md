# ArduBlock

Implementación de [Blockly](https://developers.google.com/blockly) para clases de
programación escolar con Arduino. Los estudiantes construyen sketches arrastrando
bloques, ven el código C++ generado en tiempo real, y lo suben a la placa sin salir
del navegador.

## Contexto

Proyecto educativo para el diferenciado de programación. La herramienta elimina la
barrera de la sintaxis de C++ y deja que el estudiante se concentre en la lógica:
estructura de un sketch (setup/loop), pines, sensores, actuadores, variables y
control de flujo.

## Stack

Blockly v12 · Vite · Flask · arduino-cli · pyserial

## Montar el servidor

ArduBlock tiene arquitectura web: el profesor levanta un servidor en su
computadora y los estudiantes acceden desde el navegador, sin instalar nada.
Solo necesita **Node.js** y **Python 3.10 o superior**.

Para que otras computadoras de la misma red puedan entrar, usar la IP local
del servidor en vez de `localhost` (por ejemplo `http://192.168.1.20:5000`).

> Próximamente ArduBlock estará disponible en la web para uso libre, sin
> necesidad de instalar nada. Sin garantías de disponibilidad.

Todos los comandos se ejecutan dentro de la carpeta del proyecto.

### 1. Instalar dependencias del sistema

**Debian / Ubuntu**
```bash
sudo apt install nodejs npm python3 python3-venv
```
Instalar Node.js, npm (gestor de paquetes de JavaScript) y Python con soporte
para entornos virtuales.

**Arch**
```bash
sudo pacman -S nodejs npm python python-virtualenv
```
Instalar Node.js, npm y Python con la herramienta de entornos virtuales.

**Gentoo**
```bash
sudo emerge -av net-libs/nodejs dev-lang/python
```
Compilar e instalar Node.js y Python desde el código fuente.

### 2. Instalar librerías del frontend

```bash
npm install
```
Descargar Blockly y todos los plugins que usa la interfaz de bloques.

### 3. Preparar el backend

```bash
python -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
```
Crear un entorno virtual de Python, activarlo, e instalar Flask y pyserial dentro
de él. En Windows la segunda línea cambia por:
```bash
backend\.venv\Scripts\activate
```

### 4. Iniciar el servidor

```bash
./ardublock.sh start     # Enciende el servidor
./ardublock.sh stop      # Lo detiene
./ardublock.sh status    # Muestra si está funcionando
./ardublock.sh logs      # Muestra las últimas líneas de registro
```

El primer comando levanta dos servicios: Vite en el puerto 5000 (la interfaz web)
y Flask en el 5001 (el backend que habla con Arduino).

Abrir http://localhost:5000 en el navegador.

## Quemar código en la placa

Para compilar y subir sketches a un Arduino físico se necesita **arduino-cli**,
la herramienta oficial de Arduino por línea de comandos.

> ⚠️ ArduBlock solo ha sido testeado en Linux. La instalación de arduino-cli en
> Windows y Mac está documentada abajo, pero quemar código en esos sistemas
> todavía no fue verificado.

### Instalar arduino-cli

**Windows**
```powershell
winget install Arduino.arduino-cli
```
Si winget no está disponible, descargar el instalador desde
https://arduino.github.io/arduino-cli/installation/.

Algunas placas clone (CH340) requieren instalar el driver manualmente.

**Mac**
```bash
brew install arduino-cli
```
Las placas conectadas aparecen como `/dev/cu.usbmodem*`. No requiere permisos
adicionales.

**Linux**
```bash
# Debian / Ubuntu
sudo apt install arduino-cli

# Arch
sudo pacman -S arduino-cli

# Gentoo
sudo emerge -av dev-embedded/arduino-cli
```

En Linux el puerto serial tiene permisos restringidos. Para que arduino-cli
pueda hablar con la placa, agregar al usuario al grupo correspondiente y
**cerrar y volver a abrir sesión**:

| Distro | Grupo | Comando |
|--------|-------|---------|
| Debian / Ubuntu | `dialout` | `sudo gpasswd -a $USER dialout` |
| Arch | `uucp` | `sudo gpasswd -a $USER uucp` |
| Gentoo | `uucp` | `sudo gpasswd -a $USER uucp` |

## Qué puede hacer

**Validación en tiempo real.** Mientras el estudiante arma el sketch, ArduBlock
analiza los bloques y avisa de errores antes de compilar. Los bloques con error se
ponen grises — **nunca se borran** solos. El estudiante ve el problema, entiende
por qué está mal, y lo corrige.

**Generación automática de C++.** Cada cambio en los bloques genera el código
equivalente al instante. El estudiante ve la traducción directa entre bloque y
código, reforzando el aprendizaje de la sintaxis.

**Persistencia en el navegador.** Los proyectos se guardan automáticamente en
localStorage cada 2 segundos. Al volver a abrir la página, se recupera el último
proyecto. Sin backend, sin login, sin que un estudiante pueda borrar el trabajo
de otro.

**Monitor Serial integrado.** La consola muestra la salida de la placa en tiempo
real. Conectar, desconectar y elegir baud rate desde la interfaz.

**Compilar y subir a la placa.** Un solo botón: detecta la placa conectada,
compila el sketch con arduino-cli y lo sube. Todo el flujo pasa en el panel de
código, sin abrir el Arduino IDE.

## Retroalimentación al estudiante

Las reglas de validación están pensadas como ayuda pedagógica, no como
restricciones técnicas. Cada aviso le dice al estudiante **qué pasa y por qué**.

| Regla | Qué detecta | Descripción |
|-------|------------|------------|
| R1 | Dos bloques `al iniciar` | Solo puede haber un `al iniciar (setup)`. El duplicado se deshabilita. |
| R2 | Dos bloques `repetir siempre` | Solo puede haber un `repetir siempre (loop)`. El duplicado se deshabilita. |
| R3 | `iniciar Serial` fuera de setup() | `iniciar Serial` debe ir dentro de `al iniciar (setup)`. |
| R4 | Bloque suelto | El bloque no está conectado a `al iniciar` ni a `repetir siempre`. |
| R5 | `iniciar variable` dentro de loop() | La variable se redeclara en cada vuelta de `repetir siempre`. |
| R6a | Servo usado sin declarar | No hay un bloque `crear servo` con ese nombre en el sketch. |
| R6b | `crear servo` fuera de setup() | `crear servo` debe ir dentro de `al iniciar (setup)`. |
| R6c | `crear LCD/DHT/ultrasónico` fuera de setup() | Estos bloques deben ir dentro de `al iniciar (setup)`. |
| R7 | Pin usado sin `configurar pin` | El pin no fue declarado con `configurar pin` en `al iniciar (setup)`. |

## Roadmap

- [ ] **Múltiples tabs en el workspace** — soportar varias pestañas de sketches abiertas simultáneamente, como un IDE.
- [ ] **Selector de placa en la toolbar de Arduino** — dropdown para elegir modelo de placa (Uno, Nano, Mega, etc.) y que afecte compilación y pines disponibles.

## Licencia

GPL-3.0-or-later
