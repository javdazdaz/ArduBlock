"""
ArduBlock — Rutas de placas (listar, instalar dependencias)
"""

import json
import subprocess

from flask import Blueprint, jsonify, request
from flask_login import login_required

from backend.config import CHIP_BOARD_MAP, SUPPORTED_FQBNS
from backend.services.arduino_cli import run_arduino_cli, install_board_deps
from backend.services.usb_detection import extract_vid_pid, is_fake_serial_port

boards_bp = Blueprint("boards", __name__)


@boards_bp.route("/api/boards")
def list_boards():
    try:
        result = run_arduino_cli(
            ["board", "list", "--format", "json"], capture_output=True, timeout=10
        )
        if result.returncode != 0:
            return jsonify({"error": result.stderr}), 500

        data = json.loads(result.stdout)

        # Filtrar puertos falsos
        data["detected_ports"] = [
            p
            for p in data.get("detected_ports", [])
            if not is_fake_serial_port(p.get("port", {}).get("address", ""))
        ]

        # Enriquecer puertos no identificados con sugerencias
        for entry in data.get("detected_ports", []):
            port_info = entry.get("port", {})
            matching = entry.get("matching_boards", [])

            if not matching:
                vid, pid = extract_vid_pid(port_info)
                chip_map = CHIP_BOARD_MAP.get((vid, pid)) if vid and pid else None
                if chip_map:
                    entry["suggested_fqbn"] = chip_map["suggested_fqbn"]
                    entry["compatible_fqbns"] = chip_map["compatible_fqbns"]
                    entry["chip_label"] = chip_map["label"]

        return jsonify(data)
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Timeout buscando placas"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@boards_bp.route("/api/board/install", methods=["POST"])
@login_required
def board_install():
    data = request.get_json() or {}
    fqbn = data.get("fqbn", "arduino:avr:uno")
    if fqbn not in SUPPORTED_FQBNS:
        return jsonify({"error": "Placa no soportada"}), 422
    result = install_board_deps(fqbn)
    return jsonify(result)
