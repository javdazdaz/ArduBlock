"""
ArduBlock — Servicio arduino-cli

Ejecución de comandos, auto-instalación de cores, consulta de cores/libs instalados.
"""

import json
import os
import re
import subprocess
import sys
from typing import Any

from backend.config import (
    get_arduino_cli_path,
    BOARD_DEPS,
)


def run_arduino_cli(
    args: list[str], **kwargs: Any
) -> subprocess.CompletedProcess:
    """Ejecuta arduino-cli usando la ruta resuelta.

    Lanza FileNotFoundError con mensaje descriptivo si no está instalado.
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
    return subprocess.run(cmd, **kwargs)


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
