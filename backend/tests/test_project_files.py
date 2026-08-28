import json

from backend.db import get_session
from backend.models import ProjectFile


def _register(client, email, code="ABC123"):
    client.post(
        "/register",
        data={
            "join_code": code,
            "name": "Alumno",
            "email": email,
            "password": "secreto123",
        },
        follow_redirects=True,
    )


def _project_with_file(client):
    response = client.post(
        "/api/projects",
        json={
            "name": "texto.ino",
            "data": {
                "state": {"blocks": {}},
                "tabs": [{"filename": "motores.h", "content": "abc"}],
            },
        },
    )
    project_id = response.get_json()["id"]
    session = get_session()
    try:
        file_id = session.query(ProjectFile).filter_by(project_id=project_id).one().id
    finally:
        session.close()
    return project_id, file_id


def test_text_operation_updates_file_and_is_pollable(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    project_id, file_id = _project_with_file(client)

    operation = client.post(
        f"/api/projects/{project_id}/files/{file_id}/operations",
        json={
            "base_revision": 1,
            "client_id": "browser-a",
            "sequence": 1,
            "changes": [{"from": 3, "to": 3, "insert": "!"}],
        },
    )
    assert operation.status_code == 200
    body = operation.get_json()
    assert body["accepted"] is True
    assert body["revision"] == 2
    assert body["changes"] == [{"from": 3, "to": 3, "insert": "!"}]

    files = client.get(f"/api/projects/{project_id}/files").get_json()
    assert files[0]["content"] == "abc!"
    assert files[0]["revision"] == 2
    project = client.get(f"/api/projects/{project_id}").get_json()
    assert project["revision"] == 2
    assert json.loads(project["data"])["tabs"] == [
        {"filename": "motores.h", "content": "abc!"}
    ]

    operations = client.get(
        f"/api/projects/{project_id}/files/{file_id}/operations?since=1"
    )
    assert operations.status_code == 200
    assert operations.get_json()[0]["revision"] == 2


def test_concurrent_text_inserts_converge_and_duplicate_is_idempotent(
    client, seed_classroom
):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    project_id, file_id = _project_with_file(client)

    first_payload = {
        "base_revision": 1,
        "client_id": "client-a",
        "sequence": 1,
        "changes": [{"from": 1, "to": 1, "insert": "A"}],
    }
    first = client.post(
        f"/api/projects/{project_id}/files/{file_id}/operations", json=first_payload
    )
    assert first.status_code == 200

    duplicate = client.post(
        f"/api/projects/{project_id}/files/{file_id}/operations", json=first_payload
    )
    assert duplicate.status_code == 200
    assert duplicate.get_json()["duplicate"] is True
    assert duplicate.get_json()["revision"] == 2

    second = client.post(
        f"/api/projects/{project_id}/files/{file_id}/operations",
        json={
            "base_revision": 1,
            "client_id": "client-b",
            "sequence": 1,
            "changes": [{"from": 1, "to": 1, "insert": "B"}],
        },
    )
    assert second.status_code == 200

    files = client.get(f"/api/projects/{project_id}/files").get_json()
    assert files[0]["content"] == "aABbc"
    assert files[0]["revision"] == 3


def test_text_operation_ahead_of_server_returns_conflict(client, seed_classroom):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    project_id, file_id = _project_with_file(client)

    response = client.post(
        f"/api/projects/{project_id}/files/{file_id}/operations",
        json={
            "base_revision": 2,
            "client_id": "browser-a",
            "sequence": 1,
            "changes": [{"from": 3, "to": 3, "insert": "!"}],
        },
    )
    assert response.status_code == 409
    assert response.get_json()["error"] == "revision_ahead"
    assert response.get_json()["current_revision"] == 1


def test_stale_operation_validates_against_its_base_document_length(
    client, seed_classroom
):
    seed_classroom("ABC123")
    _register(client, "a@example.com")
    project_id, file_id = _project_with_file(client)

    deleted = client.post(
        f"/api/projects/{project_id}/files/{file_id}/operations",
        json={
            "base_revision": 1,
            "client_id": "client-a",
            "sequence": 1,
            "changes": [{"from": 2, "to": 3, "insert": ""}],
        },
    )
    assert deleted.status_code == 200

    inserted = client.post(
        f"/api/projects/{project_id}/files/{file_id}/operations",
        json={
            "base_revision": 1,
            "client_id": "client-b",
            "sequence": 1,
            "changes": [{"from": 3, "to": 3, "insert": "!"}],
        },
    )
    assert inserted.status_code == 200
    assert client.get(f"/api/projects/{project_id}/files").get_json()[0]["content"] == "ab!"
