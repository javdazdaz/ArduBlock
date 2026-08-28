"""
ArduBlock Backend — Servidor Flask

Factory que crea la aplicación, registra blueprints y configura CORS.
"""

import os
import sys
import json

_src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _src_dir not in sys.path:
    sys.path.insert(0, _src_dir)

import signal
from pathlib import Path

from flask import Flask, g, request, send_from_directory, session, redirect, url_for, Response, jsonify
from flask_wtf.csrf import CSRFProtect, generate_csrf
from flask_login import current_user
from werkzeug.middleware.proxy_fix import ProxyFix
from backend import compile_queue
from backend.config import (
    FRONTEND_DIR, TEMPLATES_DIR, HOST, PORT, SECRET_KEY,
    get_arduino_cli_path, IS_PRODUCTION,
)
from backend.db import SessionFactory, init_db
from backend.models import ProjectFile, Project
from backend.project_permissions import project_access
from backend.messages import get_message, SUPPORTED_LANGS, DEFAULT_LANG
from backend.services.serial_manager import SerialManager
from flask_sock import Sock
from backend.collaboration import broker

# ── Blueprints ──────────────────────────────────
from backend.routes.projects import projects_bp
from backend.routes.compile import compile_bp
from backend.routes.upload import upload_bp
from backend.routes.serial import serial_bp, init_serial_manager
from backend.routes.boards import boards_bp
from backend.routes.examples import examples_bp
from backend.routes.web_presets import web_presets_bp
from backend.routes.arduino_cli import arduino_cli_bp
from backend.routes.drivers import drivers_bp
from backend.routes.health import health_bp
from backend.routes.auth import auth_bp, init_auth, _ensure_teacher

# ── Database ────────────────────────────────────
# Engine + SessionFactory únicos en backend/db.py (antes se duplicaban
# en app.py, auth.py y projects.py).


def create_app() -> Flask:
    """Crea y configura la aplicación Flask."""
    init_db()
    _ensure_teacher()

    app = Flask(__name__, static_folder=None, template_folder=str(TEMPLATES_DIR))
    sock = Sock(app)
    app.secret_key = SECRET_KEY
    if IS_PRODUCTION:
        # Caddy es el único proxy confiable del despliegue actual. Esto hace
        # que el rate limiter vea la IP del cliente, no la de Caddy.
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
    csrf = CSRFProtect(app)
    # Hardening de la cookie de sesión: HttpOnly, SameSite=Lax y (en producción)
    # Secure para que solo viaje por HTTPS.
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
    app.config["SESSION_COOKIE_SECURE"] = bool(os.environ.get("ARDUBLOCK_PRODUCTION"))
    app.config["WTF_CSRF_SECRET_KEY"] = os.environ.get("WTF_CSRF_KEY", SECRET_KEY)
    app.config["PROPAGATE_EXCEPTIONS"] = True

    # ── Auth ──────────────────────────────────────
    init_auth(app, SessionFactory)

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
    # En producción el servidor solo compila. El USB se maneja en el
    # navegador mediante Web Serial; nunca se exponen puertos del host.
    if not IS_PRODUCTION:
        app.register_blueprint(upload_bp)
        app.register_blueprint(serial_bp)
        app.register_blueprint(boards_bp)
        csrf.exempt(upload_bp)
        csrf.exempt(serial_bp)
    app.register_blueprint(examples_bp)
    app.register_blueprint(web_presets_bp)
    if not IS_PRODUCTION:
        app.register_blueprint(arduino_cli_bp)
    app.register_blueprint(drivers_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)

    @sock.route("/ws/projects/<int:project_id>/files/<int:file_id>")
    def collaboration_socket(ws, project_id, file_id):
        """Transport efímero de presencia; las operaciones siguen siendo HTTP."""
        if not current_user.is_authenticated:
            return
        session_db = SessionFactory()
        try:
            file = session_db.get(ProjectFile, file_id)
            access = project_access(session_db, project_id, current_user.id)
        finally:
            session_db.close()
        if not file or file.project_id != project_id or not access:
            return
        client_id = request.args.get("client_id", "")
        if not client_id or len(client_id) > 100:
            return
        peer = broker.join(project_id, file_id, client_id, current_user.id,
                           getattr(current_user, "name", None) or current_user.email, ws)
        try:
            peers = [{**p, "avatar_url": f"/api/projects/{project_id}/avatar/{p['user_id']}"}
                     for p in broker.presence(project_id, file_id)]
            ws.send(json.dumps({"type": "presence", "peers": peers}))
            broker.broadcast(project_id, file_id, {
                "type": "presence",
                "event": "join",
                "peer": {"connection_id": peer.connection_id, "client_id": peer.client_id,
                         "user_id": peer.user_id, "display_name": peer.display_name,
                         "avatar_url": f"/api/projects/{project_id}/avatar/{peer.user_id}"},
            }, exclude=peer.connection_id)
            while True:
                raw = ws.receive()
                if raw is None:
                    break
                message = json.loads(raw)
                if message.get("type") == "presence":
                    broker.broadcast(project_id, file_id, {
                        "type": "presence", "event": "update",
                        "peer": {"connection_id": peer.connection_id, "client_id": peer.client_id,
                                 "user_id": peer.user_id, "display_name": peer.display_name,
                                 "cursor": message.get("cursor"), "selection": message.get("selection"),
                                 "avatar_url": f"/api/projects/{project_id}/avatar/{peer.user_id}"},
                    }, exclude=peer.connection_id)
        except (ValueError, TypeError, json.JSONDecodeError):
            pass
        finally:
            broker.leave(project_id, file_id, peer.connection_id)
            broker.broadcast(project_id, file_id, {
                "type": "presence", "event": "leave", "connection_id": peer.connection_id,
            })

    @sock.route("/ws/projects/<int:project_id>/blocks")
    def block_collaboration_socket(ws, project_id):
        """Transport efímero del workspace Blockly."""
        if not current_user.is_authenticated:
            return
        session_db = SessionFactory()
        try:
            access = project_access(session_db, project_id, current_user.id)
        finally:
            session_db.close()
        if not access:
            return
        client_id = request.args.get("client_id", "")
        if not client_id or len(client_id) > 100:
            return
        peer = broker.join(project_id, 0, client_id, current_user.id,
                           getattr(current_user, "name", None) or current_user.email, ws)
        try:
            peers = [{**p, "avatar_url": f"/api/projects/{project_id}/avatar/{p['user_id']}"}
                     for p in broker.presence(project_id, 0)]
            ws.send(json.dumps({"type": "presence", "peers": peers}))
            while True:
                raw = ws.receive()
                if raw is None:
                    break
                message = json.loads(raw)
                if message.get("type") == "presence":
                    broker.broadcast(project_id, 0, {
                        "type": "presence", "event": "update",
                        "peer": {"connection_id": peer.connection_id, "client_id": peer.client_id,
                                 "user_id": peer.user_id, "display_name": peer.display_name,
                                 "avatar_url": f"/api/projects/{project_id}/avatar/{peer.user_id}",
                                 "selected_block": message.get("selected_block")},
                    }, exclude=peer.connection_id)
        except (ValueError, TypeError, json.JSONDecodeError):
            pass
        finally:
            broker.leave(project_id, 0, peer.connection_id)

    # La compilación pública no muta sesión ni datos persistentes.
    csrf.exempt(compile_bp)

    @app.route("/api/csrf-token")
    def csrf_token():
        return jsonify({"csrf_token": generate_csrf()})

    # ── Rutas de frontend ────────────────────────
    @app.route("/")
    def frontpage():
        """Dashboard si está logueado, landing page si no."""
        if current_user.is_authenticated:
            return redirect(url_for("auth.dashboard"))
        return send_from_directory(str(FRONTEND_DIR), "frontpage.html")

    # ── SEO: robots.txt y sitemap ─────────────────
    _SITE_URL = "https://ardublock.matemancia.net"

    @app.route("/robots.txt")
    def robots_txt():
        body = (
            "User-agent: *\n"
            "Allow: /\n"
            "Disallow: /api/\n"
            "Disallow: /login\n"
            "Disallow: /register\n"
            "Disallow: /reset\n"
            "Disallow: /teacher\n"
            "Disallow: /student\n"
            "\n"
            f"Sitemap: {_SITE_URL}/sitemap.xml\n"
        )
        return Response(body, mimetype="text/plain")

    @app.route("/sitemap.xml")
    def sitemap_xml():
        xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>{_SITE_URL}/</loc>
    <lastmod>2026-08-13</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>"""
        return Response(xml, mimetype="application/xml")

    @app.route("/app")
    @app.route("/app/")
    @app.route("/project/new")
    @app.route("/project/new/")
    @app.route("/project/new/class/<int:class_id>")
    @app.route("/project/<int:project_id>")
    @app.route("/project/<int:project_id>/edit")
    @app.route("/project/<int:project_id>/view")
    @app.route("/project/<int:project_id>/reference")
    def editor(project_id=None, class_id=None):
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
        compile_queue.shutdown()
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
    app.run(host=HOST, port=PORT, debug=False, threaded=True)
