"""
ArduBlock — Rutas de proyectos (CRUD con SQLite)

Modos:
  - Usuario logueado: proyectos en DB (user_id).
  - Guest mode: el frontend usa localStorage (estas rutas no se usan).
"""

import json
import os
import threading
from pathlib import Path

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from backend.models import Project, ProjectFile, ProjectFileOperation, ProjectBlockOperation, ProjectRevision, ProjectCollaborator, Classroom, ClassroomStudent, Class, User, Activity, ClassActivity
from backend.db import get_session as _get_session
from backend.project_history import record_project_revision
from backend.project_files import sync_project_files, update_project_tab
from backend.block_operations import apply_operation, semantic_state_from_workspace, validate_operation
from backend.text_ot import apply_changes, transform_changes, validate_changes
from backend.collaboration import broker
from backend.project_permissions import ROLES, project_access

projects_bp = Blueprint("projects", __name__)

MAX_NAME_LEN = 100
STRICT_REVISIONS = os.environ.get("ARDUBLOCK_COLLAB_STRICT_REVISIONS") == "1"
_FILE_OPERATION_LOCK = threading.Lock()


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
        access = project_access(s, project_id, current_user.id)
        if not access:
            return jsonify({"error": "Proyecto no encontrado"}), 404
        project, _role = access
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


@projects_bp.route("/api/projects/<int:project_id>/collaborators", methods=["GET"])
@login_required
def list_project_collaborators(project_id):
    s = _get_session()
    try:
        access = project_access(s, project_id, current_user.id)
        if not access:
            return jsonify({"error": "Proyecto no encontrado"}), 404
        project, role = access
        rows = s.query(ProjectCollaborator).filter_by(project_id=project_id).all()
        return jsonify({
            "current_user_role": role,
            "collaborators": [{"user_id": row.user_id, "email": row.user.email,
                         "role": row.role, "created_at": row.created_at.isoformat() if row.created_at else None}
                        for row in rows],
        })
    finally:
        s.close()


@projects_bp.route("/api/projects/<int:project_id>/collaborators", methods=["POST"])
@login_required
def add_project_collaborator(project_id):
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    role = data.get("role", "viewer")
    if not isinstance(email, str) or not email.strip() or role not in ROLES:
        return jsonify({"error": "Colaborador inválido"}), 400
    s = _get_session()
    try:
        project = s.get(Project, project_id)
        if not project or project.user_id != current_user.id:
            return jsonify({"error": "Proyecto no encontrado"}), 404
        user = s.query(User).filter_by(email=email.strip().lower()).first()
        if not user or user.id == project.user_id:
            return jsonify({"error": "Usuario no encontrado"}), 404
        row = s.query(ProjectCollaborator).filter_by(project_id=project_id, user_id=user.id).first()
        if row:
            row.role = role
        else:
            row = ProjectCollaborator(project_id=project_id, user_id=user.id, role=role)
            s.add(row)
        s.commit()
        return jsonify({"user_id": user.id, "email": user.email, "role": role}), 200
    finally:
        s.close()


@projects_bp.route("/api/projects/<int:project_id>/collaborators/<int:user_id>", methods=["DELETE"])
@login_required
def remove_project_collaborator(project_id, user_id):
    s = _get_session()
    try:
        project = s.get(Project, project_id)
        if not project or project.user_id != current_user.id:
            return jsonify({"error": "Proyecto no encontrado"}), 404
        row = s.query(ProjectCollaborator).filter_by(project_id=project_id, user_id=user_id).first()
        if not row:
            return jsonify({"error": "Colaborador no encontrado"}), 404
        s.delete(row)
        s.commit()
        return jsonify({"removed": True})
    finally:
        s.close()


@projects_bp.route("/api/projects/<int:project_id>/files", methods=["GET"])
@login_required
def list_project_files(project_id):
    """Devuelve los archivos de texto espejados del proyecto propio."""
    s = _get_session()
    try:
        access = project_access(s, project_id, current_user.id)
        if not access:
            return jsonify({"error": "Proyecto no encontrado"}), 404
        project, _role = access
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


def _owned_project_file(session, project_id, file_id):
    file = session.get(ProjectFile, file_id)
    if not file or file.project_id != project_id:
        return None
    return file if project_access(session, project_id, current_user.id, write=False) else None


@projects_bp.route("/api/projects/<int:project_id>/files/<int:file_id>/operations", methods=["GET"])
@login_required
def list_file_operations(project_id, file_id):
    """Devuelve operaciones posteriores para polling/reconexión."""
    since = request.args.get("since", default=0, type=int)
    if since < 0:
        return jsonify({"error": "since inválido"}), 400
    s = _get_session()
    try:
        file = _owned_project_file(s, project_id, file_id)
        if not file:
            return jsonify({"error": "Archivo no encontrado"}), 404
        operations = (
            s.query(ProjectFileOperation)
            .filter(
                ProjectFileOperation.file_id == file.id,
                ProjectFileOperation.revision > since,
            )
            .order_by(ProjectFileOperation.revision.asc())
            .all()
        )
        return jsonify([
            {
                "id": operation.id,
                "revision": operation.revision,
                "base_revision": operation.base_revision,
                "client_id": operation.client_id,
                "sequence": operation.sequence,
                "changes": json.loads(operation.changes),
                "author_id": operation.author_id,
                "created_at": operation.created_at.isoformat() if operation.created_at else None,
            }
            for operation in operations
        ])
    finally:
        s.close()


@projects_bp.route("/api/projects/<int:project_id>/files/<int:file_id>/operations", methods=["POST"])
@login_required
def submit_file_operation(project_id, file_id):
    """Acepta una operación OT y la aplica en orden central del servidor."""
    data = request.get_json(silent=True) or {}
    base_revision = data.get("base_revision")
    client_id = data.get("client_id")
    sequence = data.get("sequence")
    changes = data.get("changes")
    if (
        isinstance(base_revision, bool) or not isinstance(base_revision, int) or base_revision < 1
        or not isinstance(client_id, str) or not client_id or len(client_id) > 100
        or isinstance(sequence, bool) or not isinstance(sequence, int) or sequence < 0
        or not isinstance(changes, list)
    ):
        return jsonify({"error": "Operación inválida"}), 400

    _FILE_OPERATION_LOCK.acquire()
    s = _get_session()
    try:
        file = _owned_project_file(s, project_id, file_id)
        if not file:
            return jsonify({"error": "Archivo no encontrado"}), 404
        if not project_access(s, project_id, current_user.id, write=True):
            return jsonify({"error": "Permiso de edición requerido"}), 403

        duplicate = s.query(ProjectFileOperation).filter_by(
            file_id=file.id, client_id=client_id, sequence=sequence
        ).first()
        if duplicate:
            return jsonify({
                "accepted": True,
                "revision": duplicate.revision,
                "changes": json.loads(duplicate.changes),
                "duplicate": True,
            })

        if base_revision > file.revision:
            return jsonify({
                "error": "revision_ahead",
                "current_revision": file.revision,
            }), 409
        transformed = changes
        remote_operations = []
        base_length = len(file.content)
        if base_revision < file.revision:
            remote_operations = (
                s.query(ProjectFileOperation)
                .filter(
                    ProjectFileOperation.file_id == file.id,
                    ProjectFileOperation.revision > base_revision,
                )
                .order_by(ProjectFileOperation.revision.asc())
                .all()
            )
            for remote in reversed(remote_operations):
                remote_changes = json.loads(remote.changes)
                base_length -= sum(
                    len(change["insert"]) - (change["to"] - change["from"])
                    for change in remote_changes
                )
        try:
            validate_changes(base_length, changes)
        except ValueError as error:
            return jsonify({"error": str(error)}), 400

        if base_revision < file.revision:
            for remote in remote_operations:
                transformed = transform_changes(
                    transformed,
                    json.loads(remote.changes),
                    client_id,
                    remote.client_id,
                )
        try:
            transformed = validate_changes(len(file.content), transformed)
        except ValueError as error:
            return jsonify({"error": str(error)}), 400

        new_revision = file.revision + 1
        file.content = apply_changes(file.content, transformed)
        file.revision = new_revision
        file.updated_by = current_user.id
        project = file.project
        update_project_tab(project, file.filename, file.content)
        project.revision = (project.revision or 1) + 1
        project.updated_by = current_user.id
        record_project_revision(s, project, current_user.id, "save")
        operation = ProjectFileOperation(
            file_id=file.id,
            revision=new_revision,
            base_revision=base_revision,
            client_id=client_id,
            sequence=sequence,
            changes=json.dumps(transformed, ensure_ascii=False),
            author_id=current_user.id,
        )
        s.add(operation)
        s.commit()
        broker.broadcast(project_id, file_id, {
            "type": "operation",
            "revision": new_revision,
            "base_revision": base_revision,
            "client_id": client_id,
            "sequence": sequence,
            "changes": transformed,
            "author_id": current_user.id,
        })
        return jsonify({
            "accepted": True,
            "revision": new_revision,
            "changes": transformed,
        })
    finally:
        s.close()
        _FILE_OPERATION_LOCK.release()


def _current_block_state(session, project):
    try:
        payload = json.loads(project.data) if isinstance(project.data, str) else project.data
    except (TypeError, json.JSONDecodeError):
        payload = {}
    state = semantic_state_from_workspace(payload.get("state", {}) if isinstance(payload, dict) else {})
    operations = (
        session.query(ProjectBlockOperation)
        .filter_by(project_id=project.id)
        .order_by(ProjectBlockOperation.revision.asc())
        .all()
    )
    for stored in operations:
        state = apply_operation(state, json.loads(stored.operation))
    return state


@projects_bp.route("/api/projects/<int:project_id>/block-operations", methods=["GET"])
@login_required
def list_block_operations(project_id):
    since = request.args.get("since", default=0, type=int)
    if since < 0:
        return jsonify({"error": "since inválido"}), 400
    s = _get_session()
    try:
        access = project_access(s, project_id, current_user.id)
        if not access:
            return jsonify({"error": "Proyecto no encontrado"}), 404
        project, _role = access
        rows = s.query(ProjectBlockOperation).filter(
            ProjectBlockOperation.project_id == project_id,
            ProjectBlockOperation.revision > since,
        ).order_by(ProjectBlockOperation.revision.asc()).all()
        return jsonify([{
            "id": row.id, "revision": row.revision, "base_revision": row.base_revision,
            "client_id": row.client_id, "sequence": row.sequence,
            "operation": json.loads(row.operation), "author_id": row.author_id,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        } for row in rows])
    finally:
        s.close()


@projects_bp.route("/api/projects/<int:project_id>/block-operations", methods=["POST"])
@login_required
def submit_block_operation(project_id):
    data = request.get_json(silent=True) or {}
    base_revision = data.get("base_revision")
    client_id = data.get("client_id")
    sequence = data.get("sequence")
    operation = data.get("operation")
    if (isinstance(base_revision, bool) or not isinstance(base_revision, int) or base_revision < 1
            or not isinstance(client_id, str) or not client_id or len(client_id) > 100
            or isinstance(sequence, bool) or not isinstance(sequence, int) or sequence < 0
            or not isinstance(operation, dict)):
        return jsonify({"error": "Operación inválida"}), 400
    try:
        validate_operation(operation)
    except ValueError as error:
        return jsonify({"error": str(error)}), 400
    _FILE_OPERATION_LOCK.acquire()
    s = _get_session()
    try:
        access = project_access(s, project_id, current_user.id, write=True)
        if not access:
            return jsonify({"error": "Proyecto no encontrado"}), 404
        project, _role = access
        duplicate = s.query(ProjectBlockOperation).filter_by(
            project_id=project_id, client_id=client_id, sequence=sequence
        ).first()
        if duplicate:
            return jsonify({"accepted": True, "duplicate": True, "revision": duplicate.revision,
                            "operation": json.loads(duplicate.operation)})
        current_revision = s.query(ProjectBlockOperation).filter_by(project_id=project_id).count() + 2
        if base_revision > current_revision:
            return jsonify({"error": "revision_ahead", "current_revision": current_revision}), 409
        try:
            state = _current_block_state(s, project)
            state = apply_operation(state, operation)
        except ValueError as error:
            return jsonify({"error": str(error), "current_revision": current_revision}), 409
        row = ProjectBlockOperation(
            project_id=project_id, revision=current_revision, base_revision=base_revision,
            client_id=client_id, sequence=sequence, operation=json.dumps(operation, ensure_ascii=False),
            author_id=current_user.id,
        )
        s.add(row)
        s.commit()
        broker.broadcast(project_id, 0, {
            "type": "block_operation",
            "revision": current_revision,
            "base_revision": base_revision,
            "client_id": client_id,
            "sequence": sequence,
            "operation": operation,
            "author_id": current_user.id,
        })
        return jsonify({"accepted": True, "revision": current_revision, "operation": operation})
    finally:
        s.close()
        _FILE_OPERATION_LOCK.release()


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
