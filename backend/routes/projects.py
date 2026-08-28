"""
ArduBlock — Rutas de proyectos (CRUD con SQLite)

Modos:
  - Usuario logueado: proyectos en DB (user_id).
  - Guest mode: el frontend usa localStorage (estas rutas no se usan).
"""

import json
import os
from pathlib import Path

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from backend.models import Project, ProjectRevision, Classroom, ClassroomStudent, Class, User, Activity, ClassActivity
from backend.db import get_session as _get_session
from backend.project_history import record_project_revision
from backend.project_files import sync_project_files

projects_bp = Blueprint("projects", __name__)

MAX_NAME_LEN = 100
STRICT_REVISIONS = os.environ.get("ARDUBLOCK_COLLAB_STRICT_REVISIONS") == "1"


def _clean_name(value, fallback="Sin título"):
    name = (value or "").strip()
    if not name:
        name = fallback
    return name[:MAX_NAME_LEN]


def _coerce_data(value):
    """Normaliza `data`: acepta dict (lo serializa) o string ya serializado."""
    if isinstance(value, str):
        return value
    return json.dumps(value)


def _update_project(s, project, data, actor_id):
    """Actualiza un proyecto y devuelve una respuesta de conflicto o None."""
    missing = object()
    expected = data.get("revision", missing)
    if expected is missing and STRICT_REVISIONS:
        return jsonify({"error": "revision_required"}), 428
    if expected is not missing:
        if isinstance(expected, bool) or not isinstance(expected, int) or expected < 1:
            return jsonify({"error": "revision inválida"}), 400
        if project.revision != expected:
            return jsonify({
                "error": "conflict",
                "current_revision": project.revision,
                "project": project.to_dict(),
            }), 409

    values = {}
    if "name" in data:
        values["name"] = _clean_name(data.get("name"))
    if "data" in data:
        new_data = _coerce_data(data.get("data"))
        if not new_data:
            return jsonify({"error": "'data' inválido"}), 400
        values["data"] = new_data
    if "board" in data:
        values["board"] = data.get("board", project.board)
    if "thumbnail" in data:
        values["thumbnail"] = data.get("thumbnail")

    if expected is not missing:
        values["revision"] = Project.revision + 1
        values["updated_by"] = actor_id
        changed = (
            s.query(Project)
            .filter(Project.id == project.id, Project.revision == expected)
            .update(values, synchronize_session=False)
        )
        if changed != 1:
            s.rollback()
            current = s.get(Project, project.id)
            return jsonify({
                "error": "conflict",
                "current_revision": current.revision,
                "project": current.to_dict(),
            }), 409
        s.refresh(project)
        sync_project_files(s, project, actor_id)
        record_project_revision(s, project, actor_id, "save")
        s.commit()
        return None

    for field, value in values.items():
        setattr(project, field, value)
    project.revision = (project.revision or 1) + 1
    project.updated_by = actor_id
    sync_project_files(s, project, actor_id)
    record_project_revision(s, project, actor_id, "save")
    s.commit()
    return None


def _write_tabs(sketch_dir: Path, tabs: list[dict]) -> None:
    """Escribe archivos .h de los tabs en el directorio del sketch.

    Usado por el blueprint de compilación (routes/compile.py) para volcar
    los tabs antes de invocar arduino-cli.
    """
    if not tabs:
        return
    if not isinstance(tabs, list) or len(tabs) > 32:
        raise ValueError("Tabs inválidos")
    for tab in tabs:
        if not isinstance(tab, dict):
            raise ValueError("Tabs inválidos")
        filename = tab.get("filename", "")
        content = tab.get("content", "")
        if not isinstance(filename, str) or not isinstance(content, str):
            raise ValueError("Tabs inválidos")
        if not filename or not content.strip():
            continue
        safe = os.path.basename(filename)
        if safe != filename or ".." in safe or safe == "ardublock_sketch.ino":
            raise ValueError("Nombre de tab no permitido")
        if not safe.endswith((".h", ".hpp", ".html")):
            raise ValueError("Extensión de tab no permitida")
        if len(content.encode("utf-8")) > 512 * 1024:
            raise ValueError("Tab demasiado grande")
        (sketch_dir / safe).write_text(content)


def _teacher_owns_enrollment(s, student_user_id) -> bool:
    """¿El alumno está matriculado en un aula del profesor actual?"""
    return (
        s.query(ClassroomStudent)
        .join(Classroom, Classroom.id == ClassroomStudent.classroom_id)
        .filter(
            Classroom.teacher_id == current_user.id,
            ClassroomStudent.user_id == student_user_id,
        )
        .first()
    ) is not None


@projects_bp.route("/api/projects", methods=["GET"])
@login_required
def list_projects():
    s = _get_session()
    try:
        projects = (
            s.query(Project)
            .filter_by(user_id=current_user.id)
            .order_by(Project.updated_at.desc())
            .all()
        )
        return jsonify([p.to_dict() for p in projects])
    finally:
        s.close()


@projects_bp.route("/api/projects/<int:project_id>", methods=["GET"])
@login_required
def load_project(project_id):
    s = _get_session()
    try:
        p = s.get(Project, project_id)
        if not p or p.user_id != current_user.id:
            return jsonify({"error": "Proyecto no encontrado"}), 404
        return jsonify(p.to_dict())
    finally:
        s.close()


@projects_bp.route("/api/projects/<int:project_id>/history", methods=["GET"])
@login_required
def list_project_history(project_id):
    """Devuelve las revisiones persistentes del proyecto propio."""
    s = _get_session()
    try:
        project = s.get(Project, project_id)
        if not project or project.user_id != current_user.id:
            return jsonify({"error": "Proyecto no encontrado"}), 404
        return jsonify([
            {
                "id": revision.id,
                "revision": revision.revision,
                "author_id": revision.author_id,
                "reason": revision.reason,
                "created_at": revision.created_at.isoformat() if revision.created_at else None,
            }
            for revision in project.revisions
        ])
    finally:
        s.close()


@projects_bp.route("/api/projects/<int:project_id>/files", methods=["GET"])
@login_required
def list_project_files(project_id):
    """Devuelve los archivos de texto espejados del proyecto propio."""
    s = _get_session()
    try:
        project = s.get(Project, project_id)
        if not project or project.user_id != current_user.id:
            return jsonify({"error": "Proyecto no encontrado"}), 404
        return jsonify([
            {
                "id": file.id,
                "filename": file.filename,
                "content": file.content,
                "revision": file.revision,
                "updated_by": file.updated_by,
                "updated_at": file.updated_at.isoformat() if file.updated_at else None,
            }
            for file in project.files
        ])
    finally:
        s.close()


@projects_bp.route("/api/projects/<int:project_id>/history/<int:history_id>/restore", methods=["POST"])
@login_required
def restore_project_history(project_id, history_id):
    """Restaura un snapshot como una nueva revisión del proyecto propio."""
    data = request.get_json(silent=True) or {}
    expected = data.get("revision")
    if expected is not None and (isinstance(expected, bool) or not isinstance(expected, int) or expected < 1):
        return jsonify({"error": "revision inválida"}), 400
    s = _get_session()
    try:
        project = s.get(Project, project_id)
        if not project or project.user_id != current_user.id:
            return jsonify({"error": "Proyecto no encontrado"}), 404
        if expected is not None and project.revision != expected:
            return jsonify({
                "error": "conflict",
                "current_revision": project.revision,
                "project": project.to_dict(),
            }), 409
        history = s.query(ProjectRevision).filter_by(
            id=history_id, project_id=project_id
        ).first()
        if not history:
            return jsonify({"error": "Revisión no encontrada"}), 404
        try:
            snapshot = json.loads(history.snapshot)
        except (TypeError, json.JSONDecodeError):
            return jsonify({"error": "Snapshot inválido"}), 500
        if not isinstance(snapshot, dict) or not isinstance(snapshot.get("data"), str):
            return jsonify({"error": "Snapshot inválido"}), 500

        project.name = _clean_name(snapshot.get("name"))
        project.data = snapshot["data"]
        project.board = snapshot.get("board", project.board)
        restored_class_id = snapshot.get("class_id")
        project.class_id = restored_class_id if restored_class_id and s.get(Class, restored_class_id) else None
        project.thumbnail = snapshot.get("thumbnail")
        project.revision = (project.revision or 1) + 1
        project.updated_by = current_user.id
        sync_project_files(s, project, current_user.id)
        record_project_revision(s, project, current_user.id, "restore")
        s.commit()
        return jsonify(project.to_dict())
    finally:
        s.close()


@projects_bp.route("/api/teacher/projects/<int:project_id>", methods=["GET"])
@login_required
def load_student_project(project_id):
    """Profesor: lee (solo lectura) el proyecto de un alumno de sus aulas."""
    if not current_user.is_teacher:
        return jsonify({"error": "No autorizado"}), 403
    s = _get_session()
    try:
        p = s.get(Project, project_id)
        if not p:
            return jsonify({"error": "Proyecto no encontrado"}), 404
        if not _teacher_owns_enrollment(s, p.user_id):
            return jsonify({"error": "No autorizado"}), 403
        return jsonify(p.to_dict())
    finally:
        s.close()


@projects_bp.route("/api/teacher/projects/<int:project_id>", methods=["PUT"])
@login_required
def save_student_project(project_id):
    """Profesor: edita (guarda) el proyecto de un alumno de sus aulas."""
    if not current_user.is_teacher:
        return jsonify({"error": "No autorizado"}), 403
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Datos inválidos"}), 400

    s = _get_session()
    try:
        p = s.get(Project, project_id)
        if not p:
            return jsonify({"error": "Proyecto no encontrado"}), 404
        if not _teacher_owns_enrollment(s, p.user_id):
            return jsonify({"error": "No autorizado"}), 403

        conflict = _update_project(s, p, data, current_user.id)
        if conflict:
            return conflict
        return jsonify(p.to_dict())
    finally:
        s.close()


@projects_bp.route("/api/reference-projects/<int:project_id>", methods=["GET"])
@login_required
def load_reference_project(project_id):
    """Lee (solo lectura) un proyecto asignado como referencia a una actividad
    de un curso donde el usuario está matriculado, o el propio docente dueño."""
    s = _get_session()
    try:
        p = s.get(Project, project_id)
        if not p:
            return jsonify({"error": "Proyecto no encontrado"}), 404
        is_reference = (
            s.query(ClassActivity)
            .join(Activity, Activity.id == ClassActivity.activity_id)
            .join(Class, Class.id == ClassActivity.class_id)
            .join(ClassroomStudent, ClassroomStudent.classroom_id == Class.classroom_id)
            .filter(
                Activity.reference_project_id == project_id,
                ClassroomStudent.user_id == current_user.id,
            )
            .first()
        ) is not None
        if not is_reference and not (current_user.is_teacher and p.user_id == current_user.id):
            return jsonify({"error": "No autorizado"}), 403
        return jsonify(p.to_dict())
    finally:
        s.close()


@projects_bp.route("/api/projects", methods=["POST"])
@login_required
def create_project():
    data = request.get_json()
    if not isinstance(data, dict):
        return jsonify({"error": "Datos inválidos"}), 400

    project_data = _coerce_data(data.get("data", {}))
    if not project_data:
        return jsonify({"error": "Datos inválidos: falta 'data'"}), 400

    class_id = data.get("class_id")
    s = _get_session()
    try:
        if class_id is not None:
            cls = s.get(Class, class_id)
            if not cls:
                return jsonify({"error": "Clase no encontrada"}), 404
            enrolled = (
                s.query(ClassroomStudent)
                .filter_by(classroom_id=cls.classroom_id, user_id=current_user.id)
                .first()
            )
            if not enrolled:
                return jsonify({"error": "No autorizado"}), 403
        p = Project(
            user_id=current_user.id,
            name=_clean_name(data.get("name")),
            data=project_data,
            board=data.get("board", "arduino:avr:uno"),
            class_id=class_id,
            thumbnail=data.get("thumbnail"),
            revision=1,
            updated_by=current_user.id,
        )
        s.add(p)
        s.flush()
        sync_project_files(s, p, current_user.id)
        record_project_revision(s, p, current_user.id, "create")
        s.commit()
        return jsonify(p.to_dict()), 201
    finally:
        s.close()


@projects_bp.route("/api/projects/<int:project_id>", methods=["PUT"])
@login_required
def save_project(project_id):
    data = request.get_json()
    if not isinstance(data, dict):
        return jsonify({"error": "Datos inválidos"}), 400

    s = _get_session()
    try:
        p = s.get(Project, project_id)
        if not p or p.user_id != current_user.id:
            return jsonify({"error": "Proyecto no encontrado"}), 404

        conflict = _update_project(s, p, data, current_user.id)
        if conflict:
            return conflict
        return jsonify(p.to_dict())
    finally:
        s.close()


@projects_bp.route("/api/projects/<int:project_id>", methods=["DELETE"])
@login_required
def delete_project(project_id):
    s = _get_session()
    try:
        p = s.get(Project, project_id)
        if not p or p.user_id != current_user.id:
            return jsonify({"error": "Proyecto no encontrado"}), 404
        # Si era referencia de alguna actividad, desvincularla (evita FK colgante).
        s.query(Activity).filter_by(reference_project_id=project_id).update(
            {"reference_project_id": None}
        )
        s.delete(p)
        s.commit()
        return jsonify({"status": "ok"})
    finally:
        s.close()


# ═══ Regeneración de thumbnails (profesor) ══════════════

@projects_bp.route("/api/teacher/regen/projects", methods=["GET"])
@login_required
def teacher_regen_projects():
    """Profesor: lista los proyectos de sus alumnos para regenerar thumbnails."""
    if not current_user.is_teacher:
        return jsonify({"error": "No autorizado"}), 403
    s = _get_session()
    try:
        rows = (
            s.query(Project)
            .join(User, User.id == Project.user_id)
            .join(ClassroomStudent, ClassroomStudent.user_id == User.id)
            .join(Classroom, Classroom.id == ClassroomStudent.classroom_id)
            .filter(Classroom.teacher_id == current_user.id)
            .order_by(Project.updated_at.desc())
            .all()
        )
        return jsonify([{
            "id": p.id,
            "name": p.name,
            "data": p.data,
            "has_thumbnail": bool(p.thumbnail),
            "revision": p.revision,
            "updated_by": p.updated_by,
        } for p in rows])
    finally:
        s.close()


@projects_bp.route("/api/teacher/regen/projects/<int:project_id>/thumbnail", methods=["POST"])
@login_required
def teacher_regen_thumbnail(project_id):
    """Profesor: guarda el thumbnail regenerado de un proyecto de sus alumnos."""
    if not current_user.is_teacher:
        return jsonify({"error": "No autorizado"}), 403
    data = request.get_json(silent=True) or {}
    s = _get_session()
    try:
        p = s.get(Project, project_id)
        if not p:
            return jsonify({"error": "Proyecto no encontrado"}), 404
        if not _teacher_owns_enrollment(s, p.user_id):
            return jsonify({"error": "No autorizado"}), 403
        p.thumbnail = data.get("thumbnail")
        p.revision = (p.revision or 1) + 1
        p.updated_by = current_user.id
        record_project_revision(s, p, current_user.id, "save")
        s.commit()
        return jsonify(p.to_dict())
    finally:
        s.close()
