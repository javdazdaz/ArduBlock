"""
ArduBlock — Rutas de diagnóstico de drivers USB
"""

from flask import Blueprint, jsonify

from backend.services.usb_detection import detect_driver_issues

drivers_bp = Blueprint("drivers", __name__)


@drivers_bp.route("/api/drivers")
def drivers_status():
    result = detect_driver_issues()
    return jsonify(result)
