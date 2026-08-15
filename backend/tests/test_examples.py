"""
Tests de las rutas de ejemplos — incluye regresión de path traversal
(CRIT-1 de la auditoría: /api/examples/<path> leía archivos arbitrarios).
"""

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
