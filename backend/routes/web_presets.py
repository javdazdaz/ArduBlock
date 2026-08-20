"""
ArduBlock — Rutas de presets de sitios web (HTML single-file).

Los presets viven como archivos .html reales bajo examples/web/, con un
comentario HTML inicial que declara name/description/category. El endpoint
es PÚBLICO (como /api/examples): el editor los consume en modo invitado.
"""

import re
from pathlib import Path

from flask import Blueprint, jsonify

from backend.config import WEB_PRESETS_DIR

web_presets_bp = Blueprint("web_presets", __name__)

# Primer comentario HTML del archivo (contiene la metadata del preset).
_META_RE = re.compile(r"<!--(.*?)-->", re.DOTALL)


def _safe_web_path(rel_path: str):
    """Resuelve rel_path dentro de WEB_PRESETS_DIR bloqueando path traversal."""
    if not rel_path or any(ord(c) < 32 for c in rel_path):
        return None
    base = Path(WEB_PRESETS_DIR).resolve()
    try:
        full = (base / rel_path).resolve()
        full.relative_to(base)
    except (ValueError, OSError):
        return None
    return full


def _parse_meta(content: str) -> dict:
    """Extrae name/description/category del primer comentario HTML."""
    m = _META_RE.search(content)
    if not m:
        return {}
    meta = {}
    for line in m.group(1).splitlines():
        line = line.strip().lstrip("*").strip()
        if ":" in line:
            key, _, value = line.partition(":")
            meta[key.strip().lower()] = value.strip()
    return meta


@web_presets_bp.route("/api/web-presets")
def list_web_presets():
    presets = []
    base = Path(WEB_PRESETS_DIR)
    if not base.is_dir():
        return jsonify(presets)

    for item in sorted(base.rglob("*.html")):
        rel_parts = item.relative_to(base).parts
        if any(part.startswith(".") for part in rel_parts):
            continue
        rel = str(item.relative_to(base))
        try:
            content = item.read_text(encoding="utf-8")
        except Exception:
            continue
        meta = _parse_meta(content)
        presets.append(
            {
                "path": rel,
                "name": meta.get("name") or item.stem,
                "description": meta.get("description", ""),
                "category": meta.get("category", "General"),
            }
        )
    return jsonify(presets)


@web_presets_bp.route("/api/web-presets/<path:preset_path>")
def get_web_preset(preset_path):
    full = _safe_web_path(preset_path)
    if full is None or not full.is_file() or full.suffix.lower() != ".html":
        return jsonify({"error": "Preset no encontrado"}), 404
    try:
        content = full.read_text(encoding="utf-8")
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    return jsonify({"path": preset_path, "name": full.stem, "content": content})
