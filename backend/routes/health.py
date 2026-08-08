"""
ArduBlock — Health check
"""

from flask import Blueprint, jsonify

from backend.config import get_arduino_cli_path

health_bp = Blueprint("health", __name__)


@health_bp.route("/api/health")
def health():
    cli_path = get_arduino_cli_path()
    available = cli_path is not None
    return jsonify(
        {
            "status": "ok",
            "app": "ArduBlock",
            "arduino_cli": {
                "available": available,
                "path": cli_path,
            },
        }
    )
