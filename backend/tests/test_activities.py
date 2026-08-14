"""Tests del módulo de actividades: crear/editar/borrar actividades en un curso,
asignar proyecto de referencia, dashboard de proyectos del docente y lectura
de referencia por parte del estudiante (autorización).
"""

from backend.db import get_session
from backend.models import Activity, Project, Classroom, User


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


def _classroom_id(join_code="ABC123"):
    s = get_session()
    try:
        return s.query(Classroom).filter_by(join_code=join_code).first().id
    finally:
        s.close()


def _teacher_project(client, name="referencia.ino"):
    """Crea un proyecto propio del docente (logueado) y devuelve su id."""
    r = client.post("/api/projects", json={"name": name, "data": {"state": {}}})
    assert r.status_code == 201, r.get_json()
    return r.get_json()["id"]


def test_teacher_projects_dashboard_lists_own_projects(client):
    _login_teacher(client)
    pid = _teacher_project(client, "mi-referencia.ino")

    r = client.get("/teacher/projects")
    assert r.status_code == 200
    assert b"mi-referencia.ino" in r.data

    s = get_session()
    try:
        assert s.get(Project, pid).user_id == s.query(User).filter_by(role="teacher").first().id
    finally:
        s.close()


def test_teacher_creates_activity_without_reference(client, seed_classroom):
    seed_classroom("ABC123")
    _login_teacher(client)
    cid = _classroom_id()

    client.post(f"/teacher/classroom/{cid}/activities",
                data={"name": "Actividad 1"}, follow_redirects=True)

    s = get_session()
    try:
        a = s.query(Activity).filter_by(classroom_id=cid).first()
        assert a is not None
        assert a.name == "Actividad 1"
        assert a.reference_project_id is None
    finally:
        s.close()


def test_teacher_creates_activity_with_reference(client, seed_classroom):
    seed_classroom("ABC123")
    _login_teacher(client)
    cid = _classroom_id()
    pid = _teacher_project(client)

    client.post(f"/teacher/classroom/{cid}/activities",
                data={"name": "Con referencia", "reference_project_id": str(pid)},
                follow_redirects=True)

    s = get_session()
    try:
        a = s.query(Activity).filter_by(classroom_id=cid).first()
        assert a.reference_project_id == pid
    finally:
        s.close()


def test_teacher_cannot_assign_foreign_project_as_reference(client, seed_classroom):
    seed_classroom("ABC123")
    cid = _classroom_id()
    # proyecto de un estudiante (ajeno al docente)
    _register_student(client, "alumno@example.com")
    foreign_pid = client.post("/api/projects",
                              json={"name": "ajeno.ino", "data": {"state": {}}}).get_json()["id"]
    client.get("/logout")
    _login_teacher(client)

    client.post(f"/teacher/classroom/{cid}/activities",
                data={"name": "Intentando ajeno", "reference_project_id": str(foreign_pid)},
                follow_redirects=True)

    s = get_session()
    try:
        a = s.query(Activity).filter_by(classroom_id=cid).first()
        assert a.name == "Intentando ajeno"
        assert a.reference_project_id is None  # rechazado silenciosamente
    finally:
        s.close()


def test_teacher_edits_activity(client, seed_classroom):
    seed_classroom("ABC123")
    _login_teacher(client)
    cid = _classroom_id()
    pid = _teacher_project(client)

    client.post(f"/teacher/classroom/{cid}/activities",
                data={"name": "Antes"}, follow_redirects=True)
    s = get_session()
    try:
        aid = s.query(Activity).filter_by(classroom_id=cid).first().id
    finally:
        s.close()

    client.post(f"/teacher/classroom/{cid}/activities/{aid}/edit",
                data={"name": "Después", "reference_project_id": str(pid)},
                follow_redirects=True)

    s = get_session()
    try:
        a = s.get(Activity, aid)
        assert a.name == "Después"
        assert a.reference_project_id == pid
    finally:
        s.close()


def test_teacher_deletes_activity(client, seed_classroom):
    seed_classroom("ABC123")
    _login_teacher(client)
    cid = _classroom_id()
    client.post(f"/teacher/classroom/{cid}/activities",
                data={"name": "Para borrar"}, follow_redirects=True)
    s = get_session()
    try:
        aid = s.query(Activity).filter_by(classroom_id=cid).first().id
    finally:
        s.close()

    client.post(f"/teacher/classroom/{cid}/activities/{aid}/delete",
                follow_redirects=True)

    s = get_session()
    try:
        assert s.get(Activity, aid) is None
    finally:
        s.close()


def test_student_sees_activities_in_classroom(client, seed_classroom):
    seed_classroom("ABC123")
    cid = _classroom_id()
    _register_student(client, "alumno@example.com")
    client.get("/logout")
    _login_teacher(client)
    client.post(f"/teacher/classroom/{cid}/activities",
                data={"name": "Actividad visible"}, follow_redirects=True)
    client.get("/logout")
    client.post("/login", data={"email": "alumno@example.com", "password": "secreto123"},
                follow_redirects=True)

    r = client.get(f"/student/classroom/{cid}")
    assert r.status_code == 200
    assert b"Actividad visible" in r.data


def test_student_reads_reference_project(client, seed_classroom):
    seed_classroom("ABC123")
    cid = _classroom_id()
    _register_student(client, "alumno@example.com")
    client.get("/logout")
    _login_teacher(client)
    pid = _teacher_project(client)
    client.post(f"/teacher/classroom/{cid}/activities",
                data={"name": "Ref", "reference_project_id": str(pid)}, follow_redirects=True)
    client.get("/logout")
    client.post("/login", data={"email": "alumno@example.com", "password": "secreto123"},
                follow_redirects=True)

    r = client.get(f"/api/reference-projects/{pid}")
    assert r.status_code == 200
    assert r.get_json()["id"] == pid


def test_student_cannot_read_unreferenced_project(client, seed_classroom):
    seed_classroom("ABC123")
    _register_student(client, "alumno@example.com")
    client.get("/logout")
    _login_teacher(client)
    pid = _teacher_project(client, "no-referenciado.ino")  # sin actividad que lo referencie
    client.get("/logout")
    client.post("/login", data={"email": "alumno@example.com", "password": "secreto123"},
                follow_redirects=True)

    assert client.get(f"/api/reference-projects/{pid}").status_code == 403
