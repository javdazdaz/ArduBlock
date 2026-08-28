"""
ArduBlock — Detección USB

Extracción de VID/PID, detección de chips USB-Serial, filtrado de puertos falsos.
"""

import json
import sys
from typing import Any

from backend.config import CHIP_BOARD_MAP, KNOWN_USB_SERIAL
from backend.services.arduino_cli import run_arduino_cli


def extract_vid_pid(port_info: dict) -> tuple[str | None, str | None]:
    """Extrae (VID, PID) normalizados de un puerto, o (None, None)."""
    props = port_info.get("properties", {})
    vid = pid = None

    # Formato Windows: hardware_id = "USB\\VID_1A86&PID_7523\\..."
    hw_id = port_info.get("hardware_id", "") or ""
    for part in hw_id.replace("&", "\\").split("\\"):
        if part.upper().startswith("VID_"):
            vid = part[4:].upper()
        elif part.upper().startswith("PID_"):
            pid = part[4:].upper()

    # Formato Linux: properties.vid = "0x1a86", properties.pid = "0x7523"
    if not (vid and pid):
        raw_vid = props.get("vid", "")
        raw_pid = props.get("pid", "")
        if raw_vid and raw_pid:
            vid = raw_vid.replace("0x", "").replace("0X", "").upper().zfill(4)
            pid = raw_pid.replace("0x", "").replace("0X", "").upper().zfill(4)

    return (vid, pid)


def is_fake_serial_port(address: str) -> bool:
    """Devuelve True si el puerto NO puede ser un Arduino real.

    /dev/ttyS* son consolas seriales del kernel, /dev/tty* genéricos
    sin ACM/USB en el nombre tampoco son Arduino.
    """
    if not address:
        return True
    if address.startswith("COM"):
        return False
    if "/dev/ttyACM" in address or "/dev/ttyUSB" in address:
        return False
    if address.startswith("/dev/tty"):
        return True
    return False


def detect_driver_issues() -> dict[str, Any]:
    """Ejecuta arduino-cli board list y detecta chips que pueden necesitar drivers."""
    ports: list[dict] = []
    recommendations: list[str] = []

    try:
        result = run_arduino_cli(
            ["board", "list", "--format", "json"], capture_output=True, timeout=10
        )
        data = json.loads(result.stdout)
        detected = data.get("detected_ports", [])
    except Exception:
        return {"ports": [], "recommendations": [], "error": "No se pudo consultar las placas"}

    for entry in detected:
        port_info = entry.get("port", {})
        address = port_info.get("address", "?")
        matching = entry.get("matching_boards", [])

        vid, pid = extract_vid_pid(port_info)
        if not (vid and pid):
            continue

        chip_info = KNOWN_USB_SERIAL.get((vid, pid))
        if not isinstance(chip_info, dict):
            continue

        drivers = chip_info.get("drivers")
        if not isinstance(drivers, dict):
            continue
        driver_url = drivers.get(sys.platform)
        driver_needed = driver_url is not None

        board_map = CHIP_BOARD_MAP.get((vid, pid), {})

        port_entry = {
            "address": address,
            "chip": chip_info["name"],
            "vid": vid,
            "pid": pid,
            "driver_needed": driver_needed,
            "driver_url": driver_url,
            "board_identified": len(matching) > 0,
            "suggested_fqbn": board_map.get("suggested_fqbn"),
            "compatible_fqbns": board_map.get("compatible_fqbns", []),
            "chip_label": board_map.get("label", chip_info["name"]),
        }
        ports.append(port_entry)

        if driver_needed and not matching:
            os_name = {
                "win32": "Windows",
                "darwin": "macOS",
                "linux": "Linux",
            }.get(sys.platform, sys.platform)
            recommendations.append(
                f"Chip {chip_info['name']} detectado en {address}. "
                f"En {os_name} este chip requiere instalar el driver manualmente."
            )

    if ports and sys.platform == "darwin":
        recommendations.append(
            "En macOS, después de instalar el driver CH34x, "
            "reinicia el Mac y autorizá la extensión en Preferencias del Sistema → Seguridad."
        )
    elif ports and sys.platform == "win32":
        recommendations.append(
            "En Windows, si el driver no se instala automáticamente, "
            "descargalo del sitio del fabricante y ejecutalo como administrador."
        )

    return {"ports": ports, "recommendations": recommendations}
