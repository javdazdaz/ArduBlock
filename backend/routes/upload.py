"""
ArduBlock — Rutas de upload
"""

import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from flask import Blueprint, jsonify, request
from flask_login import login_required

from backend.sketch_guard import find_unsafe_include
from backend.services.arduino_cli import run_arduino_cli, try_install_missing_core
from backend.routes.projects import _write_tabs

upload_bp = Blueprint("upload", __name__)


@upload_bp.route("/api/upload", methods=["POST"])
@login_required
def upload_sketch():
    data = request.get_json()
    code = data.get("code", "") if data else ""
    port = data.get("port", "") if data else ""
    fqbn = data.get("fqbn", "arduino:avr:uno") if data else "arduino:avr:uno"
    tabs = data.get("tabs", []) if data else []

    if not code.strip():
        return jsonify({"error": "Código vacío"}), 400

    unsafe = find_unsafe_include(code, tabs)
    if unsafe:
        return jsonify({"error": f"Include no permitido: \"{unsafe}\""}), 422

    if not port:
        return (
            jsonify(
                {"error": "Puerto no especificado. Conectá el Arduino y refrescá."}
            ),
            400,
        )

    tmpdir = tempfile.mkdtemp(prefix="ardublock_")
    sketch_name = "ardublock_sketch"
    sketch_dir = Path(tmpdir) / sketch_name
    sketch_dir.mkdir()
    ino_file = sketch_dir / f"{sketch_name}.ino"

    try:
        ino_file.write_text(code)
        _write_tabs(sketch_dir, tabs)

        compile_result = run_arduino_cli(
            ["compile", "--fqbn", fqbn, str(sketch_dir)],
            capture_output=True,
            timeout=60,
        )

        if compile_result.returncode != 0 and try_install_missing_core(
            compile_result.stderr
        ):
            compile_result = run_arduino_cli(
                ["compile", "--fqbn", fqbn, str(sketch_dir)],
                capture_output=True,
                timeout=60,
            )

        if compile_result.returncode != 0:
            return jsonify(
                {
                    "success": False,
                    "stage": "compile",
                    "stdout": compile_result.stdout,
                    "stderr": compile_result.stderr,
                }
            )

        upload_result = run_arduino_cli(
            ["upload", "-p", port, "--fqbn", fqbn, str(sketch_dir)],
            capture_output=True,
            timeout=60,
        )

        return jsonify(
            {
                "success": upload_result.returncode == 0,
                "stage": "upload",
                "stdout": compile_result.stdout + "\n" + upload_result.stdout,
                "stderr": upload_result.stderr,
            }
        )
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Timeout (60s). ¿Arduino conectado?"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
