"""
ArduBlock — Rutas de compilación (asíncronas: submit + polling).

POST /api/compile       → encola y devuelve {job_id, status: "queued"} (202)
GET  /api/compile/<id>  → {status, result}
POST /api/compile-hex   → ídem para .hex/.bin
GET  /api/compile-hex/<id> → ídem

El trabajo pesado (escribir sketch + arduino-cli) corre en un worker de la
cola (backend/compile_queue.py); el request HTTP vuelve enseguida.
"""

import base64
import shutil
import subprocess
import tempfile
from pathlib import Path

from flask import Blueprint, jsonify, request

from backend import compile_queue
from backend.rate_limit import rate_limit
from backend.sketch_guard import find_unsafe_include
from backend.services.arduino_cli import run_arduino_cli
from backend.routes.projects import _write_tabs
from backend.payload_validation import validate_compile_payload

compile_bp = Blueprint("compile", __name__)


def _parse_payload():
    data = request.get_json()
    code = data.get("code", "") if data else ""
    fqbn = data.get("fqbn", "arduino:avr:uno") if data else "arduino:avr:uno"
    tabs = data.get("tabs", []) if data else []
    return code, fqbn, tabs


def _write_sketch(tmpdir: str, code: str, tabs: list) -> Path:
    sketch_name = "ardublock_sketch"
    sketch_dir = Path(tmpdir) / sketch_name
    sketch_dir.mkdir()
    (sketch_dir / f"{sketch_name}.ino").write_text(code)
    _write_tabs(sketch_dir, tabs)
    return sketch_dir


def _do_compile(code: str, fqbn: str, tabs: list) -> dict:
    """Compila (verifica) y devuelve el dict de resultado. Corre en un worker."""
    tmpdir = tempfile.mkdtemp(prefix="ardublock_")
    try:
        sketch_dir = _write_sketch(tmpdir, code, tabs)
        result = run_arduino_cli(
            ["compile", "--fqbn", fqbn, str(sketch_dir)],
            capture_output=True,
            timeout=60,
        )
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Timeout de compilación (60s)"}
    except Exception as e:  # noqa: BLE001 — el resultado viaja al cliente
        return {"success": False, "error": str(e)}
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def _do_compile_hex(code: str, fqbn: str, tabs: list) -> dict:
    """Compila y devuelve .hex/.bin. Corre en un worker."""
    tmpdir = tempfile.mkdtemp(prefix="ardublock_hex_")
    try:
        sketch_dir = _write_sketch(tmpdir, code, tabs)
        build_dir = Path(tmpdir) / "build"
        build_dir.mkdir()

        compile_args = [
            "compile",
            "--fqbn",
            fqbn,
            "--output-dir",
            str(build_dir),
            str(sketch_dir),
        ]
        result = run_arduino_cli(compile_args, capture_output=True, timeout=60)
        if result.returncode != 0:
            return {
                "success": False,
                "stdout": result.stdout,
                "stderr": result.stderr,
            }

        hex_files = list(build_dir.glob("*.hex"))
        bin_files = list(build_dir.glob("*.ino.bin"))
        sketch_hex = [f for f in hex_files if ".with_bootloader." not in f.name]
        hex_files = sketch_hex or hex_files

        if ":avr:" not in fqbn and bin_files:
            bin_content = bin_files[0].read_bytes()
            return {
                "success": True,
                "format": "bin",
                "bin": base64.b64encode(bin_content).decode("ascii"),
                "bin_name": bin_files[0].name,
                "fqbn": fqbn,
                "stdout": result.stdout,
            }

        if not hex_files:
            return {
                "success": False,
                "error": "No se encontró .hex ni .bin en la salida de compilación",
            }

        hex_content = hex_files[0].read_text()
        return {
            "success": True,
            "hex": hex_content,
            "fqbn": fqbn,
            "hex_name": hex_files[0].name,
            "stdout": result.stdout,
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Timeout de compilación (60s)"}
    except Exception as e:  # noqa: BLE001
        return {"success": False, "error": str(e)}
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


@compile_bp.route("/api/compile", methods=["POST"])
@rate_limit(30, 300)
def compile_sketch():
    code, fqbn, tabs = _parse_payload()
    if not code.strip():
        return jsonify({"error": "Código vacío"}), 400
    invalid = validate_compile_payload(fqbn, tabs)
    if invalid:
        return jsonify({"error": invalid}), 422
    unsafe = find_unsafe_include(code, tabs)
    if unsafe:
        return jsonify({"error": f"Include no permitido: \"{unsafe}\""}), 422
    try:
        job_id = compile_queue.submit(lambda: _do_compile(code, fqbn, tabs))
    except compile_queue.QueueFullError:
        return jsonify({"error": "Cola de compilación llena, intentá de nuevo"}), 503
    return jsonify({"job_id": job_id, "status": "queued"}), 202


@compile_bp.route("/api/compile/<job_id>", methods=["GET"])
def compile_status(job_id):
    job = compile_queue.get(job_id)
    if job is None:
        return jsonify({"error": "Job no encontrado"}), 404
    return jsonify({"status": job["status"], "result": job["result"]})


@compile_bp.route("/api/compile-hex", methods=["POST"])
@rate_limit(30, 300)
def compile_hex():
    code, fqbn, tabs = _parse_payload()
    if not code.strip():
        return jsonify({"error": "Código vacío"}), 400
    invalid = validate_compile_payload(fqbn, tabs)
    if invalid:
        return jsonify({"error": invalid}), 422
    unsafe = find_unsafe_include(code, tabs)
    if unsafe:
        return jsonify({"error": f"Include no permitido: \"{unsafe}\""}), 422
    try:
        job_id = compile_queue.submit(lambda: _do_compile_hex(code, fqbn, tabs))
    except compile_queue.QueueFullError:
        return jsonify({"error": "Cola de compilación llena, intentá de nuevo"}), 503
    return jsonify({"job_id": job_id, "status": "queued"}), 202


@compile_bp.route("/api/compile-hex/<job_id>", methods=["GET"])
def compile_hex_status(job_id):
    job = compile_queue.get(job_id)
    if job is None:
        return jsonify({"error": "Job no encontrado"}), 404
    return jsonify({"status": job["status"], "result": job["result"]})
