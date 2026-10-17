"""
Tests de las rutas de ejemplos — incluye regresión de path traversal
(CRIT-1 de la auditoría: /api/examples/<path> leía archivos arbitrarios)
y el listado recursivo con descripciones.
"""

import pytest

from backend.routes import examples as examples_module


def test_safe_example_path_allows_legit(monkeypatch, tmp_path):
    monkeypatch.setattr(examples_module, "EXAMPLES_DIR", tmp_path)
    (tmp_path / "ok.ino").write_text("void setup(){}")
    resolved = examples_module._safe_example_path("ok.ino")
    assert resolved is not None
    assert resolved.is_file()


def test_safe_example_path_blocks_traversal(monkeypatch, tmp_path):
    monkeypatch.setattr(examples_module, "EXAMPLES_DIR", tmp_path)
    assert examples_module._safe_example_path("../../etc/passwd") is None
    assert examples_module._safe_example_path("/etc/passwd") is None


def test_safe_example_path_blocks_symlink_escape(monkeypatch, tmp_path):
    monkeypatch.setattr(examples_module, "EXAMPLES_DIR", tmp_path)
    outside = tmp_path.parent / "secret.txt"
    outside.write_text("secreto")
    (tmp_path / "link.ino").symlink_to(outside)
    assert examples_module._safe_example_path("link.ino") is None


def test_safe_example_path_rejects_empty_and_control_chars(monkeypatch, tmp_path):
    monkeypatch.setattr(examples_module, "EXAMPLES_DIR", tmp_path)
    assert examples_module._safe_example_path("") is None
    assert examples_module._safe_example_path("a\x00b.ino") is None


def test_get_example_returns_legit_file(client):
    resp = client.get("/api/examples/05.Control/Arrays/Arrays.ino")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "content" in data
    assert "setup" in data["content"] or "loop" in data["content"]


def test_get_example_blocks_path_traversal(client):
    # ../.. hacia /etc/passwd no debe devolver el archivo (antes lo hacía).
    resp = client.get("/api/examples/../../../../etc/passwd")
    assert resp.status_code == 404
    body = resp.get_data(as_text=True)
    assert "root:" not in body


def test_get_example_404_for_missing_file(client):
    resp = client.get("/api/examples/99.NoExiste/Fantasma.ino")
    assert resp.status_code == 404
    assert resp.get_json()["error"] == "Ejemplo no encontrado"


def test_list_examples_recorre_subdirectorios_y_lee_la_descripcion(monkeypatch, tmp_path, client):
    base = tmp_path / "arduino"
    (base / "01.Basics" / "Blink").mkdir(parents=True)
    (base / "01.Basics" / "Blink" / "Blink.ino").write_text(
        "/*\n * Enciende el LED integrado cada segundo.\n */\nvoid setup() {}\n"
    )
    (base / "02.Digital").mkdir()
    (base / "02.Digital" / "Boton.ino").write_text("// Lee un pulsador\nvoid loop() {}\n")
    (base / "suelto.ino").write_text("void setup() {}\n")
    monkeypatch.setattr(examples_module, "EXAMPLES_DIR", base)

    resp = client.get("/api/examples")
    assert resp.status_code == 200
    items = {item["path"]: item for item in resp.get_json()}

    assert set(items) == {
        "01.Basics/Blink/Blink.ino",
        "02.Digital/Boton.ino",
        "suelto.ino",
    }
    assert items["01.Basics/Blink/Blink.ino"]["name"] == "Blink"
    assert "Enciende el LED" in items["01.Basics/Blink/Blink.ino"]["description"]
    assert items["02.Digital/Boton.ino"]["description"] == "Lee un pulsador"
    assert items["suelto.ino"]["description"] == ""


def test_list_examples_ignora_ocultos_y_archivos_que_no_son_ino(monkeypatch, tmp_path, client):
    base = tmp_path / "arduino"
    (base / ".oculto").mkdir(parents=True)
    (base / ".oculto" / "Oculto.ino").write_text("void setup() {}")
    (base / "notas.txt").write_text("no es un ejemplo")
    (base / ".DS_Store").write_text("basura")
    (base / "Real.ino").write_text("void setup() {}")
    monkeypatch.setattr(examples_module, "EXAMPLES_DIR", base)

    items = client.get("/api/examples").get_json()

    assert [item["path"] for item in items] == ["Real.ino"]


def test_list_examples_devuelve_lista_vacia_si_no_existe_el_directorio(monkeypatch, tmp_path, client):
    monkeypatch.setattr(examples_module, "EXAMPLES_DIR", tmp_path / "no-existe")

    resp = client.get("/api/examples")

    assert resp.status_code == 200
    assert resp.get_json() == []


def test_list_examples_omite_archivos_ilegibles(monkeypatch, tmp_path, client):
    base = tmp_path / "arduino"
    base.mkdir()
    ilegible = base / "Roto.ino"
    ilegible.write_text("void setup() {}")
    ilegible.chmod(0o000)
    monkeypatch.setattr(examples_module, "EXAMPLES_DIR", base)
    try:
        items = client.get("/api/examples").get_json()
    finally:
        ilegible.chmod(0o600)

    # El archivo sigue listándose; lo que falla es la lectura de la descripción.
    assert [item["path"] for item in items] == ["Roto.ino"]
    assert items[0]["description"] == ""


@pytest.mark.parametrize("ruta", ["/api/examples/%2e%2e/%2e%2e/etc/passwd", "/api/examples/..%00/x.ino"])
def test_get_example_rechaza_rutas_hostiles(client, ruta):
    resp = client.get(ruta)
    assert resp.status_code == 404
