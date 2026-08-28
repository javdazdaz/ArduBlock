from backend.db import get_session
from backend.models import Class, Classroom, Project, ProjectCollaborator, User


def register(client, email):
    return client.post("/register", data={"join_code": "ABC123", "name": "Usuario",
        "email": email, "password": "secreto123"}, follow_redirects=True)


def login(client, email, password="secreto123"):
    return client.post("/login", data={"email": email, "password": password}, follow_redirects=True)


def test_project_collaborator_roles_control_collaboration_access(client, seed_classroom):
    seed_classroom("ABC123")
    register(client, "owner@example.com")
    created = client.post("/api/projects", json={"name": "compartido.ino", "data": {
        "state": {"blocks": {"blocks": []}}, "tabs": []
    }}).get_json()
    project_id = created["id"]
    client.get("/logout")
    register(client, "viewer@example.com")
    client.get("/logout")
    login(client, "owner@example.com")

    invited = client.post(f"/api/projects/{project_id}/collaborators", json={
        "email": "viewer@example.com", "role": "viewer"
    })
    assert invited.status_code == 200
    viewer_id = invited.get_json()["user_id"]
    client.get("/logout")
    login(client, "viewer@example.com")

    assert client.get(f"/api/projects/{project_id}/files").status_code == 200
    blocked = client.post(f"/api/projects/{project_id}/block-operations", json={
        "base_revision": 1, "client_id": "viewer-tab", "sequence": 1,
        "operation": {"type": "create_block", "block_id": "b1", "block_type": "text"},
    })
    assert blocked.status_code == 404

    client.get("/logout")
    login(client, "owner@example.com")
    changed = client.post(f"/api/projects/{project_id}/collaborators", json={
        "email": "viewer@example.com", "role": "editor"
    })
    assert changed.status_code == 200
    client.get("/logout")
    login(client, "viewer@example.com")
    allowed = client.post(f"/api/projects/{project_id}/block-operations", json={
        "base_revision": 1, "client_id": "editor-tab", "sequence": 1,
        "operation": {"type": "create_block", "block_id": "b1", "block_type": "text"},
    })
    assert allowed.status_code == 200

    client.get("/logout")
    login(client, "owner@example.com")
    removed = client.delete(f"/api/projects/{project_id}/collaborators/{viewer_id}")
    assert removed.status_code == 200
    client.get("/logout")
    login(client, "viewer@example.com")
    assert client.get(f"/api/projects/{project_id}/files").status_code == 404


def test_classroom_teacher_can_load_and_collaborate_on_student_project(client, seed_classroom):
    seed_classroom("ABC123")
    register(client, "student@example.com")
    client.get("/logout")
    register(client, "collaborator@example.com")
    session = get_session()
    try:
        student = session.query(User).filter_by(email="student@example.com").one()
        classroom = session.query(Classroom).filter_by(join_code="ABC123").one()
        cls = Class(name="Sesión", classroom_id=classroom.id)
        session.add(cls)
        session.flush()
        project = Project(user_id=student.id, class_id=cls.id, name="estudiante.ino",
                          data='{"state":{"blocks":{"blocks":[]}},"tabs":[]}')
        session.add(project)
        session.commit()
        project_id = project.id
    finally:
        session.close()
    client.get("/logout")
    login(client, "profesor@example.com", "profesor123")

    assert client.get(f"/api/projects/{project_id}").status_code == 200
    assert client.get(f"/api/projects/{project_id}/files").status_code == 200
    added = client.post(f"/api/projects/{project_id}/collaborators", json={
        "email": "collaborator@example.com", "role": "editor"
    })
    assert added.status_code == 200, added.get_json()
