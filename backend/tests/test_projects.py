"""
Tests de proyectos (CRUD + ownership).

Cubre: crear/listar/leer/actualizar/eliminar, el PUT parcial (que no pisa el
sketch al renombrar) y el aislamiento entre usuarios.
"""

from backend.db import get_session


def _register(client, email, code="ABC123", password="secreto123"):
    client.post("/register", data={
        "join_code": code, "name": "Alumno", "email": email, "password": password,
    }, follow_redirects=True)


def _create(client, name="proyecto1", data=None):
    payload = {"name": name, "data": data or {"state": {"blocks": {}}, "tabs": []}}
    return client.post("/api/projects", json=payload)


def test_create_and_list(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "a@example.com")

    r = _create(client)
    assert r.status_code == 201
    pid = r.get_json()["id"]

    items = client.get("/api/projects").get_json()
    assert len(items) == 1
    assert items[0]["id"] == pid


def test_load_project(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    pid = _create(client, data={"state": {"x": 1}}).get_json()["id"]

    r = client.get(f"/api/projects/{pid}")
    assert r.status_code == 200
    assert r.get_json()["data"] == '{"state": {"x": 1}}'


def test_partial_update_keeps_data(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    pid = _create(client).get_json()["id"]

    # Renombrar SIN tocar data no debe pisar el sketch.
    r = client.put(f"/api/projects/{pid}", json={"name": "renombrado.ino"})
    assert r.status_code == 200
    body = r.get_json()
    assert body["name"] == "renombrado.ino"
    assert "blocks" in body["data"]

    # Actualizar data sí la reemplaza.
    r = client.put(f"/api/projects/{pid}", json={"data": {"state": {"x": 1}}})
    assert r.get_json()["data"] == '{"state": {"x": 1}}'


def test_ownership_isolation(app, client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    pid = _create(client).get_json()["id"]

    # Segundo estudiante en otro client (cookie propia).
    client2 = app.test_client()
    _register(client2, "b@example.com")

    assert client2.get(f"/api/projects/{pid}").status_code == 404
    assert client2.put(f"/api/projects/{pid}", json={"name": "x"}).status_code == 404
    assert client2.delete(f"/api/projects/{pid}").status_code == 404

    # El dueño sigue viéndolo.
    assert client.get(f"/api/projects/{pid}").status_code == 200


def test_delete_project(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    pid = _create(client).get_json()["id"]

    assert client.delete(f"/api/projects/{pid}").status_code == 200
    assert client.get("/api/projects").get_json() == []


def test_project_thumbnail_roundtrip(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    thumb = "data:image/png;base64,AAAA"

    r = client.post("/api/projects", json={"name": "p.ino", "data": {}, "thumbnail": thumb})
    assert r.status_code == 201
    pid = r.get_json()["id"]
    assert r.get_json()["thumbnail"] == thumb

    # GET devuelve el thumbnail
    assert client.get(f"/api/projects/{pid}").get_json()["thumbnail"] == thumb

    # PUT lo limpia
    client.put(f"/api/projects/{pid}", json={"thumbnail": None})
    assert client.get(f"/api/projects/{pid}").get_json()["thumbnail"] is None


def test_teacher_regen_list_and_save(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    _create(client, name="p.ino")
    client.get("/logout")
    client.post("/login", data={"email": "profesor@example.com", "password": "profesor123"}, follow_redirects=True)

    r = client.get("/api/teacher/regen/projects")
    assert r.status_code == 200
    items = r.get_json()
    assert len(items) == 1
    assert items[0]["name"] == "p.ino"
    assert "data" in items[0]

    pid = items[0]["id"]
    r2 = client.post(f"/api/teacher/regen/projects/{pid}/thumbnail",
                     json={"thumbnail": "data:image/png;base64,BBBB"})
    assert r2.status_code == 200
    assert r2.get_json()["thumbnail"] == "data:image/png;base64,BBBB"


def test_student_cannot_regen(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "a@example.com")  # sigue logueado como alumno
    r = client.get("/api/teacher/regen/projects")
    assert r.status_code == 403
