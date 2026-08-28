"""
Tests de clases dentro de cursos: CRUD de clases, asociación de proyectos a
clase y vistas docente/estudiante con autorización.
"""

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


def _classroom_id(join_code="ABC123"):
    s = get_session()
    try:
        return s.query(Classroom).filter_by(join_code=join_code).first().id
    finally:
        s.close()


def _class_id(name="Clase 1"):
    s = get_session()
    try:
        return s.query(Class).filter_by(name=name).first().id
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


def test_teacher_creates_class(client, seed_classroom):
    _login_teacher(client)
    seed_classroom("ABC123")
    cid = _classroom_id()

    client.post(f"/teacher/classroom/{cid}/classes",
                data={"name": "Clase 1"}, follow_redirects=True)

    s = get_session()
    try:
        assert s.query(Class).filter_by(classroom_id=cid, name="Clase 1").count() == 1
    finally:
        s.close()


def test_teacher_renames_class(client, seed_classroom):
    _login_teacher(client)
    seed_classroom("ABC123")
    cid = _classroom_id()
    clid = _seed_class(cid, "Clase 1")

    client.post(f"/teacher/class/{clid}/rename",
                data={"name": "Clase Renombrada"}, follow_redirects=True)

    s = get_session()
    try:
        assert s.get(Class, clid).name == "Clase Renombrada"
    finally:
        s.close()


def test_teacher_deletes_class_keeps_projects(client, seed_classroom):
    _login_teacher(client)
    seed_classroom("ABC123")
    cid = _classroom_id()
    clid = _seed_class(cid, "Clase 1")

    s = get_session()
    try:
        teacher = s.query(User).filter_by(role="teacher").first()
        p = Project(user_id=teacher.id, name="p", data="{}", class_id=clid)
        s.add(p)
        s.commit()
        pid = p.id
    finally:
        s.close()

    client.post(f"/teacher/class/{clid}/delete", follow_redirects=True)

    s = get_session()
    try:
        assert s.get(Class, clid) is None
        proj = s.get(Project, pid)
        teacher = s.query(User).filter_by(role="teacher").first()
        assert proj is not None          # el proyecto no se borra
        assert proj.class_id is None     # queda sin clase
        assert proj.revision == 2
        assert proj.updated_by == teacher.id
    finally:
        s.close()


def test_student_creates_project_in_class(client, seed_classroom):
    seed_classroom("ABC123")
    cid = _classroom_id()
    clid = _seed_class(cid, "Clase 1")

    _register_student(client, "alumno@example.com")
    r = client.post("/api/projects",
                    json={"name": "p.ino", "data": {"state": {}}, "class_id": clid})
    assert r.status_code == 201
    assert r.get_json()["class_id"] == clid


def test_student_cannot_create_project_in_foreign_class(client, seed_classroom):
    seed_classroom("ABC123")
    s = get_session()
    try:
        teacher = s.query(User).filter_by(role="teacher").first()
        c2 = Classroom(name="Otra", join_code="XYZ999", teacher_id=teacher.id)
        s.add(c2)
        s.flush()
        cl2 = Class(name="Clase ajena", classroom_id=c2.id)
        s.add(cl2)
        s.commit()
        cl2_id = cl2.id
    finally:
        s.close()

    _register_student(client, "alumno@example.com")  # matriculado en ABC123
    r = client.post("/api/projects",
                    json={"name": "p", "data": {}, "class_id": cl2_id})
    assert r.status_code == 403


def test_teacher_views_class_and_student_projects(client, seed_classroom):
    seed_classroom("ABC123")
    _register_student(client, "alumno@example.com")
    client.get("/logout")
    _login_teacher(client)
    cid = _classroom_id()
    client.post(f"/teacher/classroom/{cid}/classes",
                data={"name": "Clase 1"}, follow_redirects=True)
    clid = _class_id("Clase 1")

    # alumno crea proyecto en la clase
    client.get("/logout")
    client.post("/login", data={
        "email": "alumno@example.com", "password": "secreto123",
    }, follow_redirects=True)
    client.post("/api/projects",
                json={"name": "p.ino", "data": {"state": {}}, "class_id": clid})

    client.get("/logout")
    _login_teacher(client)

    # dashboard de clase (grid de estudiantes)
    r = client.get(f"/teacher/class/{clid}")
    assert r.status_code == 200

    s = get_session()
    try:
        sid = s.query(User).filter_by(email="alumno@example.com").first().id
    finally:
        s.close()
    # proyectos del alumno en cuadrícula
    r = client.get(f"/teacher/class/{clid}/student/{sid}")
    assert r.status_code == 200
    assert b"p.ino" in r.data


def test_student_cannot_create_class(client, seed_classroom):
    seed_classroom("ABC123")
    _register_student(client, "alumno@example.com")
    cid = _classroom_id()

    r = client.post(f"/teacher/classroom/{cid}/classes",
                    data={"name": "hack"}, follow_redirects=False)
    assert r.status_code == 302  # no autorizado


def test_student_class_dashboard(client, seed_classroom):
    seed_classroom("ABC123")
    cid = _classroom_id()
    clid = _seed_class(cid, "Clase 1")

    _register_student(client, "alumno@example.com")
    client.post("/api/projects",
                json={"name": "p.ino", "data": {"state": {}}, "class_id": clid})

    r = client.get(f"/student/class/{clid}")
    assert r.status_code == 200
    assert b"p.ino" in r.data
    assert b"/project/new/class/" in r.data
