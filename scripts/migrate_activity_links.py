#!/usr/bin/env python3
"""Migración idempotente de actividades.

Añade:
  - projects.activity_id      actividad de la que salió el proyecto clonado
  - activities.description    texto breve para el alumno
  - activities.instructions   instrucciones de la tarea

Se puede correr varias veces: cada columna se crea solo si falta. La app usa
create_all, que no altera tablas existentes, así que esta migración se ejecuta
a mano después de desplegar (ver INSTALL.md).

Uso:
    python scripts/migrate_activity_links.py [ruta_de_la_base]
"""

import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

COLUMNS = [
    ("projects", "activity_id", "INTEGER REFERENCES activities(id)"),
    ("activities", "description", "TEXT"),
    ("activities", "instructions", "TEXT"),
]

INDEXES = [
    ("ix_projects_activity_id", "projects", "activity_id"),
]


def _columns(con, table):
    return {row[1] for row in con.execute(f"pragma table_info({table})")}


def migrate(db_path):
    path = Path(db_path)
    if not path.is_file():
        raise SystemExit(f"✕ No existe la base: {path}")

    con = sqlite3.connect(path)
    try:
        added = []
        for table, column, decl in COLUMNS:
            if column in _columns(con, table):
                continue
            con.execute(f"alter table {table} add column {column} {decl}")
            added.append(f"{table}.{column}")
        for name, table, column in INDEXES:
            con.execute(f"create index if not exists {name} on {table}({column})")
        con.commit()
    finally:
        con.close()

    if added:
        print(f"✓ Columnas añadidas: {', '.join(added)}")
    else:
        print("✓ Sin cambios: el esquema ya estaba al día")
    return 0


if __name__ == "__main__":
    if len(sys.argv) > 1:
        target = sys.argv[1]
    else:
        from backend.config import DATABASE_PATH
        target = DATABASE_PATH
    raise SystemExit(migrate(target))
