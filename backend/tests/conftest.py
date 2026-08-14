"""
Fixtures pytest para el backend de ArduBlock.

Usa una DB temporal (ARDUBLOCK_DB) y deshabilita el email real. El entorno
se configura ANTES de importar la app: config.py lee las variables al
importarse y el cargador de .env solo rellena lo que falte (prioridad: env).
"""

import os
import sys
import tempfile
from pathlib import Path

import pytest
from werkzeug.security import generate_password_hash

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

_TMPDIR = tempfile.TemporaryDirectory()

# Debe ir antes de importar backend.* (config.py lee env al importarse).
os.environ["ARDUBLOCK_DB"] = str(Path(_TMPDIR.name) / "test.db")
os.environ["TEACHER_EMAIL"] = "profesor@example.com"
os.environ["TEACHER_PASSWORD"] = "profesor123"
os.environ["ARDUBLOCK_SECRET_KEY"] = "test-secret-key"
os.environ["SMTP_HOST"] = ""  # sin email real en tests

from backend.app import create_app  # noqa: E402
from backend.db import get_session  # noqa: E402
from backend.models import User, Classroom, ClassroomStudent, Project, Class, Activity, ClassActivity  # noqa: E402
from backend.routes.auth import _ensure_teacher  # noqa: E402


@pytest.fixture(scope="session")
def app():
    app = create_app()
    app.config["TESTING"] = True
    app.config["WTF_CSRF_ENABLED"] = False
    return app


@pytest.fixture()
def clean_db(app):
    """Limpia todas las tablas y re-siembra el teacher entre tests."""
    with app.app_context():
        s = get_session()
        try:
            s.query(ClassroomStudent).delete()
            s.query(ClassActivity).delete()
            s.query(Activity).delete()
            s.query(Project).delete()
            s.query(Class).delete()
            s.query(Classroom).delete()
            s.query(User).delete()
            s.commit()
        finally:
            s.close()
        _ensure_teacher()


@pytest.fixture()
def client(app, clean_db):
    return app.test_client()


@pytest.fixture()
def seed_classroom():
    def _seed(join_code="ABC123", name="Robótica 3A"):
        s = get_session()
        try:
            teacher = s.query(User).filter_by(role="teacher").first()
            c = Classroom(name=name, join_code=join_code, teacher_id=teacher.id)
            s.add(c)
            s.commit()
            return c.join_code
        finally:
            s.close()
    return _seed


@pytest.fixture()
def seed_student():
    def _seed(email, password="secreto123", name="Alumno"):
        s = get_session()
        try:
            u = User(email=email, name=name,
                     password_hash=generate_password_hash(password), role="student")
            s.add(u)
            s.commit()
            return u
        finally:
            s.close()
    return _seed
