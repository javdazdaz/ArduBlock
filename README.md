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

## Licencia

ISC
