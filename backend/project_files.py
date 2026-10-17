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


def update_project_tab(project: Project, filename: str, content: str) -> None:
    """Actualiza un tab dentro del formato legacy de Project.data."""
    try:
        data = json.loads(project.data) if isinstance(project.data, str) else project.data
    except (TypeError, json.JSONDecodeError):
        data = {}
    if not isinstance(data, dict):
        data = {}
    tabs = data.get("tabs")
    if not isinstance(tabs, list):
        tabs = []
        data["tabs"] = tabs
    for tab in tabs:
        if isinstance(tab, dict) and tab.get("filename") == filename:
            tab["content"] = content
            break
    else:
        tabs.append({"filename": filename, "content": content})
    project.data = json.dumps(data)


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


def _document_tabs(project: Project):
    """Lista de tabs si el documento la declara; None si no se puede afirmar.

    None significa "no sabemos qué archivos tiene el proyecto" (data inválido o
    sin la clave 'tabs'): en ese caso no se poda el espejo.
    """
    try:
        data = json.loads(project.data) if isinstance(project.data, str) else project.data
    except (TypeError, json.JSONDecodeError):
        return None
    if not isinstance(data, dict):
        return None
    tabs = data.get("tabs")
    return tabs if isinstance(tabs, list) else None


def sync_project_files(session, project: Project, actor_id: int | None = None) -> None:
    """Espeja los tabs del documento y retira los que ya no están.

    El documento (Project.data) manda: un archivo que salió del proyecto no debe
    seguir en la tabla, porque se arrastra al copiar o guardar el proyecto en
    otra sesión. El contenido retirado sigue disponible en las revisiones.
    """
    existing = {file.filename: file for file in project.files}
    author_id = actor_id if actor_id is not None else project.updated_by
    tabs = _document_tabs(project)
    conservados = set()
    for tab in tabs_from_project(project):
        if not _valid_tab(tab):
            continue
        filename = tab["filename"]
        content = tab["content"]
        conservados.add(filename)
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

    # Poda: solo cuando el documento declara su lista de tabs.
    if tabs is None:
        return
    for filename, file in existing.items():
        if filename not in conservados:
            session.delete(file)


def backfill_project_files(session) -> None:
    """Backfill idempotente para proyectos antiguos que aún no tienen espejo."""
    projects = session.query(Project).all()
    for project in projects:
        if not project.files:
            sync_project_files(session, project)
    session.commit()
