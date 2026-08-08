"""
ArduBlock — Rutas de ejemplos Arduino
"""

from flask import Blueprint, jsonify

from backend.config import EXAMPLES_DIR

examples_bp = Blueprint("examples", __name__)


@examples_bp.route("/api/examples")
def list_examples():
    examples = []

    def scan_dir(base, rel_path=""):
        p = base / rel_path
        if not p.is_dir():
            return
        for item in sorted(p.iterdir()):
            if item.name.startswith("."):
                continue
            rel = f"{rel_path}/{item.name}" if rel_path else item.name
            if item.is_dir():
                scan_dir(base, rel)
            elif item.suffix == ".ino":
                desc = ""
                try:
                    with open(item) as f:
                        for line in f:
                            line = line.strip()
                            if (
                                line.startswith("/*")
                                or line.startswith("*")
                                or line.startswith("//")
                            ):
                                cleaned = line.lstrip("/* *//")
                                if cleaned and len(cleaned) > 3:
                                    desc = cleaned[:120]
                                    break
                            elif line and not line.startswith("#"):
                                break
                except Exception:
                    pass
                examples.append(
                    {"path": rel, "name": item.stem, "description": desc}
                )

    scan_dir(EXAMPLES_DIR)
    return jsonify(examples)


@examples_bp.route("/api/examples/<path:example_path>")
def get_example(example_path):
    full = EXAMPLES_DIR / example_path
    if not full.exists() or not full.is_file():
        return jsonify({"error": "Ejemplo no encontrado"}), 404
    try:
        content = full.read_text()
        return jsonify({"path": example_path, "name": full.stem, "content": content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
