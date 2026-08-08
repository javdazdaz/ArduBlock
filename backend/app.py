"""
ArduBlock Backend — Servidor Flask

Factory que crea la aplicación, registra blueprints y configura CORS.
El script de servicio (ardublock.sh) corre este archivo directamente.
"""

import os
import sys

# Asegurar que el directorio padre (raíz del proyecto) esté en sys.path
# para que los imports 'from backend.xxx' funcionen al ejecutar desde backend/
_src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _src_dir not in sys.path:
    sys.path.insert(0, _src_dir)

import signal
from pathlib import Path

from flask import Flask, send_from_directory

from backend.config import FRONTEND_DIR, HOST, PORT, get_arduino_cli_path
from backend.services.serial_manager import SerialManager

# ── Blueprints ──────────────────────────────────
from backend.routes.projects import projects_bp
from backend.routes.compile import compile_bp
from backend.routes.upload import upload_bp
from backend.routes.serial import serial_bp, init_serial_manager
from backend.routes.boards import boards_bp
from backend.routes.examples import examples_bp
from backend.routes.arduino_cli import arduino_cli_bp
from backend.routes.drivers import drivers_bp
from backend.routes.health import health_bp


def create_app() -> Flask:
    """Crea y configura la aplicación Flask."""
    app = Flask(__name__, static_folder=None)
    app.config["PROPAGATE_EXCEPTIONS"] = True

    # ── CORS manual ──────────────────────────────
    @app.after_request
    def _add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        return response

    # ── Serial manager ────────────────────────────
    serial_manager = SerialManager()
    init_serial_manager(serial_manager)

    # ── Registrar blueprints ──────────────────────
    app.register_blueprint(projects_bp)
    app.register_blueprint(compile_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(serial_bp)
    app.register_blueprint(boards_bp)
    app.register_blueprint(examples_bp)
    app.register_blueprint(arduino_cli_bp)
    app.register_blueprint(drivers_bp)
    app.register_blueprint(health_bp)

    # ── Rutas del frontend estático ───────────────
    @app.route("/")
    def index():
        return send_from_directory(str(FRONTEND_DIR), "index.html")

    @app.route("/<path:filename>")
    def static_files(filename):
        return send_from_directory(str(FRONTEND_DIR), filename)

    # ── Graceful shutdown ─────────────────────────
    def _handle_shutdown(signum, frame):
        print("\n⏳ Recibida señal de parada. Cerrando servidor...", file=sys.stderr)
        serial_manager.close()
        sys.exit(0)

    signal.signal(signal.SIGTERM, _handle_shutdown)
    signal.signal(signal.SIGINT, _handle_shutdown)

    return app


# ── Main ────────────────────────────────────────

if __name__ == "__main__":
    app = create_app()

    cli_path = get_arduino_cli_path()
    cli_ok = cli_path is not None

    print("⚡ ArduBlock backend iniciado")
    print(f"   Host:      {HOST}:{PORT}")
    print(f"   Frontend:  {FRONTEND_DIR}")
    if cli_ok:
        print(f"   arduino-cli: ✓ {cli_path}")
    else:
        print("   arduino-cli: ✕ NO ENCONTRADO (compilar/subir requiere arduino-cli)")

    app.run(host=HOST, port=PORT, debug=False)
