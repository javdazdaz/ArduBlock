"""Espejo transitorio entre Project.data y archivos colaborativos."""

import json
import os

from backend.models import Project, ProjectFile

_ALLOWED_EXTENSIONS = (".h", ".hpp", ".html")


def tabs_from_project(project: Project) -> list[dict]:
    """Extrae tabs del formato actual, devolviendo lista vacía si es inválido."""
    try:
        data = json.loads(project.data) if isinstance(project.data, str) else project.data
    except (TypeError, json.JSONDecodeError):
        return []
    tabs = data.get("tabs", []) if isinstance(data, dict) else []
    return tabs if isinstance(tabs, list) else []


def _valid_tab(tab) -> bool:
    if not isinstance(tab, dict):
        return False
    filename = tab.get("filename")
    content = tab.get("content")
    if not isinstance(filename, str) or not isinstance(content, str):
        return False
    if not filename or os.path.basename(filename) != filename or ".." in filename:
        return False
    return filename.endswith(_ALLOWED_EXTENSIONS)


def sync_project_files(session, project: Project, actor_id: int | None = None) -> None:
    """Crea/actualiza el espejo sin borrar archivos ausentes del snapshot."""
    existing = {file.filename: file for file in project.files}
    author_id = actor_id if actor_id is not None else project.updated_by
    for tab in tabs_from_project(project):
        if not _valid_tab(tab):
            continue
        filename = tab["filename"]
        content = tab["content"]
        file = existing.get(filename)
        if file is None:
            session.add(ProjectFile(
                project_id=project.id,
                filename=filename,
                content=content,
                revision=1,
                updated_by=author_id,
            ))
        elif file.content != content:
            file.content = content
            file.revision = (file.revision or 1) + 1
            file.updated_by = author_id


def backfill_project_files(session) -> None:
    """Backfill idempotente para proyectos antiguos que aún no tienen espejo."""
    projects = session.query(Project).all()
    for project in projects:
        if not project.files:
            sync_project_files(session, project)
    session.commit()
