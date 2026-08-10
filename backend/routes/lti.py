"""
ArduBlock — Rutas LTI 1.3

Flujo OIDC LTI 1.3:
  1. Chamilo → POST /lti/login → OIDC redirect a Chamilo
  2. Chamilo → POST /lti/launch → validar JWT, guardar sesión, redirigir a /app
"""

from flask import Blueprint, request, redirect, session, jsonify, url_for
from pylti1p3.contrib.flask import (
    FlaskOIDCLogin,
    FlaskMessageLaunch,
    FlaskRequest,
)
from pylti1p3.tool_config.dict import ToolConfDict
from backend.lti_config import get_tool_config, get_lti_key, get_lti_jwks

lti_bp = Blueprint("lti", __name__, url_prefix="/lti")
ISSUER = "https://ardublock.matemancia.net/admin"


def _get_tool_conf_with_keys():
    """Tool config con claves RSA registradas."""
    lti_key = get_lti_key()
    tool_conf = ToolConfDict(get_tool_config())
    tool_conf.set_private_key(ISSUER, lti_key["private_key"])
    tool_conf.set_public_key(ISSUER, lti_key["public_key"])
    return tool_conf


@lti_bp.route("/jwks", methods=["GET"])
def jwks():
    """JWKS endpoint."""
    return jsonify(get_lti_jwks())


@lti_bp.route("/login", methods=["POST"])
def login():
    """OIDC login initiation."""
    flask_req = FlaskRequest()
    tool_conf = _get_tool_conf_with_keys()
    oidc = FlaskOIDCLogin(flask_req, tool_conf)

    launch_url = url_for("lti.launch", _external=True)
    return oidc.redirect(launch_url)


@lti_bp.route("/launch", methods=["POST"])
def launch():
    """LTI launch — validar JWT y guardar sesión."""
    flask_req = FlaskRequest()
    tool_conf = _get_tool_conf_with_keys()
    message_launch = FlaskMessageLaunch(flask_req, tool_conf)

    try:
        launch_data = message_launch.get_launch_data()
    except Exception as e:
        return f"LTI launch failed: {e}", 403

    user_id = launch_data.get("sub", "")
    user_name = launch_data.get("name", "Estudiante")
    user_email = launch_data.get("email", "")

    context = launch_data.get(
        "https://purl.imsglobal.org/spec/lti/claim/context", {}
    )
    course_id = context.get("id", "")
    course_name = context.get("title", "")

    resource = launch_data.get(
        "https://purl.imsglobal.org/spec/lti/claim/resource_link", {}
    )
    resource_id = resource.get("id", "")

    roles = launch_data.get("https://purl.imsglobal.org/spec/lti/claim/roles", [])
    is_teacher = any("Instructor" in r or "Administrator" in r for r in roles)

    session["lti_authenticated"] = True
    session["lti_user_id"] = user_id
    session["lti_user_name"] = user_name
    session["lti_user_email"] = user_email
    session["lti_course_id"] = course_id
    session["lti_course_name"] = course_name
    session["lti_resource_id"] = resource_id
    session["lti_is_teacher"] = is_teacher

    return redirect(url_for("editor"))
