"""
Tests de proyectos (CRUD + ownership).

Cubre: crear/listar/leer/actualizar/eliminar, el PUT parcial (que no pisa el
sketch al renombrar) y el aislamiento entre usuarios.
"""

import json

from backend.db import get_session
from backend.models import Project, ProjectFile, User
from backend.project_files import backfill_project_files
import backend.routes.projects as projects_module


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


def test_project_revision_and_author_increment_on_save(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "a@example.com")

    created = _create(client).get_json()
    assert created["revision"] == 1
    assert isinstance(created["updated_by"], int)

    saved = client.put(
        f"/api/projects/{created['id']}", json={"name": "revision-2.ino"}
    ).get_json()
    assert saved["revision"] == 2
    assert saved["updated_by"] == created["updated_by"]

    loaded = client.get(f"/api/projects/{created['id']}").get_json()
    assert loaded["revision"] == 2
    assert loaded["updated_by"] == created["updated_by"]


def test_stale_project_revision_returns_conflict_without_overwriting(
    client, seed_classroom
):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    created = _create(client, name="original.ino").get_json()

    current = client.put(
        f"/api/projects/{created['id']}",
        json={"name": "version-2.ino", "revision": created["revision"]},
    )
    assert current.status_code == 200
    assert current.get_json()["revision"] == 2

    stale = client.put(
        f"/api/projects/{created['id']}",
        json={"name": "stale.ino", "revision": created["revision"]},
    )
    assert stale.status_code == 409
    body = stale.get_json()
    assert body["error"] == "conflict"
    assert body["current_revision"] == 2
    assert body["project"]["name"] == "version-2.ino"

    unchanged = client.get(f"/api/projects/{created['id']}").get_json()
    assert unchanged["name"] == "version-2.ino"
    assert unchanged["revision"] == 2


def test_invalid_project_revision_returns_bad_request(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    created = _create(client).get_json()

    for revision in (0, -1, True, "1"):
        response = client.put(
            f"/api/projects/{created['id']}",
            json={"name": "invalido.ino", "revision": revision},
        )
        assert response.status_code == 400


def test_strict_revisions_reject_legacy_put(monkeypatch, client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    created = _create(client).get_json()
    monkeypatch.setattr(projects_module, "STRICT_REVISIONS", True)

    response = client.put(
        f"/api/projects/{created['id']}", json={"name": "legacy.ino"}
    )
    assert response.status_code == 428
    assert response.get_json()["error"] == "revision_required"


def test_project_history_records_create_and_save(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    created = _create(client, name="historial.ino").get_json()

    first = client.get(f"/api/projects/{created['id']}/history")
    assert first.status_code == 200
    assert [(item["revision"], item["reason"]) for item in first.get_json()] == [(1, "create")]

    saved = client.put(
        f"/api/projects/{created['id']}",
        json={"name": "historial-2.ino", "revision": 1},
    )
    assert saved.status_code == 200

    history = client.get(f"/api/projects/{created['id']}/history").get_json()
    assert [item["revision"] for item in history] == [2, 1]
    assert history[0]["reason"] == "save"


def test_restore_history_creates_new_revision_without_deleting_history(
    client, seed_classroom
):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    created = _create(client, name="original.ino", data={"state": {"x": 1}}).get_json()
    client.put(
        f"/api/projects/{created['id']}",
        json={"name": "actual.ino", "data": {"state": {"x": 2}}, "revision": 1},
    )

    history = client.get(f"/api/projects/{created['id']}/history").get_json()
    original = next(item for item in history if item["revision"] == 1)
    restored = client.post(
        f"/api/projects/{created['id']}/history/{original['id']}/restore",
        json={"revision": 2},
    )
    assert restored.status_code == 200
    assert restored.get_json()["name"] == "original.ino"
    assert restored.get_json()["revision"] == 3

    final_history = client.get(f"/api/projects/{created['id']}/history").get_json()
    assert [item["revision"] for item in final_history] == [3, 2, 1]
    assert final_history[0]["reason"] == "restore"


def test_project_files_mirror_tabs_on_create(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    created = _create(
        client,
        name="con-tabs.ino",
        data={
            "state": {"blocks": {}},
            "tabs": [{"filename": "motores.h", "content": "void motor() {}"}],
        },
    ).get_json()

    response = client.get(f"/api/projects/{created['id']}/files")
    assert response.status_code == 200
    files = response.get_json()
    assert len(files) == 1
    assert files[0]["filename"] == "motores.h"
    assert files[0]["content"] == "void motor() {}"
    assert files[0]["revision"] == 1


def test_project_files_mirror_tab_changes_without_changing_project_contract(
    client, seed_classroom
):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    created = _create(
        client,
        data={
            "state": {"blocks": {}},
            "tabs": [{"filename": "motores.h", "content": "v1"}],
        },
    ).get_json()

    saved = client.put(
        f"/api/projects/{created['id']}",
        json={
            "revision": 1,
            "data": {
                "state": {"blocks": {}},
                "tabs": [{"filename": "motores.h", "content": "v2"}],
            },
        },
    )
    assert saved.status_code == 200
    assert json.loads(saved.get_json()["data"])["tabs"] == [
        {"filename": "motores.h", "content": "v2"}
    ]

    files = client.get(f"/api/projects/{created['id']}/files").get_json()
    assert files[0]["content"] == "v2"
    assert files[0]["revision"] == 2


def test_backfill_old_project_files_is_idempotent(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    s = get_session()
    try:
        student = s.query(User).filter_by(email="a@example.com").first()
        project = Project(
            user_id=student.id,
            name="antiguo.ino",
            data=json.dumps({
                "state": {"blocks": {}},
                "tabs": [{"filename": "legacy.h", "content": "v1"}],
            }),
        )
        s.add(project)
        s.commit()
        backfill_project_files(s)
        backfill_project_files(s)
        files = s.query(ProjectFile).filter_by(project_id=project.id).all()
        assert len(files) == 1
        assert files[0].filename == "legacy.h"
        assert files[0].revision == 1
    finally:
        s.close()


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
    assert items[0]["revision"] == 1
    assert isinstance(items[0]["updated_by"], int)

    pid = items[0]["id"]
    r2 = client.post(f"/api/teacher/regen/projects/{pid}/thumbnail",
                     json={"thumbnail": "data:image/png;base64,BBBB"})
    s = get_session()
    try:
        teacher_id = s.query(User).filter_by(role="teacher").first().id
    finally:
        s.close()
    assert r2.status_code == 200
    assert r2.get_json()["thumbnail"] == "data:image/png;base64,BBBB"
    assert r2.get_json()["revision"] == 2
    assert r2.get_json()["updated_by"] == teacher_id


def test_student_cannot_regen(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "a@example.com")  # sigue logueado como alumno
    r = client.get("/api/teacher/regen/projects")
    assert r.status_code == 403
