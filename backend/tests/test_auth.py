"""
Tests de cuentas y registro (auth).

Cubre: registro (código válido/inválido, email duplicado), login, y el flujo
completo de recuperación de contraseña (incluido el hash del token).
"""

import hashlib
import re
from datetime import timedelta

from backend.db import get_session
from backend.models import User, ClassroomStudent, utcnow


def _register(client, join_code, email, password="secreto123", name="Estudiante X"):
    return client.post("/register", data={
        "join_code": join_code, "name": name, "email": email, "password": password,
    }, follow_redirects=True)


def test_register_creates_student_and_links_classroom(client, seed_classroom):
    seed_classroom("ABC123")
    # código en minúsculas: la ruta normaliza a mayúsculas
    r = _register(client, "abc123", "alumno@example.com")
    assert r.status_code == 200

    s = get_session()
    try:
        u = s.query(User).filter_by(email="alumno@example.com").first()
        assert u is not None
        assert u.role == "student"
        assert s.query(ClassroomStudent).filter_by(user_id=u.id).count() == 1
    finally:
        s.close()


def test_register_invalid_code_rejected(client):
    _register(client, "ZZZZZZ", "x@example.com")
    s = get_session()
    try:
        assert s.query(User).filter_by(email="x@example.com").first() is None
    finally:
        s.close()


def test_register_duplicate_email_rejected(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "ABC123", "dup@example.com")
    _register(client, "ABC123", "dup@example.com")

    s = get_session()
    try:
        assert s.query(User).filter_by(email="dup@example.com").count() == 1
    finally:
        s.close()


def test_login_success(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "ABC123", "alumno@example.com", password="secreto123")
    client.get("/logout")

    r = client.post("/login", data={
        "email": "alumno@example.com", "password": "secreto123",
    })
    assert r.status_code == 302  # redirect a dashboard


def test_login_wrong_password(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "ABC123", "alumno@example.com")
    client.get("/logout")

    r = client.post("/login", data={
        "email": "alumno@example.com", "password": "incorrecta",
    })
    assert r.status_code == 200  # re-renderiza login con error


def test_password_reset_flow(client, monkeypatch, seed_student):
    seed_student("alumno@example.com", password="vieja123")

    captured = {}

    def fake_send(to, subject, body):
        captured["to"] = to
        m = re.search(r"/reset/([A-Za-z0-9_-]+)", body)
        captured["token"] = m.group(1) if m else None
        return True

    monkeypatch.setattr("backend.routes.auth.send_email", fake_send)

    client.post("/reset", data={"email": "alumno@example.com"}, follow_redirects=True)
    token = captured.get("token")
    assert token

    # El token se guarda hasheado, nunca en claro.
    s = get_session()
    try:
        u = s.query(User).filter_by(email="alumno@example.com").first()
        assert u.reset_token != token
        assert u.reset_token == hashlib.sha256(token.encode("utf-8")).hexdigest()
    finally:
        s.close()

    client.post(f"/reset/{token}", data={"password": "nueva12345"},
                follow_redirects=True)

    r = client.post("/login", data={
        "email": "alumno@example.com", "password": "nueva12345",
    })
    assert r.status_code == 302  # la nueva contraseña funciona


def test_reset_expired_token_rejected(client, seed_student):
    seed_student("alumno@example.com", password="secreto123")
    token = "tokenexpirado"

    s = get_session()
    try:
        u = s.query(User).filter_by(email="alumno@example.com").first()
        u.reset_token = hashlib.sha256(token.encode("utf-8")).hexdigest()
        u.reset_token_expires = utcnow() - timedelta(hours=1)
        s.commit()
    finally:
        s.close()

    client.post(f"/reset/{token}", data={"password": "nueva12345"},
                follow_redirects=True)

    # La contraseña vieja sigue funcionando (el reset fue rechazado).
    r = client.post("/login", data={
        "email": "alumno@example.com", "password": "secreto123",
    })
    assert r.status_code == 302
