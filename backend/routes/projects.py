"""
ArduBlock — Rutas de proyectos (CRUD con SQLite)

Modos:
  - Usuario logueado: proyectos en DB (user_id)
  - Guest mode: el frontend usa localStorage (estas rutas no se usan)
"""

import json
import os
from pathlib import Path

from flask import Blueprint, jsonify, request, session
from flask_login import current_user, login_required
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models import Project
from backend.config import DATABASE_PATH, validate_project_id

projects_bp = Blueprint("projects", __name__)
_engine = create_engine(f"sqlite:///{DATABASE_PATH}", echo=False)
_SessionFactory = sessionmaker(bind=_engine)


def _get_session():
    return _SessionFactory()


def _write_tabs(sketch_dir: Path, tabs: list[dict]) -> None:
    """Escribe archivos .h de los tabs en el directorio del sketch."""
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


@projects_bp.route("/api/projects", methods=["POST"])
@login_required
def create_project():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Datos inválidos"}), 400

    s = _get_session()
    try:
        p = Project(
            user_id=current_user.id,
            name=data.get("name", "Sin título"),
            data=json.dumps(data.get("data", {})),
            board=data.get("board", "arduino:avr:uno"),
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
    if not data:
        return jsonify({"error": "Datos inválidos"}), 400

    s = _get_session()
    try:
        p = s.get(Project, project_id)
        if not p or p.user_id != current_user.id:
            return jsonify({"error": "Proyecto no encontrado"}), 404

        p.name = data.get("name", p.name)
        p.data = json.dumps(data.get("data", {}))
        p.board = data.get("board", p.board)
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
        s.delete(p)
        s.commit()
        return jsonify({"status": "ok"})
    finally:
        s.close()
