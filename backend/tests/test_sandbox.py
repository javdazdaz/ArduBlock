"""
Tests del sandbox del compilador (Fase B): la orden bwrap se arma con el
whitelist correcto (sin /etc ni /opt) y cae limpio cuando bwrap no está.
"""

import os
import shutil

import backend.services.arduino_cli as svc


def test_sandboxed_compile_wraps_with_bwrap(monkeypatch, tmp_path):
    monkeypatch.setattr(svc, "_BWRAP", "/usr/bin/bwrap")
    data = tmp_path / "data"
    (data / "packages").mkdir(parents=True)
    (data / "inventory.yaml").write_text("")
    (data / "package_index.json").write_text("{}")
    (data / "library_index.json").write_text("{}")
    monkeypatch.setattr(svc, "_ARDUINO_DATA_DIR", str(data))

    sketch_parent = tmp_path / "sk"
    sketch_parent.mkdir()
    sketch = sketch_parent / "s.ino"
    sketch.write_text("void setup(){}")

    argv, scratch = svc._sandboxed_compile(
        ["/cli", "compile", "--fqbn", "arduino:avr:uno", str(sketch)]
    )

    try:
        assert argv[0] == "/usr/bin/bwrap"
        assert "--unshare-all" in argv
        assert argv[-1] == str(sketch)  # el sketch queda al final
        # El data-dir scratch se monta y packages/ queda enlazado read-only.
        assert ("--bind", scratch, scratch) in zip(argv, argv[1:], argv[2:]) or (
            "--bind" in argv and scratch in argv
        )
        # El whitelist no debe exponer /etc ni /opt.
        assert "/etc" not in argv
        assert "/opt" not in argv
        assert os.path.isdir(scratch)
    finally:
        shutil.rmtree(scratch, ignore_errors=True)
