"""
Guard de sketches: rechaza includes que intentan leer fuera del sketch.

avr-gcc lee archivos del host vía ``#include`` con ruta absoluta o ``../`` y
vuelca su contenido en stderr, que /api/compile devuelve tal cual (vector de
lectura arbitraria). Esta validación de entrada cierra la puerta principal.
NO es un sustituto del sandbox (Fase B): es un blocklist, no una barrera total.
"""

import re

_INCLUDE_RE = re.compile(
    r"^\s*#\s*(include_next|include|import)\b\s*(.*)$", re.MULTILINE
)
_PRAGMA_DEP_RE = re.compile(
    r"^\s*#\s*pragma\s+GCC\s+dependency\b\s*(.*)$", re.MULTILINE
)


def _extract_path(rest: str) -> str:
    """Extrae el path de un include, soportando comillas y <...>."""
    rest = rest.strip()
    if rest.startswith('"'):
        end = rest.find('"', 1)
        return rest[1:end] if end != -1 else rest[1:]
    if rest.startswith("<"):
        end = rest.find(">", 1)
        return rest[1:end] if end != -1 else rest[1:]
    return rest.split()[0] if rest else ""


def _unsafe(path: str) -> bool:
    p = path.strip()
    if not p:
        return False
    if p.startswith("/") or p.startswith("\\"):
        return True
    return ".." in p.split("/")


def find_unsafe_include(code: str, tabs=None) -> str | None:
    """Devuelve el path del primer include peligroso, o None si no lo hay."""
    bodies = [code or ""]
    for tab in tabs or []:
        if isinstance(tab, dict) and tab.get("content"):
            bodies.append(tab["content"])

    for body in bodies:
        for m in _INCLUDE_RE.finditer(body):
            path = _extract_path(m.group(2))
            if _unsafe(path):
                return path
        for m in _PRAGMA_DEP_RE.finditer(body):
            path = _extract_path(m.group(1))
            if _unsafe(path):
                return path
    return None
