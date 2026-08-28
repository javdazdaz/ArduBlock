"""Validación común de payloads que llegan al compilador."""

from backend.config import SUPPORTED_FQBNS

MAX_TABS = 32
MAX_TAB_BYTES = 512 * 1024
_ALLOWED_EXTENSIONS = (".h", ".hpp", ".html")
_RESERVED_NAMES = {"ardublock_sketch.ino"}


def validate_compile_payload(fqbn, tabs):
    """Devuelve un mensaje de error o None si fqbn y tabs son válidos."""
    if not isinstance(fqbn, str) or fqbn not in SUPPORTED_FQBNS:
        return "Placa no soportada"
    if not isinstance(tabs, list) or len(tabs) > MAX_TABS:
        return "Tabs inválidos"
    for tab in tabs:
        if not isinstance(tab, dict):
            return "Tabs inválidos"
        filename = tab.get("filename", "")
        content = tab.get("content", "")
        if not isinstance(filename, str) or not isinstance(content, str):
            return "Tabs inválidos"
        if filename in _RESERVED_NAMES:
            return "Nombre de tab reservado"
        if filename and not filename.endswith(_ALLOWED_EXTENSIONS):
            return "Extensión de tab no permitida"
        if len(content.encode("utf-8")) > MAX_TAB_BYTES:
            return "Tab demasiado grande"
    return None
