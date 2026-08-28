"""Validación y representación de avatares de perfil."""

import base64
import binascii
import re

from flask import abort, Response

from backend.config import MAX_AVATAR_DATA

_ALLOWED = {"image/png": "png", "image/jpeg": "jpeg", "image/webp": "webp"}
_DATA_URI = re.compile(r"^data:(image/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$")


def validate_avatar_data(value: str | None) -> tuple[str, str] | None:
    """Devuelve (tipo, data URI) para una imagen procesada válida."""
    if not isinstance(value, str) or len(value) > MAX_AVATAR_DATA:
        return None
    match = _DATA_URI.fullmatch(value)
    if not match:
        return None
    mime, encoded = match.groups()
    try:
        raw = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        return None
    if not raw or len(raw) > 512_000:
        return None
    # El navegador entrega PNG/WebP/JPEG; comprobar firmas evita guardar texto
    # disfrazado de data URI.
    signatures = {
        "image/png": raw.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/jpeg": raw.startswith(b"\xff\xd8\xff"),
        "image/webp": raw.startswith(b"RIFF") and raw[8:12] == b"WEBP",
    }
    return (mime, value) if signatures[mime] else None


def avatar_response(user, *, fallback=False):
    if user.avatar_data and not fallback:
        match = _DATA_URI.fullmatch(user.avatar_data)
        if match:
            import base64
            return Response(base64.b64decode(match.group(2)), mimetype=match.group(1),
                            headers={"Cache-Control": "private, no-store"})
    return None


def avatar_type_for(user):
    return user.avatar_type or "initials"
