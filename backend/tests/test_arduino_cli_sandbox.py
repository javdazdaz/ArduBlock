"""El sandbox del compilador tiene que ver las librerías de usuario.

arduino-cli busca las librerías instaladas en `directories.user` ($HOME/Arduino).
El sandbox monta un HOME vacío, así que sin un montaje explícito ninguna librería
instalada por el docente existe dentro de la compilación: AFMotor_R4, DHT y
cualquier otra fallan con "No such file or directory".
"""

import os
import shutil

import pytest

from backend.services import arduino_cli as ac


@pytest.fixture
def entorno(tmp_path, monkeypatch):
    arduino = tmp_path / "Arduino"
    (arduino / "libraries" / "AFMotor_R4").mkdir(parents=True)
    (arduino / "libraries" / "AFMotor_R4" / "library.properties").write_text("name=AFMotor\n")

    data = tmp_path / ".arduino15"
    (data / "packages").mkdir(parents=True)

    sketch = tmp_path / "sketch"
    sketch.mkdir()
    (sketch / "sketch.ino").write_text("void setup(){}\nvoid loop(){}\n")

    monkeypatch.setattr(ac, "_ARDUINO_USER_DIR", str(arduino))
    monkeypatch.setattr(ac, "_ARDUINO_DATA_DIR", str(data))
    monkeypatch.setattr(ac, "_BWRAP", "/usr/bin/bwrap")
    monkeypatch.setattr(ac, "_BUILD_CACHE_DIR", str(tmp_path / "cache"))

    return {"arduino": arduino, "sketch": sketch, "data": data}


def _argv(entorno):
    cmd = ["arduino-cli", "compile", "--fqbn", "arduino:avr:uno", str(entorno["sketch"])]
    argv, scratch = ac._sandboxed_compile(cmd)
    return argv, scratch


def test_monta_las_librerias_de_usuario(entorno):
    argv, scratch = _argv(entorno)
    try:
        origen = str(entorno["arduino"] / "libraries")
        assert "--ro-bind" in argv
        i = argv.index(origen)
        assert argv[i - 1] == "--ro-bind"
        # el destino va dentro de scratch, donde arduino-cli lo busca con HOME=scratch
        assert argv[i + 1] == os.path.join(scratch, "Arduino", "libraries")
    finally:
        shutil.rmtree(scratch, ignore_errors=True)


def test_sin_librerias_no_agrega_montaje(tmp_path, monkeypatch):
    data = tmp_path / ".arduino15"
    (data / "packages").mkdir(parents=True)
    sketch = tmp_path / "sketch"
    sketch.mkdir()

    monkeypatch.setattr(ac, "_ARDUINO_USER_DIR", str(tmp_path / "Arduino-vacio"))
    monkeypatch.setattr(ac, "_ARDUINO_DATA_DIR", str(data))
    monkeypatch.setattr(ac, "_BWRAP", "/usr/bin/bwrap")
    monkeypatch.setattr(ac, "_BUILD_CACHE_DIR", str(tmp_path / "cache"))

    cmd = ["arduino-cli", "compile", "--fqbn", "arduino:avr:uno", str(sketch)]
    argv, scratch = ac._sandboxed_compile(cmd)
    try:
        assert not any("Arduino-vacio" in a for a in argv)
        assert not any(a.endswith("Arduino/libraries") for a in argv)
    finally:
        shutil.rmtree(scratch, ignore_errors=True)
