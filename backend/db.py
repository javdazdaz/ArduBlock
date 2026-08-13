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
    """Crea las tablas si no existen."""
    from backend.models import Base

    Base.metadata.create_all(engine)
