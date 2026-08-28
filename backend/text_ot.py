"""Operaciones OT pequeñas para documentos de texto."""

from collections.abc import Iterable

MAX_CHANGES = 100
MAX_INSERT_BYTES = 256 * 1024


def validate_changes(length: int, changes: Iterable[dict]) -> list[dict]:
    """Valida y normaliza cambios no solapados en coordenadas de un documento."""
    normalized = []
    previous_to = 0
    for change in changes:
        if not isinstance(change, dict):
            raise ValueError("Cambio inválido")
        start = change.get("from")
        end = change.get("to")
        insert = change.get("insert", "")
        if (
            isinstance(start, bool) or not isinstance(start, int)
            or isinstance(end, bool) or not isinstance(end, int)
            or not isinstance(insert, str)
            or start < 0 or end < start or end > length
            or start < previous_to
        ):
            raise ValueError("Rango de cambio inválido")
        if len(insert.encode("utf-8")) > MAX_INSERT_BYTES:
            raise ValueError("Inserción demasiado grande")
        normalized.append({"from": start, "to": end, "insert": insert})
        previous_to = end
        if len(normalized) > MAX_CHANGES:
            raise ValueError("Demasiados cambios")
    return normalized


def apply_changes(text: str, changes: Iterable[dict]) -> str:
    """Aplica rangos CodeMirror de derecha a izquierda."""
    result = text
    for change in reversed(list(changes)):
        result = result[:change["from"]] + change["insert"] + result[change["to"]:]
    return result


def _map_position(position: int, remote: dict, incoming_client: str, remote_client: str) -> int:
    remote_from = remote["from"]
    remote_to = remote["to"]
    inserted = remote["insert"]
    if remote_from == remote_to:
        if position < remote_from:
            return position
        if position > remote_from:
            return position + len(inserted)
        # El mismo desempate se aplica a ambos extremos de una selección.
        return position + (len(inserted) if incoming_client > remote_client else 0)
    if position <= remote_from:
        return position
    if position >= remote_to:
        return position + len(inserted) - (remote_to - remote_from)
    return remote_from


def transform_change(change: dict, remote: dict, incoming_client: str, remote_client: str) -> dict:
    """Transforma un cambio contra un cambio remoto concurrente."""
    return {
        "from": _map_position(change["from"], remote, incoming_client, remote_client),
        "to": _map_position(change["to"], remote, incoming_client, remote_client),
        "insert": change["insert"],
    }


def transform_changes(changes, remote_changes, incoming_client: str, remote_client: str):
    """Transforma una operación contra otra operación ya aceptada."""
    transformed = [dict(change) for change in changes]
    for remote in remote_changes:
        transformed = [
            transform_change(change, remote, incoming_client, remote_client)
            for change in transformed
        ]
    return transformed
