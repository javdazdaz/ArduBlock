"""
ArduBlock Backend — Configuración

Paths, detección de arduino-cli, mapeos de placas/chips, constantes.
No depende de Flask — seguro importar desde cualquier módulo.
"""

import os
import re
import sys
import shutil
import platform
from pathlib import Path

# ═══ Directorios ═════════════════════════════════

_BASE_DIR = Path(__file__).resolve().parent.parent
_FRONTEND_BASE = _BASE_DIR / "frontend"
FRONTEND_DIR = (
    _FRONTEND_BASE / "dist"
    if os.environ.get("ARDUBLOCK_PRODUCTION")
    else _FRONTEND_BASE
)
PROJECTS_DIR = Path(__file__).resolve().parent / "projects"
EXAMPLES_DIR = _BASE_DIR / "examples" / "arduino"
PROJECTS_DIR.mkdir(exist_ok=True)

# ═══ Servidor ═════════════════════════════════════

HOST = os.environ.get("ARDUBLOCK_HOST", "0.0.0.0")
PORT = int(os.environ.get("ARDUBLOCK_PORT", "5001"))

# ═══ Validación de project_id ═════════════════════

_PROJECT_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{1,64}$")


def validate_project_id(project_id: str) -> bool:
    """Valida que el ID del proyecto sea seguro (sin path traversal)."""
    if not _PROJECT_ID_RE.match(project_id):
        return False
    if ".." in project_id or "/" in project_id or "\\" in project_id:
        return False
    return True


# ═══ Detección de arduino-cli ═════════════════════

_ARDUINO_CLI_DIR = Path.home() / ".ardublock" / "bin"
_ARDUINO_CLI_LOCAL = (
    _ARDUINO_CLI_DIR
    / ("arduino-cli.exe" if sys.platform == "win32" else "arduino-cli")
)

_ARDUINO_CLI: str | None = None
# 1. Buscar en PATH del sistema
_ARDUINO_CLI = shutil.which("arduino-cli")
# 2. Buscar en instalación local automática de ArduBlock
if not _ARDUINO_CLI and _ARDUINO_CLI_LOCAL.is_file():
    _ARDUINO_CLI = str(_ARDUINO_CLI_LOCAL)
# 3. Windows: buscar en rutas comunes de instalación manual
if not _ARDUINO_CLI and sys.platform == "win32":
    for _c in [
        os.path.join(
            os.path.expandvars("%LOCALAPPDATA%"), "arduino-cli", "arduino-cli.exe"
        ),
        os.path.join(
            os.path.expandvars("%PROGRAMFILES%"), "arduino-cli", "arduino-cli.exe"
        ),
        os.path.join(
            os.path.expandvars("%PROGRAMFILES(X86)%"),
            "arduino-cli",
            "arduino-cli.exe",
        ),
    ]:
        if os.path.isfile(_c):
            _ARDUINO_CLI = _c
            break

_ARDUINO_CLI_AVAILABLE = _ARDUINO_CLI is not None and os.path.isfile(_ARDUINO_CLI)


def get_arduino_cli_path() -> str | None:
    return _ARDUINO_CLI


def set_arduino_cli_path(path: str) -> None:
    global _ARDUINO_CLI, _ARDUINO_CLI_AVAILABLE
    _ARDUINO_CLI = path
    _ARDUINO_CLI_AVAILABLE = True


def get_arduino_cli_dir() -> Path:
    return _ARDUINO_CLI_DIR


def get_arduino_cli_local() -> Path:
    return _ARDUINO_CLI_LOCAL


# ═══ Board config ════════════════════════════════

BOARD_DEPS = {
    "arduino:avr:uno": {"cores": ["arduino:avr"], "libs": []},
    "arduino:avr:nano": {"cores": ["arduino:avr"], "libs": []},
    "arduino:avr:mega": {"cores": ["arduino:avr"], "libs": []},
    "arduino:renesas_uno:minima": {"cores": ["arduino:renesas_uno"], "libs": []},
    "arduino:renesas_uno:unor4wifi": {
        "cores": ["arduino:renesas_uno"],
        "libs": [],
    },
    "arduino:esp32:nano_nora": {"cores": ["arduino:esp32"], "libs": []},
}

# ═══ Mapeo chips USB → placas ════════════════════

CHIP_BOARD_MAP = {
    ("1A86", "7523"): {
        "suggested_fqbn": "arduino:avr:uno",
        "compatible_fqbns": ["arduino:avr:uno", "arduino:avr:nano", "arduino:avr:mega"],
        "label": "CH340 (clon Arduino AVR)",
    },
    ("1A86", "5523"): {
        "suggested_fqbn": "arduino:avr:uno",
        "compatible_fqbns": ["arduino:avr:uno", "arduino:avr:nano", "arduino:avr:mega"],
        "label": "CH341 (clon Arduino AVR)",
    },
    ("10C4", "EA60"): {
        "suggested_fqbn": "arduino:avr:nano",
        "compatible_fqbns": [
            "arduino:avr:nano",
            "arduino:avr:uno",
            "arduino:avr:mega",
            "arduino:esp32:nano_nora",
        ],
        "label": "CP2102 (clon Arduino/ESP)",
    },
}

# ═══ Chips USB-Serial conocidos ══════════════════

KNOWN_USB_SERIAL = {
    ("1A86", "7523"): {
        "name": "CH340",
        "drivers": {
            "win32": "http://www.wch-ic.com/downloads/CH341SER_EXE.html",
            "darwin": "http://www.wch-ic.com/downloads/CH34XSER_MAC_ZIP.html",
            "linux": None,  # incluido en kernel desde 2.6
        },
    },
    ("1A86", "5523"): {
        "name": "CH341",
        "drivers": {
            "win32": "http://www.wch-ic.com/downloads/CH341SER_EXE.html",
            "darwin": "http://www.wch-ic.com/downloads/CH34XSER_MAC_ZIP.html",
            "linux": None,
        },
    },
    ("10C4", "EA60"): {
        "name": "CP2102",
        "drivers": {
            "win32": "https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers",
            "darwin": "https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers",
            "linux": None,
        },
    },
}

# ═══ Downloads de arduino-cli ════════════════════

ARDUINO_CLI_DOWNLOADS = {
    ("linux", "x86_64"): "https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Linux_64bit.tar.gz",
    ("linux", "aarch64"): "https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Linux_ARM64.tar.gz",
    ("linux", "armv7l"): "https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Linux_ARMv7.tar.gz",
    ("linux", "i686"): "https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Linux_32bit.tar.gz",
    ("win32", "AMD64"): "https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Windows_64bit.zip",
    ("darwin", "x86_64"): "https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_macOS_64bit.tar.gz",
    ("darwin", "arm64"): "https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_macOS_ARM64.tar.gz",
}
