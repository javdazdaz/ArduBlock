"""
ArduBlock — Rutas de instalación/estado de arduino-cli
"""

import os
import platform
import shutil
import stat
import sys
import tarfile
import tempfile
import urllib.request
import zipfile
from pathlib import Path

from flask import Blueprint, jsonify

from backend.config import (
    ARDUINO_CLI_DOWNLOADS,
    get_arduino_cli_dir,
    get_arduino_cli_local,
    get_arduino_cli_path,
    set_arduino_cli_path,
)

arduino_cli_bp = Blueprint("arduino_cli", __name__)


def _get_download_url() -> str | None:
    return ARDUINO_CLI_DOWNLOADS.get((sys.platform, platform.machine()))


def _install_arduino_cli() -> dict:
    """Descarga e instala arduino-cli en ~/.ardublock/bin/."""
    url = _get_download_url()
    if not url:
        return {
            "success": False,
            "error": (
                f"Plataforma no soportada: {sys.platform}/{platform.machine()}. "
                "Instalá arduino-cli manualmente desde "
                "https://arduino.github.io/arduino-cli/installation/"
            ),
        }

    try:
        cli_dir = get_arduino_cli_dir()
        cli_local = get_arduino_cli_local()
        cli_dir.mkdir(parents=True, exist_ok=True)

        with tempfile.TemporaryDirectory(prefix="ardublock_cli_") as tmpdir:
            tmppath = Path(tmpdir)
            archive_name = url.split("/")[-1]
            archive_path = tmppath / archive_name
            urllib.request.urlretrieve(url, str(archive_path))

            if archive_name.endswith(".zip"):
                with zipfile.ZipFile(archive_path, "r") as zf:
                    zf.extractall(tmppath)
            elif archive_name.endswith(".tar.gz") or archive_name.endswith(".tgz"):
                with tarfile.open(archive_path, "r:gz") as tf:
                    tf.extractall(tmppath)
            else:
                return {
                    "success": False,
                    "error": f"Formato desconocido: {archive_name}",
                }

            cli_bin = None
            for root, _dirs, files in os.walk(tmppath):
                for f in files:
                    if f.startswith("arduino-cli") and not f.endswith(
                        (".zip", ".tar.gz", ".tgz", ".txt", ".md")
                    ):
                        cli_bin = Path(root) / f
                        break
                if cli_bin:
                    break

            if not cli_bin:
                return {
                    "success": False,
                    "error": "No se encontró el binario arduino-cli en el archivo descargado",
                }

            if cli_local.exists():
                cli_local.unlink()
            shutil.move(str(cli_bin), str(cli_local))

            if sys.platform != "win32":
                st = cli_local.stat()
                cli_local.chmod(
                    st.st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH
                )

            set_arduino_cli_path(str(cli_local))
            return {"success": True, "path": str(cli_local)}

    except Exception as e:
        return {"success": False, "error": f"Error al instalar arduino-cli: {str(e)}"}


@arduino_cli_bp.route("/api/arduino-cli/install", methods=["POST"])
def install_arduino_cli():
    cli_path = get_arduino_cli_path()
    if cli_path and os.path.isfile(cli_path):
        return jsonify(
            {
                "success": True,
                "path": cli_path,
                "message": "arduino-cli ya está instalado",
            }
        )

    result = _install_arduino_cli()
    status_code = 200 if result["success"] else 500
    return jsonify(result), status_code


@arduino_cli_bp.route("/api/arduino-cli/status")
def arduino_cli_status():
    cli_path = get_arduino_cli_path()
    available = cli_path is not None and os.path.isfile(cli_path)
    return jsonify(
        {
            "available": available,
            "path": cli_path,
            "can_auto_install": _get_download_url() is not None,
            "platform": f"{sys.platform}/{platform.machine()}",
        }
    )
