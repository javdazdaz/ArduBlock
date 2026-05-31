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

## Instalación

Funciona en **Windows, Mac y Linux**. Solo necesitás Node.js y Python.

### Frontend

```bash
npm install
```

### Backend

```bash
python -m venv backend/.venv
source backend/.venv/bin/activate   # en Windows: backend\.venv\Scripts\activate
pip install -r backend/requirements.txt
```

### Arduino CLI

Instalá [arduino-cli](https://arduino.github.io/arduino-cli/) y asegurate de que
esté en el PATH. En Linux, agregá tu usuario al grupo `uucp` para acceder al
puerto serial:

```bash
sudo gpasswd -a $USER uucp
```

## Uso

```bash
./ardublock.sh start     # Inicia Vite (:5000) + Flask (:5001)
./ardublock.sh stop      # Detiene ambos servicios
./ardublock.sh status    # Estado y health check
./ardublock.sh logs      # Últimas líneas de log
```

Abrí http://localhost:5000 en el navegador. Los estudiantes no necesitan instalar
nada más — todo corre en local.

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

| Regla | Qué detecta | Qué ve el estudiante |
|-------|------------|---------------------|
| R1 | Dos bloques `al iniciar` | "Solo puede haber un setup(). El de más queda gris." |
| R2 | Dos bloques `repetir siempre` | "Solo puede haber un loop(). El de más queda gris." |
| R3 | `iniciar Serial` fuera de setup() | "Serial.begin() va dentro de setup(), no acá." |
| R4 | Bloque suelto (fuera de setup/loop) | "Este bloque no está conectado a nada." |
| R5 | `iniciar variable` dentro de loop() | "Esta variable se reinicia en cada vuelta del loop." |
| R6a | Usar un servo sin declararlo | "El servo 'nombre' no está creado. Usá 'crear servo' primero." |
| R6b | `crear servo` fuera de setup() | "El servo debe crearse dentro de setup()." |
| R6c | `crear LCD/DHT/ultrasónico` fuera de setup() | "Este bloque va dentro de setup()." |
| R7 | Usar un pin sin `configurar pin` | "El pin 13 no está configurado. Agregá 'configurar pin' en setup()." |

## Licencia

GPL-3.0-or-later
