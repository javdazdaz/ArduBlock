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
    assert r.headers["Location"].endswith(f"/project/{pid + 1}")

    s = get_session()
    try:
        student = s.query(User).filter_by(email="alumno@example.com").first()
        clones = s.query(Project).filter_by(user_id=student.id).all()
        assert len(clones) == 1
        clone = clones[0]
        assert clone.class_id == clid
        assert clone.name == "Semáforo"
        assert clone.revision == 1
        assert clone.updated_by == student.id
        ref = s.get(Project, pid)
        assert clone.data == ref.data
        assert clone.board == ref.board
    finally:
        s.close()


def _setup_activity_class(client, *, name="Semáforo", ref_name="base.ino", desc=None, instr=None):
    """Profesor crea referencia, actividad y clase; devuelve (aid, clid)."""
    _login_teacher(client)
    pid = _teacher_project(client, ref_name)
    data = {"name": name, "reference_project_id": str(pid)}
    if desc is not None:
        data["description"] = desc
    if instr is not None:
        data["instructions"] = instr
    client.post("/teacher/activities", data=data, follow_redirects=True)
    s = get_session()
    try:
        aid = s.query(Activity).filter_by(name=name).first().id
    finally:
        s.close()
    clid = _create_class(client, _classroom_id(), "Clase 1")
    client.post(f"/teacher/class/{clid}/activities",
                data={"activity_id": str(aid)}, follow_redirects=True)
    client.get("/logout")
    return aid, clid, pid


def _login_student(client, email="alumno@example.com"):
    client.post("/login", data={"email": email, "password": "secreto123"},
                follow_redirects=True)


def test_cloning_twice_opens_the_existing_copy(client, seed_classroom):
    seed_classroom("ABC123")
    _register_student(client, "alumno@example.com")
    client.get("/logout")
    aid, clid, pid = _setup_activity_class(client)
    _login_student(client)

    first = client.post(f"/student/class/{clid}/activities/{aid}/clone")
    assert first.status_code == 302
    copy_id = int(first.headers["Location"].rsplit("/", 1)[-1])

    second = client.post(f"/student/class/{clid}/activities/{aid}/clone")
    assert second.status_code == 302
    assert second.headers["Location"].endswith(f"/project/{copy_id}")

    s = get_session()
    try:
        student = s.query(User).filter_by(email="alumno@example.com").first()
        clones = s.query(Project).filter_by(user_id=student.id).all()
        assert len(clones) == 1
        assert clones[0].activity_id == aid
    finally:
        s.close()


def test_cloning_with_force_creates_another_copy(client, seed_classroom):
    seed_classroom("ABC123")
    _register_student(client, "alumno@example.com")
    client.get("/logout")
    aid, clid, _ = _setup_activity_class(client)
    _login_student(client)

    client.post(f"/student/class/{clid}/activities/{aid}/clone")
    second = client.post(f"/student/class/{clid}/activities/{aid}/clone",
                         data={"force": "1"})

    assert second.status_code == 302
    s = get_session()
    try:
        student = s.query(User).filter_by(email="alumno@example.com").first()
        clones = s.query(Project).filter_by(user_id=student.id).all()
        assert len(clones) == 2
        assert all(c.activity_id == aid for c in clones)
    finally:
        s.close()


def test_activity_keeps_description_and_instructions(client, seed_classroom):
    seed_classroom("ABC123")
    _register_student(client, "alumno@example.com")
    client.get("/logout")
    aid, clid, _ = _setup_activity_class(
        client, name="Robot", desc="Mueve el robot en cuadrado",
        instr="Paso 1: avanzar. Paso 2: girar 90 grados.",
    )

    _login_teacher(client)
    page = client.get("/teacher/activities")
    assert "Mueve el robot en cuadrado".encode() in page.data
    assert "Paso 1: avanzar".encode() in page.data

    client.get("/logout")
    _login_student(client)
    student_page = client.get(f"/student/class/{clid}")
    assert "Mueve el robot en cuadrado".encode() in student_page.data
    assert "Paso 1: avanzar".encode() in student_page.data


def test_student_view_marks_the_activity_as_cloned(client, seed_classroom):
    seed_classroom("ABC123")
    _register_student(client, "alumno@example.com")
    client.get("/logout")
    aid, clid, _ = _setup_activity_class(client)
    _login_student(client)

    client.post(f"/student/class/{clid}/activities/{aid}/clone")
    page = client.get(f"/student/class/{clid}")

    assert "Ya tienes esta actividad".encode() in page.data
    assert "Clonar de nuevo".encode() in page.data


def test_deleting_a_reference_project_warns_about_activities(client, seed_classroom):
    seed_classroom("ABC123")
    _register_student(client, "alumno@example.com")
    client.get("/logout")
    aid, clid, pid = _setup_activity_class(client)

    _login_teacher(client)
    blocked = client.delete(f"/api/projects/{pid}")
    assert blocked.status_code == 409
    body = blocked.get_json()
    assert body["error"] == "reference_in_use"
    assert body["activities"] == ["Semáforo"]

    forced = client.delete(f"/api/projects/{pid}?force=1")
    assert forced.status_code == 200
    assert forced.get_json()["unlinked_activities"] == 1

    s = get_session()
    try:
        assert s.get(Activity, aid).reference_project_id is None
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
