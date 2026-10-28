#!/usr/bin/env python3
"""Migración idempotente del sketch de texto en actividades.

Añade:
  - activities.sketch_text    C++ que la actividad publica como texto
  - activities.sketch_board   FQBN con el que se compila ese sketch

Se puede correr varias veces: cada columna se crea solo si falta. La app usa
create_all, que no altera tablas existentes. Migrar antes de desplegar: el
código viejo ignora estas columnas.

Uso:
    python scripts/migrate_activity_sketch.py [ruta_de_la_base]
"""

import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

COLUMNS = [
    ("activities", "sketch_text", "TEXT"),
    ("activities", "sketch_board", "TEXT"),
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
