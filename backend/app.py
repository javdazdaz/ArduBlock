"""
ArduBlock Backend — Servidor Flask

Factory que crea la aplicación, registra blueprints y configura CORS.
"""

import os
import sys

_src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _src_dir not in sys.path:
    sys.path.insert(0, _src_dir)

import signal
from pathlib import Path

from flask import Flask, g, request, send_from_directory, session, redirect, url_for
from flask_login import current_user
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.config import (
    FRONTEND_DIR, TEMPLATES_DIR, HOST, PORT, SECRET_KEY, DATABASE_PATH,
    get_arduino_cli_path,
)
from backend.models import Base
from backend.messages import get_message, SUPPORTED_LANGS, DEFAULT_LANG
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
from backend.routes.auth import auth_bp, init_auth, _ensure_teacher

# ── Database ────────────────────────────────────
_engine = create_engine(f"sqlite:///{DATABASE_PATH}", echo=False)
_SessionFactory = sessionmaker(bind=_engine)


def init_db():
    """Crea las tablas si no existen."""
    Base.metadata.create_all(_engine)


def create_app() -> Flask:
    """Crea y configura la aplicación Flask."""
    init_db()
    _ensure_teacher()

    app = Flask(__name__, static_folder=None, template_folder=str(TEMPLATES_DIR))
    app.secret_key = SECRET_KEY
    app.config["WTF_CSRF_SECRET_KEY"] = os.environ.get("WTF_CSRF_KEY", SECRET_KEY)
    app.config["PROPAGATE_EXCEPTIONS"] = True

    # ── Auth ──────────────────────────────────────
    init_auth(app, _SessionFactory)

    # ── CORS ──────────────────────────────────────
    @app.after_request
    def _add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        return response

    # ── i18n (idioma vía cookie) ──────────────────
    @app.before_request
    def _detect_language():
        lang = request.cookies.get("lang", DEFAULT_LANG)
        g.lang = lang if lang in SUPPORTED_LANGS else DEFAULT_LANG

    @app.context_processor
    def _inject_i18n():
        lang = g.lang
        def _(key, **kwargs):
            return get_message(lang, key, **kwargs)
        return {"_": _, "lang": lang}

    # ── Serial manager ────────────────────────────
    serial_manager = SerialManager()
    init_serial_manager(serial_manager)

    # ── Blueprints ────────────────────────────────
    app.register_blueprint(projects_bp)
    app.register_blueprint(compile_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(serial_bp)
    app.register_blueprint(boards_bp)
    app.register_blueprint(examples_bp)
    app.register_blueprint(arduino_cli_bp)
    app.register_blueprint(drivers_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)

    # ── Rutas de frontend ────────────────────────
    @app.route("/")
    def frontpage():
        """Dashboard si está logueado, landing page si no."""
        if current_user.is_authenticated:
            return redirect(url_for("auth.dashboard"))
        return send_from_directory(str(FRONTEND_DIR), "frontpage.html")

    @app.route("/app")
    @app.route("/app/")
    def editor():
        return send_from_directory(str(FRONTEND_DIR), "index.html")

    @app.route("/<path:filename>", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
    def static_files(filename):
        if filename.startswith("admin"):
            return "", 404
        return send_from_directory(str(FRONTEND_DIR), filename)

    # ── Shutdown ─────────────────────────────────
    def _handle_shutdown(signum, frame):
        print("\n⏳ Cerrando servidor...", file=sys.stderr)
        serial_manager.close()
        sys.exit(0)

    signal.signal(signal.SIGTERM, _handle_shutdown)
    signal.signal(signal.SIGINT, _handle_shutdown)

    return app


if __name__ == "__main__":
    app = create_app()
    cli_path = get_arduino_cli_path()
    print("⚡ ArduBlock backend iniciado")
    print(f"   Host:      {HOST}:{PORT}")
    print(f"   Frontend:  {FRONTEND_DIR}")
    if cli_path:
        print(f"   arduino-cli: ✓ {cli_path}")
    else:
        print("   arduino-cli: ✕ NO ENCONTRADO")
    app.run(host=HOST, port=PORT, debug=False)
