"""Autorización común para colaboración por proyecto."""

from backend.models import Class, Classroom, Project, ProjectCollaborator

ROLES = {"viewer", "editor"}


def project_access(session, project_id: int, user_id: int, write: bool = False):
    project = session.get(Project, project_id)
    if not project:
        return None
    if project.user_id == user_id:
        return project, "owner"
    teacher_owns_project = session.query(Class).join(Classroom).filter(
        Class.id == project.class_id, Classroom.teacher_id == user_id
    ).first()
    if teacher_owns_project:
        return project, "teacher"
    collaborator = session.query(ProjectCollaborator).filter_by(
        project_id=project_id, user_id=user_id
    ).first()
    if not collaborator or (write and collaborator.role != "editor"):
        return None
    return project, collaborator.role
