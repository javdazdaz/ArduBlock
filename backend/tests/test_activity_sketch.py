"""Tests del sketch de texto de una actividad: guardado, descarga y visibilidad.

El sketch lo publica el docente en la biblioteca de actividades y lo consume el
alumno desde la página de la clase (descargar, compilar, subir). Estos tests
cubren el guardado y los permisos de lectura; la compilación y el flasheo son
del navegador y no se ejercitan aquí.
"""

from backend.db import get_session
from backend.models import Activity, Class, ClassActivity, Classroom, ClassroomStudent, User


TEACHER_EMAIL = "profesor@example.com"
TEACHER_PASSWORD = "profesor123"

SKETCH = """#include <Wire.h>

void setup() {
  Serial.begin(115200);
  Serial.println("Hola");
}

void loop() {}
"""


def _login_teacher(client):
    return client.post("/login", data={
        "email": TEACHER_EMAIL, "password": TEACHER_PASSWORD,
    }, follow_redirects=True)


def _logout(client):
    return client.get("/logout", follow_redirects=True)


def _classroom(join_code="ABC123", name="Robótica III° 2026"):
    s = get_session()
    try:
        teacher = s.query(User).filter_by(role="teacher").first()
        classroom = Classroom(name=name, join_code=join_code, teacher_id=teacher.id)
        s.add(classroom)
        s.commit()
        return classroom.id
    finally:
        s.close()


def _class(classroom_id, name="Clase 1"):
    s = get_session()
    try:
        cls = Class(name=name, classroom_id=classroom_id)
        s.add(cls)
        s.commit()
        return cls.id
    finally:
        s.close()


def _student(client, email="alumno@example.com", join_code="ABC123"):
    client.post("/register", data={
        "join_code": join_code, "name": "Alumno", "email": email,
        "password": "secreto123",
    }, follow_redirects=True)
    s = get_session()
    try:
        return s.query(User).filter_by(email=email).first().id
    finally:
        s.close()


def _create_activity(client, name, sketch=SKETCH, board=None):
    data = {"name": name}
    if sketch is not None:
        data["sketch"] = sketch
    if board is not None:
        data["sketch_board"] = board
    client.post("/teacher/activities", data=data, follow_redirects=True)
    s = get_session()
    try:
        activity = s.query(Activity).filter_by(name=name).first()
        return activity.id if activity else None
    finally:
        s.close()


def _assign(class_id, activity_id):
    s = get_session()
    try:
        s.add(ClassActivity(class_id=class_id, activity_id=activity_id))
        s.commit()
    finally:
        s.close()


def _activity(activity_id):
    s = get_session()
    try:
        return s.get(Activity, activity_id)
    finally:
        s.close()


def test_teacher_saves_sketch_and_board(client):
    _login_teacher(client)
    aid = _create_activity(client, "OLED", board="arduino:avr:uno")

    a = _activity(aid)
    assert a.sketch_text.strip().startswith("#include <Wire.h>")
    assert a.sketch_board == "arduino:avr:uno"


def test_sketch_board_defaults_when_omitted(client):
    _login_teacher(client)
    aid = _create_activity(client, "Sin placa")

    assert _activity(aid).sketch_board == "arduino:avr:uno"


def test_sketch_without_board_column_stays_null(client):
    _login_teacher(client)
    aid = _create_activity(client, "Solo bloques", sketch=None)

    a = _activity(aid)
    assert a.sketch_text is None
    assert a.sketch_board is None


def test_invalid_board_does_not_save_sketch(client):
    _login_teacher(client)
    aid = _create_activity(client, "Placa falsa", board="arduino:avr:leonardo")

    a = _activity(aid)
    assert a.sketch_text is None
    assert a.sketch_board is None


def test_oversized_sketch_is_rejected(client):
    _login_teacher(client)
    big = "// " + "x" * (33 * 1024)
    aid = _create_activity(client, "Enorme", sketch=big)

    assert _activity(aid).sketch_text is None


def test_crlf_is_normalized(client):
    _login_teacher(client)
    aid = _create_activity(client, "CRLF", sketch="void setup() {\r\n}\r\nvoid loop() {}\r\n")

    assert "\r" not in _activity(aid).sketch_text


def test_edit_replaces_and_clears_sketch(client):
    _login_teacher(client)
    aid = _create_activity(client, "Editable")

    client.post(f"/teacher/activities/{aid}/edit",
                data={"name": "Editable", "sketch": "void setup() {}"}, follow_redirects=True)
    assert _activity(aid).sketch_text == "void setup() {}"

    client.post(f"/teacher/activities/{aid}/edit",
                data={"name": "Editable", "sketch": ""}, follow_redirects=True)
    assert _activity(aid).sketch_text is None


def test_edit_keeps_previous_sketch_when_board_is_invalid(client):
    _login_teacher(client)
    aid = _create_activity(client, "Protegida")
    original = _activity(aid).sketch_text

    client.post(f"/teacher/activities/{aid}/edit",
                data={"name": "Renombrada", "sketch": "// otro", "sketch_board": "nope:nope:nope"},
                follow_redirects=True)

    a = _activity(aid)
    assert a.name == "Renombrada"
    assert a.sketch_text == original


def test_teacher_downloads_own_sketch(client):
    _login_teacher(client)
    aid = _create_activity(client, "Descargable")

    r = client.get(f"/actividad/{aid}/sketch.ino")
    assert r.status_code == 200
    assert "attachment" in r.headers["Content-Disposition"]
    assert "descargable.ino" in r.headers["Content-Disposition"]
    assert b"#include <Wire.h>" in r.data


def test_enrolled_student_downloads_assigned_sketch(client):
    classroom_id = _classroom()
    class_id = _class(classroom_id)

    _login_teacher(client)
    aid = _create_activity(client, "En clase")
    _assign(class_id, aid)
    _logout(client)

    _student(client)
    r = client.get(f"/actividad/{aid}/sketch.ino")
    assert r.status_code == 200
    assert b"Serial.begin" in r.data


def test_student_without_assignment_gets_404(client):
    classroom_id = _classroom()
    _class(classroom_id)

    _login_teacher(client)
    aid = _create_activity(client, "No asignada")
    _logout(client)

    _student(client)
    assert client.get(f"/actividad/{aid}/sketch.ino").status_code == 404


def test_anonymous_download_is_redirected(client):
    _login_teacher(client)
    aid = _create_activity(client, "Privada")
    _logout(client)

    r = client.get(f"/actividad/{aid}/sketch.ino")
    assert r.status_code in (302, 401)


def test_activity_without_sketch_has_no_download(client):
    _login_teacher(client)
    aid = _create_activity(client, "Sin sketch", sketch=None)

    assert client.get(f"/actividad/{aid}/sketch.ino").status_code == 404


def test_student_class_page_shows_sketch_panel(client):
    classroom_id = _classroom()
    class_id = _class(classroom_id)
    s = get_session()
    try:
        classroom = s.get(Classroom, classroom_id)
        join_code = classroom.join_code
    finally:
        s.close()

    _login_teacher(client)
    aid = _create_activity(client, "Panel visible")
    _assign(class_id, aid)
    _logout(client)

    _student(client, join_code=join_code)
    r = client.get(f"/student/class/{class_id}")
    assert r.status_code == 200
    assert b"sketch-code" in r.data
    assert f"/actividad/{aid}/sketch.ino".encode() in r.data
