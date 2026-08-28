"""Autorización común para colaboración por proyecto."""

from backend.models import Project, ProjectCollaborator

ROLES = {"viewer", "editor"}


def project_access(session, project_id: int, user_id: int, write: bool = False):
    project = session.get(Project, project_id)
    if not project:
        return None
    if project.user_id == user_id:
        return project, "owner"
    collaborator = session.query(ProjectCollaborator).filter_by(
        project_id=project_id, user_id=user_id
    ).first()
    if not collaborator or (write and collaborator.role != "editor"):
        return None
    return project, collaborator.role
