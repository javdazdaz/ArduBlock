"""Tests de hardening adicional: cookie de sesión, null byte en examples,
status de arduino-cli sin ruta del binario."""

from backend.routes.examples import _safe_example_path


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
