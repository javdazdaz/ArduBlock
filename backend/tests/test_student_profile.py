"""
Tests del perfil de estudiante (vista docente): ver/editar proyectos
(ubicación y nombre), editar cuenta, y autorización.
"""

from werkzeug.security import generate_password_hash

from backend.db import get_session
from backend.models import User, Classroom, Project, Class


TEACHER_EMAIL = "profesor@example.com"
TEACHER_PASSWORD = "profesor123"


def _login_teacher(client):
    return client.post("/login", data={
        "email": TEACHER_EMAIL, "password": TEACHER_PASSWORD,
    }, follow_redirects=True)


def _register_student(client, email, code="ABC123", password="secreto123"):
    return client.post("/register", data={
        "join_code": code, "name": "Alumno", "email": email, "password": password,
    }, follow_redirects=True)


def _sid(email):
    s = get_session()
    try:
        return s.query(User).filter_by(email=email).first().id
    finally:
        s.close()


def _classroom_id(join_code="ABC123"):
    s = get_session()
    try:
        return s.query(Classroom).filter_by(join_code=join_code).first().id
    finally:
        s.close()


def _seed_class(classroom_id, name="Clase 1"):
    s = get_session()
    try:
        cls = Class(name=name, classroom_id=classroom_id)
        s.add(cls)
        s.commit()
        return cls.id
    finally:
        s.close()


def test_teacher_views_student_profile(client, seed_classroom):
    seed_classroom("ABC123")
    _register_student(client, "alumno@example.com")
    client.post("/api/projects", json={"name": "p.ino", "data": {"state": {}}})
    client.get("/logout")
    _login_teacher(client)
    sid = _sid("alumno@example.com")

    r = client.get(f"/teacher/student/{sid}")
    assert r.status_code == 200
    assert b"p.ino" in r.data
    assert b"alumno@example.com" in r.data


def test_teacher_edits_student_account(client, seed_classroom):
    seed_classroom("ABC123")
    _register_student(client, "alumno@example.com")
    client.get("/logout")
    _login_teacher(client)
    sid = _sid("alumno@example.com")

    client.post(f"/teacher/student/{sid}/edit",
                data={"name": "Alumno Renombrado", "email": "alumno2@example.com"},
                follow_redirects=True)

    s = get_session()
    try:
        u = s.get(User, sid)
        assert u.name == "Alumno Renombrado"
        assert u.email == "alumno2@example.com"
    finally:
        s.close()


def test_teacher_edits_project_name_and_class(client, seed_classroom):
    seed_classroom("ABC123")
    cid = _classroom_id()
    clid = _seed_class(cid, "Clase 1")
    _register_student(client, "alumno@example.com")
    pid = client.post("/api/projects",
                      json={"name": "p.ino", "data": {"state": {}}}).get_json()["id"]
    client.get("/logout")
    _login_teacher(client)
    sid = _sid("alumno@example.com")

    client.post(f"/teacher/student/{sid}/projects/{pid}/edit",
                data={"name": "renombrado.ino", "class_id": str(clid)},
                follow_redirects=True)

    s = get_session()
    try:
        p = s.get(Project, pid)
        assert p.name == "renombrado.ino"
        assert p.class_id == clid
    finally:
        s.close()


def test_teacher_cannot_view_foreign_student(client, seed_classroom):
    seed_classroom("ABC123")
    s = get_session()
    try:
        u = User(email="outsider@example.com", name="X",
                 password_hash=generate_password_hash("x"), role="student")
        s.add(u)
        s.commit()
        outsider_id = u.id
    finally:
        s.close()

    _login_teacher(client)
    r = client.get(f"/teacher/student/{outsider_id}", follow_redirects=False)
    assert r.status_code == 302  # no autorizado


def test_profile_back_link_points_to_classroom(client, seed_classroom):
    seed_classroom("ABC123")
    _register_student(client, "alumno@example.com")
    client.get("/logout")
    _login_teacher(client)
    sid = _sid("alumno@example.com")
    cid = _classroom_id("ABC123")

    r = client.get(f"/teacher/student/{sid}?from={cid}")
    assert r.status_code == 200
    assert f"/teacher/classroom/{cid}".encode() in r.data
