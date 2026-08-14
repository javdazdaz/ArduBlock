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

from backend.models import Project, Classroom, ClassroomStudent, Class, User, Activity
from backend.db import get_session as _get_session

projects_bp = Blueprint("projects", __name__)

MAX_NAME_LEN = 100


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


def _write_tabs(sketch_dir: Path, tabs: list[dict]) -> None:
    """Escribe archivos .h de los tabs en el directorio del sketch.

    Usado por el blueprint de compilación (routes/compile.py) para volcar
    los tabs antes de invocar arduino-cli.
    """
    if not tabs:
        return
    for tab in tabs:
        filename = tab.get("filename", "")
        content = tab.get("content", "")
        if not filename or not content.strip():
            continue
        safe = os.path.basename(filename)
        if safe != filename or ".." in safe:
            continue
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

        # Solo actualiza campos presentes (mismo criterio que PUT /api/projects).
        if "name" in data:
            p.name = _clean_name(data.get("name"))
        if "data" in data:
            new_data = _coerce_data(data.get("data"))
            if not new_data:
                return jsonify({"error": "'data' inválido"}), 400
            p.data = new_data
        if "board" in data:
            p.board = data.get("board", p.board)
        if "thumbnail" in data:
            p.thumbnail = data.get("thumbnail")
        s.commit()
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
            s.query(Activity)
            .join(ClassroomStudent, ClassroomStudent.classroom_id == Activity.classroom_id)
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
        )
        s.add(p)
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

        # Solo actualiza campos presentes: un PUT parcial (ej. renombrar)
        # no debe pisar el sketch con datos vacíos.
        if "name" in data:
            p.name = _clean_name(data.get("name"))
        if "data" in data:
            new_data = _coerce_data(data.get("data"))
            if not new_data:
                return jsonify({"error": "'data' inválido"}), 400
            p.data = new_data
        if "board" in data:
            p.board = data.get("board", p.board)
        if "thumbnail" in data:
            p.thumbnail = data.get("thumbnail")
        s.commit()
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
        s.commit()
        return jsonify(p.to_dict())
    finally:
        s.close()
