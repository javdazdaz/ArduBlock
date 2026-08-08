"""
ArduBlock — Rutas de compilación
"""

import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from flask import Blueprint, jsonify, request

from backend.services.arduino_cli import run_arduino_cli, try_install_missing_core
from backend.routes.projects import _write_tabs

compile_bp = Blueprint("compile", __name__)


@compile_bp.route("/api/compile", methods=["POST"])
def compile_sketch():
    data = request.get_json()
    code = data.get("code", "") if data else ""
    fqbn = data.get("fqbn", "arduino:avr:uno") if data else "arduino:avr:uno"
    tabs = data.get("tabs", []) if data else []

    if not code.strip():
        return jsonify({"error": "Código vacío"}), 400

    tmpdir = tempfile.mkdtemp(prefix="ardublock_")
    sketch_name = "ardublock_sketch"
    sketch_dir = Path(tmpdir) / sketch_name
    sketch_dir.mkdir()
    ino_file = sketch_dir / f"{sketch_name}.ino"

    try:
        ino_file.write_text(code)
        _write_tabs(sketch_dir, tabs)

        result = run_arduino_cli(
            ["compile", "--fqbn", fqbn, str(sketch_dir)],
            capture_output=True,
            timeout=60,
        )

        if result.returncode != 0 and try_install_missing_core(result.stderr):
            result = run_arduino_cli(
                ["compile", "--fqbn", fqbn, str(sketch_dir)],
                capture_output=True,
                timeout=60,
            )

        return jsonify(
            {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode,
            }
        )
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Timeout de compilación (60s)"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


@compile_bp.route("/api/compile-hex", methods=["POST"])
def compile_hex():
    data = request.get_json()
    code = data.get("code", "") if data else ""
    fqbn = data.get("fqbn", "arduino:avr:uno") if data else "arduino:avr:uno"
    tabs = data.get("tabs", []) if data else []

    if not code.strip():
        return jsonify({"error": "Código vacío"}), 400

    tmpdir = tempfile.mkdtemp(prefix="ardublock_hex_")
    sketch_name = "ardublock_sketch"
    sketch_dir = Path(tmpdir) / sketch_name
    sketch_dir.mkdir()
    ino_file = sketch_dir / f"{sketch_name}.ino"
    build_dir = Path(tmpdir) / "build"
    build_dir.mkdir()

    try:
        ino_file.write_text(code)
        _write_tabs(sketch_dir, tabs)

        result = run_arduino_cli(
            [
                "compile",
                "--fqbn",
                fqbn,
                "--output-dir",
                str(build_dir),
                str(sketch_dir),
            ],
            capture_output=True,
            timeout=60,
        )

        if result.returncode != 0 and try_install_missing_core(result.stderr):
            result = run_arduino_cli(
                [
                    "compile",
                    "--fqbn",
                    fqbn,
                    "--output-dir",
                    str(build_dir),
                    str(sketch_dir),
                ],
                capture_output=True,
                timeout=60,
            )

        if result.returncode != 0:
            return (
                jsonify(
                    {
                        "success": False,
                        "stdout": result.stdout,
                        "stderr": result.stderr,
                    }
                ),
                422,
            )

        hex_files = list(build_dir.glob("*.hex"))
        bin_files = list(build_dir.glob("*.ino.bin"))

        sketch_hex = [f for f in hex_files if ".with_bootloader." not in f.name]
        hex_files = sketch_hex or hex_files

        is_avr = ":avr:" in fqbn
        if not is_avr and bin_files:
            import base64

            bin_content = bin_files[0].read_bytes()
            return jsonify(
                {
                    "success": True,
                    "format": "bin",
                    "bin": base64.b64encode(bin_content).decode("ascii"),
                    "bin_name": bin_files[0].name,
                    "fqbn": fqbn,
                    "stdout": result.stdout,
                }
            )

        if not hex_files:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": "No se encontró .hex ni .bin en la salida de compilación",
                    }
                ),
                500,
            )

        hex_content = hex_files[0].read_text()

        return jsonify(
            {
                "success": True,
                "hex": hex_content,
                "fqbn": fqbn,
                "hex_name": hex_files[0].name,
                "stdout": result.stdout,
            }
        )

    except subprocess.TimeoutExpired:
        return jsonify({"error": "Timeout de compilación (60s)"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
