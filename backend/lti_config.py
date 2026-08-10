"""
ArduBlock — Configuración LTI 1.3

Define los parámetros de conexión con Chamilo como platform LTI.
La clave privada RSA se almacena en lti_key.json (NO versionado).

Usa PyLTI1p3 v2.0.0 (API nueva).
"""

import json
import os
from pathlib import Path

# ═══ Chamilo como LTI Platform ══════════════════

CHAMILO_BASE = os.environ.get(
    "ARDUBLOCK_LTI_PLATFORM_URL",
    "https://ardublock.matemancia.net/admin"
)

CLIENT_ID = os.environ.get("LTI_CLIENT_ID", "ardublock")
DEPLOYMENT_IDS = (
    os.environ.get("LTI_DEPLOYMENT_IDS", "").split(",")
    if os.environ.get("LTI_DEPLOYMENT_IDS")
    else []
)

# Tool config en formato PyLTI1p3 v2
def get_tool_config() -> dict:
    """Devuelve la tool config para PyLTI1p3."""
    return {
        CHAMILO_BASE: [{  # issuer = URL base de Chamilo
            "default": True,
            "client_id": CLIENT_ID,
            "auth_login_url": f"{CHAMILO_BASE}/lti1p3auth",
            "auth_token_url": f"{CHAMILO_BASE}/lti1p3token",
            "key_set_url": f"{CHAMILO_BASE}/lti1p3keyset",
            "deployment_ids": DEPLOYMENT_IDS,
        }]
    }


# ═══ Clave privada RSA ═══════════════════════════

_LTI_KEY_PATH = Path(__file__).parent / "lti_key.json"


def get_lti_key() -> dict:
    """Carga la clave privada RSA."""
    if not _LTI_KEY_PATH.exists():
        raise FileNotFoundError(
            f"LTI key no encontrada en {_LTI_KEY_PATH}"
        )
    with open(_LTI_KEY_PATH) as f:
        return json.load(f)


def get_lti_jwks() -> list:
    """Devuelve el JWKS con la clave pública."""
    from pylti1p3.registration import Registration

    lti_key = get_lti_key()
    reg = Registration()
    reg.set_tool_public_key(lti_key["public_key"])
    return reg.get_jwks()
