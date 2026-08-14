"""
ArduBlock — Capa de datos única.

Un solo engine SQLAlchemy y una SessionFactory compartida por todos los
módulos. Antes cada blueprint creaba su propio engine (app.py, auth.py,
projects.py), duplicando configuración y haciendo frágil la gestión de
conexiones.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.config import DATABASE_PATH

engine = create_engine(f"sqlite:///{DATABASE_PATH}", echo=False)
SessionFactory = sessionmaker(bind=engine)


def get_session():
    """Abre una sesión nueva. El caller la cierra con try/finally."""
    return SessionFactory()


def init_db():
    """Crea las tablas si no existen y aplica migraciones ligeras."""
    from backend.models import Base

    _drop_old_activities()
    Base.metadata.create_all(engine)
    _migrate()


def _drop_old_activities():
    """Recrea `activities` si viene del esquema viejo (classroom_id, iteración
    previa) para pasar a teacher_id. Sin datos: la feature recién salió."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "activities" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("activities")}
    if "classroom_id" in cols and "teacher_id" not in cols:
        with engine.begin() as conn:
            conn.execute(text("DROP TABLE activities"))


def _migrate():
    """Migraciones idempotentes para columnas añadidas a tablas existentes.

    create_all() solo crea tablas nuevas, no columnas nuevas en tablas ya
    existentes. Aquí se aplican los ALTER necesarios sin depender de Alembic.
    """
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "projects" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("projects")}
    additions = {
        "class_id": "INTEGER",
        "thumbnail": "TEXT",
    }
    for col, sqltype in additions.items():
        if col not in cols:
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE projects ADD COLUMN {col} {sqltype}"))
