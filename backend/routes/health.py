"""
ArduBlock — Health check + Session info
"""

from flask import Blueprint, jsonify
from flask_login import current_user

from backend.config import get_arduino_cli_path

health_bp = Blueprint("health", __name__)


@health_bp.route("/api/health")
def health():
    cli_path = get_arduino_cli_path()
    return jsonify({
        "status": "ok",
        "app": "ArduBlock",
        "arduino_cli": {
            "available": cli_path is not None,
            "path": cli_path,
        },
    })


@health_bp.route("/api/session")
def session_info():
    """Devuelve info de la sesión actual (Flask-Login)."""
    if current_user.is_authenticated:
        return jsonify({
            "authenticated": True,
            "user_name": current_user.name,
            "email": current_user.email,
            "is_teacher": current_user.is_teacher,
        })
    return jsonify({
        "authenticated": False,
        "user_name": "",
        "is_teacher": False,
    })
