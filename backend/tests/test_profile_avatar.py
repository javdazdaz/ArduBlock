import base64

from backend.db import get_session
from backend.models import User, Project, ProjectCollaborator

# PNG mínimo válido para probar la ruta sin depender de Pillow.
PNG = b"\x89PNG\r\n\x1a\n" + b"avatar-test"
DATA = "data:image/png;base64," + base64.b64encode(PNG).decode()


def _login(client, email, password="secreto123"):
    client.post("/login", data={"email": email, "password": password})


def test_avatar_is_private_and_project_scoped(client, seed_student):
    owner = seed_student("owner@example.com")
    viewer = seed_student("viewer@example.com")
    outsider = seed_student("outsider@example.com")
    s = get_session()
    try:
        owner_id = s.query(User).filter_by(email="owner@example.com").one().id
        viewer_id = s.query(User).filter_by(email="viewer@example.com").one().id
        outsider_id = s.query(User).filter_by(email="outsider@example.com").one().id
        project = Project(user_id=owner_id, name="P", data="{}")
        s.add(project)
        s.flush()
        s.add(ProjectCollaborator(project_id=project.id, user_id=viewer_id, role="viewer"))
        s.commit()
        project_id = project.id
    finally:
        s.close()

    assert client.get(f"/api/profile/avatar/{owner_id}").status_code == 302
    _login(client, "owner@example.com")
    saved = client.post("/api/profile/avatar", json={"avatar_type": "upload", "avatar_data": DATA})
    assert saved.status_code == 200
    assert client.get(f"/api/profile/avatar/{owner_id}").data == PNG
    client.get("/logout")

    _login(client, "viewer@example.com")
    assert client.get(f"/api/profile/avatar/{owner_id}").status_code == 403
    assert client.get(f"/api/projects/{project_id}/avatar/{owner_id}").status_code == 200
    client.get("/logout")

    _login(client, "outsider@example.com")
    assert client.get(f"/api/projects/{project_id}/avatar/{owner_id}").status_code == 404
    assert client.get(f"/api/profile/avatar/{owner_id}").status_code == 403


def test_avatar_rejects_unprocessed_data(client, seed_student):
    user = seed_student("avatar@example.com")
    _login(client, "avatar@example.com")
    response = client.post("/api/profile/avatar", json={
        "avatar_type": "upload", "avatar_data": "data:image/png;base64,not-an-image",
    })
    assert response.status_code == 400
    s = get_session()
    try:
        refreshed = s.query(User).filter_by(email="avatar@example.com").one()
        assert refreshed.avatar_data is None
    finally:
        s.close()
