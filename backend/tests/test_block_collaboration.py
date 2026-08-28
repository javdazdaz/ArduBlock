import json

from backend.db import get_session
from backend.models import ProjectBlockOperation


def _register(client, email, code="ABC123"):
    client.post("/register", data={"join_code": code, "name": "Alumno", "email": email,
                                    "password": "secreto123"}, follow_redirects=True)


def _project(client):
    response = client.post("/api/projects", json={"name": "bloques.ino", "data": {
        "state": {"blocks": {"blocks": []}, "variables": []}, "tabs": []
    }})
    return response.get_json()["id"]


def test_block_operation_is_persisted_and_pollable(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    project_id = _project(client)
    response = client.post(f"/api/projects/{project_id}/block-operations", json={
        "base_revision": 1, "client_id": "browser-a", "sequence": 1,
        "operation": {"type": "create_block", "block_id": "b1", "block_type": "controls_if"},
    })
    assert response.status_code == 200
    assert response.get_json()["revision"] == 2
    assert response.get_json()["accepted"] is True

    operations = client.get(f"/api/projects/{project_id}/block-operations?since=1")
    assert operations.status_code == 200
    assert operations.get_json()[0]["operation"]["block_id"] == "b1"

    session = get_session()
    try:
        assert session.query(ProjectBlockOperation).count() == 1
    finally:
        session.close()


def test_duplicate_block_operation_is_idempotent(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    project_id = _project(client)
    payload = {"base_revision": 1, "client_id": "browser-a", "sequence": 1,
               "operation": {"type": "create_block", "block_id": "b1", "block_type": "text"}}
    first = client.post(f"/api/projects/{project_id}/block-operations", json=payload)
    duplicate = client.post(f"/api/projects/{project_id}/block-operations", json=payload)
    assert first.status_code == duplicate.status_code == 200
    assert duplicate.get_json()["duplicate"] is True
    assert duplicate.get_json()["revision"] == 2


def test_block_operation_rejects_stale_revision_without_new_row(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    project_id = _project(client)
    first = client.post(f"/api/projects/{project_id}/block-operations", json={
        "base_revision": 1, "client_id": "a", "sequence": 1,
        "operation": {"type": "create_block", "block_id": "b1", "block_type": "text"},
    })
    assert first.status_code == 200
    stale = client.post(f"/api/projects/{project_id}/block-operations", json={
        "base_revision": 1, "client_id": "b", "sequence": 1,
        "operation": {"type": "create_block", "block_id": "b2", "block_type": "text"},
    })
    assert stale.status_code == 200
    assert stale.get_json()["revision"] == 3
