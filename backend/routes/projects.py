"""
ArduBlock — Rutas de proyectos (CRUD)
"""

import json
import os
from pathlib import Path

from flask import Blueprint, jsonify, request

from backend.config import PROJECTS_DIR, validate_project_id

projects_bp = Blueprint("projects", __name__)


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
def list_projects():
    projects = []
    for f in PROJECTS_DIR.glob("*.json"):
        projects.append(
            {"id": f.stem, "name": f.stem, "modified": os.path.getmtime(str(f))}
        )
    return jsonify(projects)


@projects_bp.route("/api/projects/<project_id>", methods=["GET"])
def load_project(project_id):
    if not validate_project_id(project_id):
        return jsonify({"error": "ID de proyecto inválido"}), 400
    path = PROJECTS_DIR / f"{project_id}.json"
    if not path.exists():
        return jsonify({"error": "Proyecto no encontrado"}), 404
    with open(path) as f:
        data = json.load(f)
    return jsonify(data)


@projects_bp.route("/api/projects/<project_id>", methods=["PUT"])
def save_project(project_id):
    if not validate_project_id(project_id):
        return jsonify({"error": "ID de proyecto inválido"}), 400
    data = request.get_json()
    if not data:
        return jsonify({"error": "Datos inválidos"}), 400
    path = PROJECTS_DIR / f"{project_id}.json"
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    return jsonify({"status": "ok", "id": project_id})


@projects_bp.route("/api/projects/<project_id>", methods=["DELETE"])
def delete_project(project_id):
    if not validate_project_id(project_id):
        return jsonify({"error": "ID de proyecto inválido"}), 400
    path = PROJECTS_DIR / f"{project_id}.json"
    if not path.exists():
        return jsonify({"error": "Proyecto no encontrado"}), 404
    path.unlink()
    return jsonify({"status": "ok", "id": project_id})
