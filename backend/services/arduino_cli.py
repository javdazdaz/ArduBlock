"""
ArduBlock — Servicio arduino-cli

Ejecución de comandos, auto-instalación de cores, consulta de cores/libs instalados.
"""

import json
import os
import re
import resource
import shutil
import subprocess
import sys
import tempfile
import threading
from pathlib import Path
from typing import Any

from backend.config import (
    get_arduino_cli_path,
    BOARD_DEPS,
)


# ── Control de recursos del compilador (Fase A anti-OOM/fork-bomb) ──

# Concurrencia máxima de arduino-cli (mismo env que la cola de compilación).
_ARDUINO_CLI_MAX_CONCURRENT = max(
    1, int(os.environ.get("ARDUBLOCK_COMPILE_WORKERS", "2"))
)
_ARDUINO_CLI_SEMAPHORE = threading.Semaphore(_ARDUINO_CLI_MAX_CONCURRENT)

# Tope de memoria por invocación (ARDUBLOCK_COMPILE_MEMORY_MB, default 1024 MiB).
_ARDUINO_CLI_MEM_BYTES = (
    max(128, int(os.environ.get("ARDUBLOCK_COMPILE_MEMORY_MB", "1024"))) * 1024 * 1024
)

# Límites heredados por arduino-cli y sus hijos (avr-gcc, cc1plus, ...).
_ARDUINO_CLI_LIMITS = (
    (resource.RLIMIT_AS, (_ARDUINO_CLI_MEM_BYTES, _ARDUINO_CLI_MEM_BYTES)),
    (resource.RLIMIT_CPU, (60, 60)),  # 60 s de CPU
    (resource.RLIMIT_FSIZE, (256 * 1024 * 1024, 256 * 1024 * 1024)),  # 256 MB
    (resource.RLIMIT_NPROC, (64, 64)),
)


def _set_rlimits():
    """preexec_fn: aplica los límites en el hijo antes del exec (POSIX)."""
    for res, limits in _ARDUINO_CLI_LIMITS:
        try:
            resource.setrlimit(res, limits)
        except (ValueError, OSError):
            pass


# ── Sandbox del compilador (Fase B: aísla la lectura de archivos del host) ──

_ARDUINO_DATA_DIR = os.environ.get("ARDUINO_DATA_DIR") or str(
    Path.home() / ".arduino15"
)

_BWRAP = shutil.which("bwrap")
if _BWRAP:
    # Self-test: si bwrap/userns no funciona, se desactiva (fallback a Fase A).
    try:
        _probe = subprocess.run(
            [
                _BWRAP,
                "--unshare-all",
                "--dev", "/dev",
                "--proc", "/proc",
                "--ro-bind", "/usr", "/usr",
                "--symlink", "usr/lib", "/lib",
                "--symlink", "usr/lib64", "/lib64",
                "--", "/usr/bin/true",
            ],
            capture_output=True,
            timeout=10,
        )
        if _probe.returncode != 0:
            _BWRAP = None
    except Exception:
        _BWRAP = None


def _sandboxed_compile(cmd: list[str]):
    """Envuelve ``arduino-cli compile`` en bwrap. Devuelve (argv, scratch_dir).

    El sandbox ve solo: /usr (ro, libs de avr-gcc), el binario arduino-cli (ro),
    un data-dir scratch (packages/ e índices en ro) y el directorio del sketch.
    Sin /etc, /opt, /root, /home ni red.
    """
    args = cmd[1:]
    sketch_dir = os.path.abspath(args[-1])
    sketch_parent = os.path.dirname(sketch_dir)

    output_dir = None
    if "--output-dir" in args:
        i = args.index("--output-dir")
        if i + 1 < len(args):
            output_dir = os.path.abspath(args[i + 1])

    cli_path = cmd[0]
    scratch = tempfile.mkdtemp(prefix="ardublock_data_")
    os.makedirs(os.path.join(scratch, "packages"), exist_ok=True)

    bwrap = [
        _BWRAP,
        "--die-with-parent",
        "--unshare-all",
        "--new-session",
        "--dev", "/dev",
        "--proc", "/proc",
        "--ro-bind", "/usr", "/usr",
        "--symlink", "usr/lib", "/lib",
        "--symlink", "usr/lib64", "/lib64",
        "--ro-bind", cli_path, cli_path,
        "--bind", scratch, scratch,
        "--bind", sketch_parent, sketch_parent,
    ]

    packages_dir = os.path.join(_ARDUINO_DATA_DIR, "packages")
    if os.path.isdir(packages_dir):
        bwrap += ["--ro-bind", packages_dir, os.path.join(scratch, "packages")]
    for name in ("inventory.yaml", "package_index.json", "library_index.json"):
        p = os.path.join(_ARDUINO_DATA_DIR, name)
        if os.path.isfile(p):
            bwrap += ["--ro-bind", p, os.path.join(scratch, name)]

    if output_dir:
        bwrap += ["--bind", output_dir, output_dir]

    bwrap += [
        "--setenv", "ARDUINO_DATA_DIR", scratch,
        "--setenv", "HOME", scratch,
        "--chdir", sketch_parent,
    ] + cmd

    return bwrap, scratch


def run_arduino_cli(
    args: list[str], **kwargs: Any
) -> subprocess.CompletedProcess:
    """Ejecuta arduino-cli usando la ruta resuelta.

    Lanza FileNotFoundError con mensaje descriptivo si no está instalado.
    Las compilaciones se ejecutan en un sandbox bwrap (Fase B) cuando está
    disponible.
    """
    cli_path = get_arduino_cli_path()
    if not cli_path or not os.path.isfile(cli_path):
        raise FileNotFoundError(
            "arduino-cli no encontrado. Instálalo desde "
            "https://arduino.github.io/arduino-cli/installation/ "
            "y asegurate de que esté en el PATH."
        )
    cmd = [cli_path] + list(args)
    if sys.platform == "win32":
        kwargs.setdefault("encoding", "utf-8")
        kwargs.setdefault("errors", "replace")
    if "text" not in kwargs and "encoding" not in kwargs:
        kwargs["text"] = True
    # Límites de recursos en el subprocess (solo POSIX).
    if sys.platform != "win32" and "preexec_fn" not in kwargs:
        kwargs["preexec_fn"] = _set_rlimits

    scratch_dir = None
    if _BWRAP and args and args[0] == "compile" and os.path.isdir(_ARDUINO_DATA_DIR):
        try:
            cmd, scratch_dir = _sandboxed_compile(cmd)
        except Exception:
            scratch_dir = None  # fallback: compilar sin sandbox

    _ARDUINO_CLI_SEMAPHORE.acquire()
    try:
        return subprocess.run(cmd, **kwargs)
    finally:
        _ARDUINO_CLI_SEMAPHORE.release()
        if scratch_dir:
            shutil.rmtree(scratch_dir, ignore_errors=True)


def try_install_missing_core(stderr_text: str) -> bool:
    """Intenta instalar un core faltante a partir del mensaje de error de arduino-cli.

    Reconoce mensajes como:
      "Error during build: Platform 'arduino:avr' not found: platform not installed"
      "Invalid FQBN: board arduino:renesas_uno:wifi not found"
    """
    # Caso 1: "Platform 'arduino:avr' not found"
    m = re.search(r"Platform '([^']+)' not found", stderr_text)
    if m:
        core_id = m.group(1)
        try:
            run_arduino_cli(
                ["core", "install", core_id], capture_output=True, timeout=120
            )
            return True
        except Exception:
            return False

    # Caso 2: "Invalid FQBN: board arduino:renesas_uno:wifi not found"
    m = re.search(r"board (\S+) not found", stderr_text)
    if m:
        fqbn = m.group(1)
        parts = fqbn.split(":")
        if len(parts) >= 2:
            core_id = f"{parts[0]}:{parts[1]}"
            try:
                run_arduino_cli(
                    ["core", "install", core_id], capture_output=True, timeout=120
                )
                return True
            except Exception:
                return False

    # Caso 3: "platform not installed" (genérico)
    if "platform not installed" in stderr_text.lower():
        return False

    return False


def get_installed_cores() -> set[str]:
    """Devuelve un set con los IDs de cores instalados (ej: 'arduino:renesas_uno')."""
    try:
        r = run_arduino_cli(
            ["core", "list", "--format", "json"], capture_output=True, timeout=15
        )
        data = json.loads(r.stdout)
        platforms = data.get("platforms", data) if isinstance(data, dict) else data
        items = platforms if isinstance(platforms, list) else []
        return {item["id"] for item in items if isinstance(item, dict) and item.get("id")}
    except Exception:
        return set()


def get_installed_libs() -> set[str]:
    """Devuelve un set con los nombres de librerías instaladas."""
    try:
        r = run_arduino_cli(
            ["lib", "list", "--format", "json"], capture_output=True, timeout=15
        )
        data = json.loads(r.stdout)
        return {
            item["name"] for item in data if isinstance(item, dict) and item.get("name")
        }
    except Exception:
        return set()


def install_board_deps(fqbn: str) -> dict:
    """Instala cores y librerías necesarias para la placa seleccionada.

    Solo instala lo que no esté ya instalado (consulta core list y lib list).
    """
    deps = BOARD_DEPS.get(fqbn, {"cores": [], "libs": []})

    installed_cores = get_installed_cores()
    installed_libs = get_installed_libs()

    results: list[dict] = []
    skipped = 0

    for core in deps.get("cores", []):
        if core in installed_cores:
            skipped += 1
            results.append(
                {"type": "core", "name": core, "success": True, "already_installed": True}
            )
            continue
        try:
            r = run_arduino_cli(
                ["core", "install", core], capture_output=True, timeout=120
            )
            results.append(
                {
                    "type": "core",
                    "name": core,
                    "success": r.returncode == 0,
                    "stdout": r.stdout[-500:] if r.stdout else "",
                    "stderr": r.stderr[-500:] if r.stderr else "",
                }
            )
        except subprocess.TimeoutExpired:
            results.append(
                {"type": "core", "name": core, "success": False, "error": "timeout"}
            )
        except Exception as e:
            results.append(
                {"type": "core", "name": core, "success": False, "error": str(e)}
            )

    for lib in deps.get("libs", []):
        if lib in installed_libs:
            skipped += 1
            results.append(
                {"type": "lib", "name": lib, "success": True, "already_installed": True}
            )
            continue
        try:
            r = run_arduino_cli(
                ["lib", "install", lib], capture_output=True, timeout=120
            )
            results.append(
                {
                    "type": "lib",
                    "name": lib,
                    "success": r.returncode == 0,
                    "stdout": r.stdout[-500:] if r.stdout else "",
                    "stderr": r.stderr[-500:] if r.stderr else "",
                }
            )
        except subprocess.TimeoutExpired:
            results.append(
                {"type": "lib", "name": lib, "success": False, "error": "timeout"}
            )
        except Exception as e:
            results.append(
                {"type": "lib", "name": lib, "success": False, "error": str(e)}
            )

    return {"fqbn": fqbn, "results": results, "skipped": skipped}
