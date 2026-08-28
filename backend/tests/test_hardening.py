"""Tests de hardening adicional: cookie de sesión, null byte en examples,
status de arduino-cli sin ruta del binario."""

from backend.routes.examples import _safe_example_path
from backend.payload_validation import validate_compile_payload
from backend.routes.projects import _write_tabs


def test_safe_example_path_rejects_null_byte():
    assert _safe_example_path("foo\x00bar") is None


def test_safe_example_path_rejects_control_chars():
    assert _safe_example_path("foo\nbar") is None
    assert _safe_example_path("foo\tbar") is None


def test_safe_example_path_allows_plain_relative():
    # Un nombre normal (exista o no el archivo) no debe rechazarse por chars.
    assert _safe_example_path("Blink/Blink.ino") is not None


def test_examples_null_byte_not_500(client):
    resp = client.get("/api/examples/foo%00bar")
    assert resp.status_code in (400, 404)


def test_arduino_cli_status_hides_path(client):
    resp = client.get("/api/arduino-cli/status")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "available" in data
    assert "path" not in data
    assert "platform" not in data
    assert "can_auto_install" not in data


def test_session_cookie_hardening(app):
    assert app.config["SESSION_COOKIE_HTTPONLY"] is True
    assert app.config["SESSION_COOKIE_SAMESITE"] == "Lax"


def test_compile_payload_rejects_unknown_board_and_reserved_tab():
    assert validate_compile_payload("evil:platform:board", []) == "Placa no soportada"
    assert validate_compile_payload(
        "arduino:avr:uno", [{"filename": "ardublock_sketch.ino", "content": "x"}]
    ) == "Nombre de tab reservado"


def test_write_tabs_rejects_non_tab_filename(tmp_path):
    try:
        _write_tabs(tmp_path, [{"filename": "script.py", "content": "print(1)"}])
    except ValueError as exc:
        assert "Extensión" in str(exc)
    else:
        raise AssertionError("_write_tabs aceptó una extensión no permitida")


def test_csrf_blocks_mutating_project_api(app, monkeypatch):
    monkeypatch.setitem(app.config, "WTF_CSRF_ENABLED", True)
    with app.test_client() as c:
        with c.session_transaction() as sess:
            sess["_user_id"] = "1"
            sess["_fresh"] = True
        resp = c.post("/api/projects", json={"name": "x", "data": {}})
    assert resp.status_code == 400


def test_production_does_not_register_host_hardware(monkeypatch):
    import backend.app as app_module

    monkeypatch.setattr(app_module, "IS_PRODUCTION", True)
    prod_app = app_module.create_app()
    routes = {rule.rule for rule in prod_app.url_map.iter_rules()}
    assert "/api/compile" in routes
    assert "/api/upload" not in routes
    assert "/api/serial/open" not in routes
    assert "/api/boards" not in routes
    assert "/api/arduino-cli/install" not in routes
