"""
Regresión de seguridad: install (cores/libs) exige login; upload, compile y
serial son públicos (rate-limitados); y el rate limiter bloquea tras el umbral.
"""

from backend.rate_limit import _record

TEACHER_EMAIL = "profesor@example.com"
TEACHER_PASSWORD = "profesor123"


def _login(client):
    return client.post(
        "/login",
        data={"email": TEACHER_EMAIL, "password": TEACHER_PASSWORD},
        follow_redirects=True,
    )


def test_upload_is_public(client):
    # Público (rate-limitado): sin login no redirige; con código vacío responde 400.
    resp = client.post("/api/upload", json={"code": "", "port": "/dev/ttyUSB0"})
    assert resp.status_code == 400


def test_serial_is_public(client):
    # Público: sin login no redirige a /login (302/401).
    assert client.get("/api/serial/status").status_code not in (302, 401)


def test_board_install_requires_login(client):
    resp = client.post("/api/board/install", json={"fqbn": "arduino:avr:uno"})
    assert resp.status_code in (302, 401)


def test_arduino_cli_install_requires_login(client):
    resp = client.post("/api/arduino-cli/install", json={})
    assert resp.status_code in (302, 401)


def test_compile_is_public(client):
    # Público: sin login no redirige; con código vacío responde 400.
    resp = client.post("/api/compile", json={"code": ""})
    assert resp.status_code == 400


def test_upload_works_when_logged_in(client):
    _login(client)
    # Autenticado: llega a la validación de payload (400), no a la redirección de login.
    resp = client.post("/api/upload", json={"code": "", "port": "/dev/ttyUSB0"})
    assert resp.status_code == 400


def test_rate_limit_blocks_after_threshold(monkeypatch):
    monkeypatch.delenv("ARDUBLOCK_RATE_LIMIT_DISABLED", raising=False)
    assert _record("unit:test", 3, 60) is False
    assert _record("unit:test", 3, 60) is False
    assert _record("unit:test", 3, 60) is False
    assert _record("unit:test", 3, 60) is True
