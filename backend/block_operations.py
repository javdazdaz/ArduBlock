"""Operaciones semánticas y validación de grafos Blockly."""

from copy import deepcopy

MAX_OPERATION_BYTES = 64 * 1024
VALID_TYPES = {
    "create_block", "delete_block", "set_field", "connect_input",
    "disconnect_input", "connect_next", "disconnect_next",
    "create_variable", "rename_variable",
}


def validate_operation(operation: dict) -> dict:
    if not isinstance(operation, dict) or operation.get("type") not in VALID_TYPES:
        raise ValueError("Operación Blockly inválida")
    if len(str(operation).encode("utf-8")) > MAX_OPERATION_BYTES:
        raise ValueError("Operación Blockly demasiado grande")
    if any(key in operation for key in ("x", "y", "zoom", "scroll", "selected")):
        raise ValueError("El estado visual no es colaborativo")
    return operation


def _block(state, block_id):
    block = state.setdefault("blocks", {}).get(block_id)
    if not block:
        raise ValueError("Bloque no encontrado")
    return block


def _reachable(state, start, target, seen=None):
    seen = seen or set()
    if start == target:
        return True
    if start in seen:
        return False
    seen.add(start)
    block = state["blocks"].get(start)
    if not block:
        return False
    children = list(block.get("inputs", {}).values())
    if block.get("next"):
        children.append(block["next"])
    return any(_reachable(state, child, target, seen) for child in children if child)


def _require_child(state, child_id):
    if child_id not in state.setdefault("blocks", {}):
        raise ValueError("Bloque conectado no encontrado")


def apply_operation(state: dict, raw_operation: dict) -> dict:
    """Valida y aplica una operación sin considerar coordenadas de canvas."""
    operation = validate_operation(raw_operation)
    result = deepcopy(state)
    result.setdefault("blocks", {})
    result.setdefault("variables", {})
    kind = operation["type"]

    if kind == "create_block":
        block_id = operation.get("block_id")
        block_type = operation.get("block_type")
        if not isinstance(block_id, str) or not block_id or block_id in result["blocks"]:
            raise ValueError("Identificador de bloque inválido o repetido")
        if not isinstance(block_type, str) or not block_type:
            raise ValueError("Tipo de bloque inválido")
        result["blocks"][block_id] = {
            "type": block_type,
            "fields": deepcopy(operation.get("fields", {})),
            "inputs": {},
            "next": None,
        }
    elif kind == "delete_block":
        block_id = operation.get("block_id")
        _block(result, block_id)
        del result["blocks"][block_id]
        for block in result["blocks"].values():
            block["inputs"] = {name: child for name, child in block.get("inputs", {}).items() if child != block_id}
            if block.get("next") == block_id:
                block["next"] = None
    elif kind == "set_field":
        block = _block(result, operation.get("block_id"))
        field = operation.get("field")
        if not isinstance(field, str) or not field:
            raise ValueError("Campo inválido")
        block.setdefault("fields", {})[field] = operation.get("value")
    elif kind in {"connect_input", "disconnect_input"}:
        parent = _block(result, operation.get("parent_id"))
        input_name = operation.get("input_name")
        if not isinstance(input_name, str) or not input_name:
            raise ValueError("Entrada inválida")
        if kind == "disconnect_input":
            parent.setdefault("inputs", {}).pop(input_name, None)
        else:
            child_id = operation.get("child_id")
            _require_child(result, child_id)
            if child_id == operation.get("parent_id") or _reachable(result, child_id, operation.get("parent_id")):
                raise ValueError("La conexión crea un ciclo")
            parent.setdefault("inputs", {})[input_name] = child_id
    elif kind in {"connect_next", "disconnect_next"}:
        parent = _block(result, operation.get("parent_id"))
        if kind == "disconnect_next":
            parent["next"] = None
        else:
            child_id = operation.get("child_id")
            _require_child(result, child_id)
            if child_id == operation.get("parent_id") or _reachable(result, child_id, operation.get("parent_id")):
                raise ValueError("La conexión crea un ciclo")
            parent["next"] = child_id
    elif kind == "create_variable":
        variable_id = operation.get("variable_id")
        name = operation.get("name")
        if not isinstance(variable_id, str) or not variable_id or variable_id in result["variables"]:
            raise ValueError("Identificador de variable inválido o repetido")
        if not isinstance(name, str) or not name:
            raise ValueError("Nombre de variable inválido")
        result["variables"][variable_id] = name
    elif kind == "rename_variable":
        variable_id = operation.get("variable_id")
        if variable_id not in result["variables"]:
            raise ValueError("Variable no encontrada")
        name = operation.get("name")
        if not isinstance(name, str) or not name:
            raise ValueError("Nombre de variable inválido")
        result["variables"][variable_id] = name
    return result
