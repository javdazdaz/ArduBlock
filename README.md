# ArduBlock

Programación visual para Arduino mediante bloques. Genera código C++ listo para compilar y subir a la placa.

## Contexto

Proyecto de uso educativo para las clases del diferenciado de programación. Los estudiantes construyen sketches de Arduino arrastrando bloques sin necesidad de escribir código textual, familiarizándose con la lógica de programación embebida (setup/loop, pines, sensores, actuadores).

## Stack

| Capa | Tecnología |
|------|-----------|
| Bloques | Blockly v12.5.1 |
| Frontend | Vite + ES Modules |
| Backend | Flask (Python 3.12) |
| Toolchain | arduino-cli |
| Serial | pyserial |

## Requisitos

- Node.js ≥ 20
- Python ≥ 3.10
- arduino-cli (en PATH)
- Permisos de puerto serial (`gpasswd -a $USER uucp` en Gentoo)

## Instalación

```bash
# Frontend
npm install

# Backend
python -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
```

## Uso

```bash
./ardublock.sh start     # Inicia Vite (:5000) + Flask (:5001)
./ardublock.sh stop      # Detiene ambos servicios
./ardublock.sh status    # Estado, health check, uptime
./ardublock.sh logs      # Últimas 50 líneas de log
```

Abrir http://localhost:5000 en el navegador.

## Validación en tiempo real

ArduBlock analiza tu sketch mientras trabajás y te avisa de errores antes de compilar. **Nunca borra tus bloques**: si hay un error, los bloques se ponen grises para que veas el problema y lo corrijas vos.

| # | Regla | Severidad |
|---|-------|-----------|
| R1 | Solo un `al iniciar (setup)` | 🔴 Error — bloques grises |
| R2 | Solo un `repetir siempre (loop)` | 🔴 Error — bloques grises |
| R3 | `iniciar Serial` dentro de setup() | 🟡 Warning |
| R6a | Servo debe declararse antes de usarse | 🔴 Error |
| R6b | `crear servo` dentro de setup() | 🔴 Error |
| R6c | LCD, DHT, ultrasónico dentro de setup() | 🔴 Error |
| R7 | Todo pin con `configurar pin` en setup() | 🟡 Warning |

Guía completa en `docs/PUBLICO.md`.

## Licencia

ISC
