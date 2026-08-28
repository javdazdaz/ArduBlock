"""Snapshots persistentes de proyectos para historial y restauración."""

import json

from backend.models import Project, ProjectRevision


def project_snapshot(project: Project) -> str:
    """Serializa el estado completo sin alterar el formato actual de data."""
    return json.dumps(
        {
            "name": project.name,
            "data": project.data,
            "board": project.board,
            "class_id": project.class_id,
            "thumbnail": project.thumbnail,
        },
        ensure_ascii=False,
        sort_keys=True,
    )


def record_project_revision(session, project: Project, author_id: int | None, reason: str):
    """Añade un snapshot a la transacción actual; el caller hace commit."""
    session.add(ProjectRevision(
        project_id=project.id,
        revision=project.revision or 1,
        author_id=author_id,
        reason=reason,
        snapshot=project_snapshot(project),
    ))
