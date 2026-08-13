"""
ArduBlock — Modelos

User: teacher o student.
Classroom: creada por teacher, estudiantes se unen con join_code.
Project: sketch de Blockly.
"""

import secrets
from datetime import datetime, timezone

from flask_login import UserMixin
from sqlalchemy import (
    Column, Integer, String, DateTime, Text, ForeignKey,
)
from sqlalchemy.orm import DeclarativeBase, relationship


def utcnow():
    """Timestamp naive UTC — convención única para toda la DB."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Base(DeclarativeBase):
    pass


class User(Base, UserMixin):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False, default="student")
    # hash SHA-256 del token; nunca se guarda el token en claro.
    reset_token = Column(String(100), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)

    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    classrooms_owned = relationship(
        "Classroom", back_populates="teacher", foreign_keys="Classroom.teacher_id",
        cascade="all, delete-orphan",
    )

    @property
    def is_teacher(self):
        return self.role == "teacher"


class Classroom(Base):
    """Aula creada por un teacher. Los estudiantes se unen con join_code."""
    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    join_code = Column(String(10), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=utcnow)

    teacher = relationship(
        "User", back_populates="classrooms_owned", foreign_keys=[teacher_id],
    )
    students = relationship(
        "User", secondary="classroom_students", backref="classrooms",
    )

    @staticmethod
    def generate_code():
        return secrets.token_hex(3).upper()[:6]  # ej: "A1B2C3"


class ClassroomStudent(Base):
    """Tabla de unión: estudiante pertenece a un aula."""
    __tablename__ = "classroom_students"

    classroom_id = Column(Integer, ForeignKey("classrooms.id"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    joined_at = Column(DateTime, default=utcnow)


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    data = Column(Text, nullable=False)
    board = Column(String(50), default="arduino:avr:uno")
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="projects")

    def to_dict(self):
        return {
            "id": self.id, "name": self.name, "board": self.board,
            "data": self.data,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
