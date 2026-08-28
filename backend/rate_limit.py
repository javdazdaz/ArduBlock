"""
Rate limiter in-memory para endpoints públicos (compile) y auth (login/register).

Sin dependencias externas. Claves por IP en un dict con deques de timestamps.
Pensado para el deploy actual (un único proceso Flask); el lock cubre el caso
threaded por si acaso.
"""

import os
import threading
import time
from collections import defaultdict, deque
from functools import wraps

from flask import jsonify, request

_lock = threading.Lock()
_hits: defaultdict[str, deque[float]] = defaultdict(deque)
_MAX_KEYS = 10_000


def _record(key, max_requests, window_seconds):
    """Registra un hit. Devuelve True si ya se superó el límite (antes de registrar)."""
    if os.environ.get("ARDUBLOCK_RATE_LIMIT_DISABLED") == "1":
        return False
    now = time.monotonic()
    with _lock:
        dq = _hits[key]
        while dq and now - dq[0] > window_seconds:
            dq.popleft()
        if len(dq) >= max_requests:
            return True
        dq.append(now)
        # Poda ocasional para que el dict no crezca sin límite.
        if len(_hits) > _MAX_KEYS:
            for k in list(_hits.keys()):
                if not _hits[k] or now - _hits[k][-1] > 3600:
                    del _hits[k]
        return False


def rate_limit(max_requests, window_seconds, key=None):
    """Decorador para endpoints API: responde 429 JSON si se supera el límite por IP."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            ip = request.remote_addr or "0.0.0.0"
            k = f"{ip}:{key}" if key else ip
            if _record(k, max_requests, window_seconds):
                return (
                    jsonify(
                        {
                            "error": "Demasiadas solicitudes. "
                            "Espere unos segundos e intente de nuevo."
                        }
                    ),
                    429,
                )
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def is_rate_limited(key, max_requests, window_seconds):
    """Versión booleana para rutas HTML (login/register)."""
    return _record(key, max_requests, window_seconds)
