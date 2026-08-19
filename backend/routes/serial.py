"""
ArduBlock — Rutas del monitor serial
"""

import json

from flask import Blueprint, jsonify, request

from backend.rate_limit import rate_limit
from backend.services.arduino_cli import run_arduino_cli
from backend.services.serial_manager import SerialManager
from backend.services.usb_detection import is_fake_serial_port

serial_bp = Blueprint("serial", __name__)

# Instancia compartida — se inyecta desde app.py
_serial_manager: SerialManager | None = None


def init_serial_manager(sm: SerialManager) -> None:
    global _serial_manager
    _serial_manager = sm


@serial_bp.route("/api/serial/open", methods=["POST"])
@rate_limit(30, 300)
def serial_open():
    sm = _serial_manager
    if sm is None:
        return jsonify({"error": "SerialManager no inicializado"}), 500

    if sm.running:
        return jsonify(
            {
                "status": "ok",
                "message": "Ya conectado",
                "port": sm.port.port if sm.port else "?",
                "baud": sm.port.baudrate if sm.port else 0,
            }
        )

    data = request.get_json() or {}
    port = data.get("port", "")
    baud = int(data.get("baud", 9600))

    if not port:
        try:
            result = run_arduino_cli(
                ["board", "list", "--format", "json"], capture_output=True, timeout=10
            )
            try:
                boards = json.loads(result.stdout)
            except json.JSONDecodeError:
                return (
                    jsonify(
                        {
                            "error": "No se pudo interpretar la salida de arduino-cli. ¿Está instalado?"
                        }
                    ),
                    500,
                )
            ports = boards.get("detected_ports", [])
            if ports:
                port = ports[0]["port"]["address"]
            else:
                return jsonify({"error": "No se detectó ningún Arduino"}), 400
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    try:
        sm.open(port, baud)
        return jsonify({"status": "ok", "port": port, "baud": baud})
    except Exception as e:
        return jsonify({"error": f"No se pudo abrir {port}: {str(e)}"}), 500


@serial_bp.route("/api/serial/read")
def serial_read():
    sm = _serial_manager
    if sm is None:
        return jsonify({"connected": False, "data": ""})

    if not sm.running:
        return jsonify({"connected": False, "data": ""})

    data = sm.read_buffer()
    return jsonify({"connected": True, "data": data})


@serial_bp.route("/api/serial/write", methods=["POST"])
@rate_limit(30, 300)
def serial_write():
    sm = _serial_manager
    if sm is None or not sm.running:
        return jsonify({"error": "No conectado"}), 400
    data = request.get_json()
    text = data.get("data", "") if data else ""
    if not text:
        return jsonify({"error": "Sin datos"}), 400
    try:
        nbytes = sm.write(text)
        return jsonify({"status": "ok", "bytes": nbytes})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@serial_bp.route("/api/serial/close", methods=["POST"])
@rate_limit(30, 300)
def serial_close():
    sm = _serial_manager
    if sm is None:
        return jsonify({"error": "SerialManager no inicializado"}), 500
    sm.close()
    return jsonify({"status": "ok"})


@serial_bp.route("/api/serial/status")
def serial_status():
    sm = _serial_manager
    if sm is None:
        return jsonify({"connected": False})
    return jsonify(sm.status())
