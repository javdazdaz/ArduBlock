"""Tests del módulo de actividades (B+C): biblioteca del docente, asignación a
clases, dashboard de proyectos del docente y lectura de referencia por el
estudiante (autorización).
"""

from backend.db import get_session
from backend.models import Activity, ClassActivity, Project, Classroom, Class, User


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
    r = client.post("/api/projects", json={"name": name, "data": {"state": {}}})
    assert r.status_code == 201, r.get_json()
    return r.get_json()["id"]


def _create_class(client, classroom_id, name="Clase 1"):
    client.post(f"/teacher/classroom/{classroom_id}/classes",
                data={"name": name}, follow_redirects=True)
    s = get_session()
    try:
        return s.query(Class).filter_by(classroom_id=classroom_id, name=name).first().id
    finally:
        s.close()


def _create_activity(client, name, ref_id=None):
    data = {"name": name}
    if ref_id:
        data["reference_project_id"] = str(ref_id)
    client.post("/teacher/activities", data=data, follow_redirects=True)
    s = get_session()
    try:
        return s.query(Activity).filter_by(name=name).first().id
    finally:
        s.close()


def test_teacher_projects_dashboard_lists_own_projects(client):
    _login_teacher(client)
    _teacher_project(client, "mi-referencia.ino")

    r = client.get("/teacher/projects")
    assert r.status_code == 200
    assert b"mi-referencia.ino" in r.data


def test_teacher_creates_activity_in_library(client):
    _login_teacher(client)
    client.post("/teacher/activities", data={"name": "Actividad 1"}, follow_redirects=True)

    s = get_session()
    try:
        teacher = s.query(User).filter_by(role="teacher").first()
        a = s.query(Activity).filter_by(name="Actividad 1").first()
        assert a is not None
        assert a.teacher_id == teacher.id
        assert a.reference_project_id is None
    finally:
        s.close()


def test_teacher_creates_activity_with_reference(client):
    _login_teacher(client)
    pid = _teacher_project(client)

    client.post("/teacher/activities",
                data={"name": "Con referencia", "reference_project_id": str(pid)},
                follow_redirects=True)

    s = get_session()
    try:
        a = s.query(Activity).filter_by(name="Con referencia").first()
        assert a.reference_project_id == pid
    finally:
        s.close()


def test_teacher_cannot_assign_foreign_project_as_reference(client, seed_classroom):
    seed_classroom("ABC123")
    _register_student(client, "alumno@example.com")
    foreign_pid = client.post("/api/projects",
                              json={"name": "ajeno.ino", "data": {"state": {}}}).get_json()["id"]
    client.get("/logout")
    _login_teacher(client)

    client.post("/teacher/activities",
                data={"name": "Intentando ajeno", "reference_project_id": str(foreign_pid)},
                follow_redirects=True)

    s = get_session()
    try:
        a = s.query(Activity).filter_by(name="Intentando ajeno").first()
        assert a.reference_project_id is None  # rechazado silenciosamente
    finally:
        s.close()


def test_teacher_edits_activity(client):
    _login_teacher(client)
    pid = _teacher_project(client)
    aid = _create_activity(client, "Antes")

    client.post(f"/teacher/activities/{aid}/edit",
                data={"name": "Después", "reference_project_id": str(pid)},
                follow_redirects=True)

    s = get_session()
    try:
        a = s.get(Activity, aid)
        assert a.name == "Después"
        assert a.reference_project_id == pid
    finally:
        s.close()


def test_teacher_deletes_activity(client):
    _login_teacher(client)
    aid = _create_activity(client, "Para borrar")

    client.post(f"/teacher/activities/{aid}/delete", follow_redirects=True)

    s = get_session()
    try:
        assert s.get(Activity, aid) is None
    finally:
        s.close()


def test_teacher_assigns_activity_to_class(client, seed_classroom):
    seed_classroom("ABC123")
    _login_teacher(client)
    cid = _classroom_id()
    clid = _create_class(client, cid, "Clase 1")
    aid = _create_activity(client, "Actividad asignable")

    client.post(f"/teacher/class/{clid}/activities",
                data={"activity_id": str(aid)}, follow_redirects=True)

    s = get_session()
    try:
        ca = s.query(ClassActivity).filter_by(class_id=clid, activity_id=aid).first()
        assert ca is not None
    finally:
        s.close()


def test_teacher_cannot_assign_foreign_activity(client, seed_classroom):
    seed_classroom("ABC123")
    _login_teacher(client)
    cid = _classroom_id()
    clid = _create_class(client, cid, "Clase 1")

    # actividad de otro docente
    s = get_session()
    try:
        other = User(email="otro@example.com", name="Otro",
                     password_hash="x", role="teacher")
        s.add(other)
        s.flush()
        a = Activity(teacher_id=other.id, name="Ajeno")
        s.add(a)
        s.commit()
        aid = a.id
    finally:
        s.close()

    client.post(f"/teacher/class/{clid}/activities",
                data={"activity_id": str(aid)}, follow_redirects=True)

    s = get_session()
    try:
        assert s.query(ClassActivity).filter_by(class_id=clid, activity_id=aid).first() is None
    finally:
        s.close()


def test_student_sees_activities_in_class(client, seed_classroom):
    seed_classroom("ABC123")
    cid = _classroom_id()
    _register_student(client, "alumno@example.com")
    client.get("/logout")
    _login_teacher(client)
    clid = _create_class(client, cid, "Clase 1")
    aid = _create_activity(client, "Actividad visible")
    client.post(f"/teacher/class/{clid}/activities",
                data={"activity_id": str(aid)}, follow_redirects=True)
    client.get("/logout")
    client.post("/login", data={"email": "alumno@example.com", "password": "secreto123"},
                follow_redirects=True)

    r = client.get(f"/student/class/{clid}")
    assert r.status_code == 200
    assert b"Actividad visible" in r.data


def test_student_reads_reference_project(client, seed_classroom):
    seed_classroom("ABC123")
    cid = _classroom_id()
    _register_student(client, "alumno@example.com")
    client.get("/logout")
    _login_teacher(client)
    pid = _teacher_project(client)
    aid = _create_activity(client, "Ref", ref_id=pid)
    clid = _create_class(client, cid, "Clase 1")
    client.post(f"/teacher/class/{clid}/activities",
                data={"activity_id": str(aid)}, follow_redirects=True)
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


def test_student_clones_activity_to_account(client, seed_classroom):
    seed_classroom("ABC123")
    cid = _classroom_id()
    _register_student(client, "alumno@example.com")
    client.get("/logout")
    _login_teacher(client)
    pid = _teacher_project(client, "base.ino")
    aid = _create_activity(client, "Semáforo", ref_id=pid)
    clid = _create_class(client, cid, "Clase 1")
    client.post(f"/teacher/class/{clid}/activities",
                data={"activity_id": str(aid)}, follow_redirects=True)
    client.get("/logout")
    client.post("/login", data={"email": "alumno@example.com", "password": "secreto123"},
                follow_redirects=True)

    r = client.post(f"/student/class/{clid}/activities/{aid}/clone",
                    follow_redirects=False)

    # Redirige al editor con la copia abierta.
    assert r.status_code == 302
    assert "/app?project=" in r.headers["Location"]

    s = get_session()
    try:
        student = s.query(User).filter_by(email="alumno@example.com").first()
        clones = s.query(Project).filter_by(user_id=student.id).all()
        assert len(clones) == 1
        clone = clones[0]
        assert clone.class_id == clid
        assert clone.name == "Semáforo"
        ref = s.get(Project, pid)
        assert clone.data == ref.data
        assert clone.board == ref.board
    finally:
        s.close()


def test_student_cannot_clone_activity_without_reference(client, seed_classroom):
    seed_classroom("ABC123")
    cid = _classroom_id()
    _register_student(client, "alumno@example.com")
    client.get("/logout")
    _login_teacher(client)
    aid = _create_activity(client, "Sin base")  # sin proyecto de referencia
    clid = _create_class(client, cid, "Clase 1")
    client.post(f"/teacher/class/{clid}/activities",
                data={"activity_id": str(aid)}, follow_redirects=True)
    client.get("/logout")
    client.post("/login", data={"email": "alumno@example.com", "password": "secreto123"},
                follow_redirects=True)

    client.post(f"/student/class/{clid}/activities/{aid}/clone", follow_redirects=True)

    s = get_session()
    try:
        student = s.query(User).filter_by(email="alumno@example.com").first()
        assert s.query(Project).filter_by(user_id=student.id).count() == 0
    finally:
        s.close()


def test_student_cannot_clone_unassigned_activity(client, seed_classroom):
    seed_classroom("ABC123")
    cid = _classroom_id()
    _register_student(client, "alumno@example.com")
    client.get("/logout")
    _login_teacher(client)
    pid = _teacher_project(client, "base.ino")
    aid = _create_activity(client, "No asignada", ref_id=pid)
    clid = _create_class(client, cid, "Clase 1")  # actividad NO asignada a esta clase
    client.get("/logout")
    client.post("/login", data={"email": "alumno@example.com", "password": "secreto123"},
                follow_redirects=True)

    client.post(f"/student/class/{clid}/activities/{aid}/clone", follow_redirects=True)

    s = get_session()
    try:
        student = s.query(User).filter_by(email="alumno@example.com").first()
        assert s.query(Project).filter_by(user_id=student.id).count() == 0
    finally:
        s.close()
