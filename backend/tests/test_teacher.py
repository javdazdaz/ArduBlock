"""Tests del dashboard docente: gestión de aulas (renombrar, eliminar, quitar
alumno) y lectura/edición de proyectos de alumnos (solo lectura + autorización).
"""

import json

from werkzeug.security import generate_password_hash

from backend.db import get_session
from backend.models import User, Classroom, ClassroomStudent, Project


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


def _classroom_id(join_code):
    s = get_session()
    try:
        return s.query(Classroom).filter_by(join_code=join_code).first().id
    finally:
        s.close()


def test_teacher_dashboard_lists_classrooms(client, seed_classroom):
    _login_teacher(client)
    seed_classroom("ABC123", "Robótica 3A")
    r = client.get("/dashboard")
    assert r.status_code == 200
    assert b"Rob\xc3\xb3tica 3A" in r.data


def test_old_dashboard_urls_redirect(client, seed_classroom):
    """/teacher y /student redirigen al dashboard unificado."""
    _login_teacher(client)
    seed_classroom("ABC123")
    assert client.get("/teacher").status_code == 302
    assert client.get("/student").status_code == 302


def test_student_dashboard_lists_courses(client, seed_classroom):
    """El mismo /dashboard muestra cursos cuando el rol es estudiante."""
    seed_classroom("ABC123", "Robótica 3A")
    _register_student(client, "alumno@example.com")
    r = client.get("/dashboard")
    assert r.status_code == 200
    assert b"Rob\xc3\xb3tica 3A" in r.data


def test_rename_classroom(client, seed_classroom):
    _login_teacher(client)
    seed_classroom("ABC123", "Robótica")
    cid = _classroom_id("ABC123")

    client.post(f"/teacher/classroom/{cid}/rename",
                data={"name": "Robótica Renombrada"}, follow_redirects=True)

    s = get_session()
    try:
        assert s.get(Classroom, cid).name == "Robótica Renombrada"
    finally:
        s.close()


def test_delete_classroom_keeps_students(client, seed_classroom):
    seed_classroom("ABC123")
    _register_student(client, "alumno@example.com")
    client.get("/logout")
    _login_teacher(client)

    cid = _classroom_id("ABC123")
    s = get_session()
    try:
        sid = s.query(User).filter_by(email="alumno@example.com").first().id
    finally:
        s.close()

    client.post(f"/teacher/classroom/{cid}/delete", follow_redirects=True)

    s = get_session()
    try:
        assert s.get(Classroom, cid) is None
        # el alumno conserva su cuenta
        assert s.get(User, sid) is not None
        assert s.query(ClassroomStudent).filter_by(classroom_id=cid).count() == 0
    finally:
        s.close()


def test_remove_student(client, seed_classroom):
    seed_classroom("ABC123")
    _register_student(client, "alumno@example.com")
    client.get("/logout")
    _login_teacher(client)

    cid = _classroom_id("ABC123")
    s = get_session()
    try:
        sid = s.query(User).filter_by(email="alumno@example.com").first().id
    finally:
        s.close()

    client.post(f"/teacher/classroom/{cid}/students/{sid}/remove",
                follow_redirects=True)

    s = get_session()
    try:
        assert s.query(ClassroomStudent).filter_by(
            classroom_id=cid, user_id=sid).count() == 0
        assert s.get(User, sid) is not None
    finally:
        s.close()


def test_teacher_reads_enrolled_student_project(client, seed_classroom):
    seed_classroom("ABC123")
    _register_student(client, "alumno@example.com")
    r = client.post("/api/projects", json={"name": "proy", "data": {"state": {"x": 1}}})
    pid = r.get_json()["id"]

    client.get("/logout")
    _login_teacher(client)

    r = client.get(f"/api/teacher/projects/{pid}")
    assert r.status_code == 200
    assert r.get_json()["id"] == pid


def test_teacher_cannot_read_foreign_project(client, seed_classroom):
    seed_classroom("ABC123")
    # alumno externo (no en aula del profesor)
    s = get_session()
    try:
        outsider = User(email="outsider@example.com", name="X",
                        password_hash=generate_password_hash("x"), role="student")
        s.add(outsider)
        s.flush()
        p = Project(user_id=outsider.id, name="p", data="{}")
        s.add(p)
        s.commit()
        pid = p.id
    finally:
        s.close()

    _login_teacher(client)
    assert client.get(f"/api/teacher/projects/{pid}").status_code == 403


def test_student_cannot_manage_classroom(client, seed_classroom):
    seed_classroom("ABC123")
    _register_student(client, "alumno@example.com")
    cid = _classroom_id("ABC123")

    r = client.post(f"/teacher/classroom/{cid}/rename",
                    data={"name": "hack"}, follow_redirects=False)
    assert r.status_code == 302  # no autorizado → redirect a su dashboard


def test_view_classroom_renders_with_classes(client, seed_classroom):
    seed_classroom("ABC123")
    _register_student(client, "alumno@example.com")
    client.get("/logout")
    _login_teacher(client)
    cid = _classroom_id("ABC123")
    client.post(f"/teacher/classroom/{cid}/classes",
                data={"name": "Clase 1"}, follow_redirects=True)

    r = client.get(f"/teacher/classroom/{cid}")
    assert r.status_code == 200
    assert b"alumno@example.com" in r.data
    assert b"Clase 1" in r.data


def test_teacher_edits_enrolled_student_project(client, seed_classroom):
    seed_classroom("ABC123")
    _register_student(client, "alumno@example.com")
    pid = client.post("/api/projects",
                      json={"name": "proy", "data": {"state": {"x": 1}}}).get_json()["id"]
    client.get("/logout")
    _login_teacher(client)

    r = client.put(f"/api/teacher/projects/{pid}",
                   json={"name": "corregido.ino", "data": {"state": {"x": 2}}})
    assert r.status_code == 200
    assert r.get_json()["name"] == "corregido.ino"
    assert r.get_json()["revision"] == 2

    s = get_session()
    try:
        p = s.get(Project, pid)
        teacher = s.query(User).filter_by(role="teacher").first()
        assert p.name == "corregido.ino"
        assert json.loads(p.data)["state"]["x"] == 2
        assert p.updated_by == teacher.id
    finally:
        s.close()

    stale = client.put(
        f"/api/teacher/projects/{pid}",
        json={"name": "stale.ino", "revision": 1},
    )
    assert stale.status_code == 409


def test_teacher_cannot_edit_foreign_project(client, seed_classroom):
    seed_classroom("ABC123")
    s = get_session()
    try:
        outsider = User(email="outsider@example.com", name="X",
                        password_hash=generate_password_hash("x"), role="student")
        s.add(outsider)
        s.flush()
        p = Project(user_id=outsider.id, name="p", data="{}")
        s.add(p)
        s.commit()
        pid = p.id
    finally:
        s.close()

    _login_teacher(client)
    assert client.put(f"/api/teacher/projects/{pid}",
                      json={"name": "hack"}).status_code == 403


def test_student_cannot_use_teacher_edit_endpoint(client, seed_classroom):
    seed_classroom("ABC123")
    _register_student(client, "alumno@example.com")
    pid = client.post("/api/projects",
                      json={"name": "proy", "data": {"state": {}}}).get_json()["id"]

    r = client.put(f"/api/teacher/projects/{pid}", json={"name": "hack"})
    assert r.status_code == 403
