import pytest

from backend.block_operations import apply_operation, validate_operation


def test_semantic_block_operations_ignore_canvas_coordinates_only_by_rejection():
    state = {"blocks": {}, "variables": {}}
    state = apply_operation(state, {
        "type": "create_block", "block_id": "b1", "block_type": "controls_if",
    })
    assert state["blocks"]["b1"] == {
        "type": "controls_if", "fields": {}, "inputs": {}, "next": None,
    }


def test_visual_state_is_not_a_semantic_operation():
    with pytest.raises(ValueError):
        validate_operation({"type": "create_block", "block_id": "b1", "block_type": "x", "x": 1})


def test_connect_and_delete_preserve_graph_integrity():
    state = {"blocks": {}, "variables": {}}
    for block_id in ("parent", "child"):
        state = apply_operation(state, {
            "type": "create_block", "block_id": block_id, "block_type": "text",
        })
    state = apply_operation(state, {
        "type": "connect_input", "parent_id": "parent", "input_name": "A", "child_id": "child",
    })
    assert state["blocks"]["parent"]["inputs"] == {"A": "child"}
    state = apply_operation(state, {"type": "delete_block", "block_id": "child"})
    assert state["blocks"]["parent"]["inputs"] == {}


def test_cycles_and_missing_references_are_rejected():
    state = {"blocks": {}, "variables": {}}
    for block_id in ("a", "b"):
        state = apply_operation(state, {
            "type": "create_block", "block_id": block_id, "block_type": "text",
        })
    state = apply_operation(state, {
        "type": "connect_next", "parent_id": "a", "child_id": "b",
    })
    with pytest.raises(ValueError):
        apply_operation(state, {"type": "connect_next", "parent_id": "b", "child_id": "a"})
    with pytest.raises(ValueError):
        apply_operation(state, {
            "type": "connect_input", "parent_id": "a", "input_name": "X", "child_id": "missing",
        })


def test_variables_are_semantic_and_have_stable_ids():
    state = apply_operation({"blocks": {}, "variables": {}}, {
        "type": "create_variable", "variable_id": "v1", "name": "contador",
    })
    state = apply_operation(state, {
        "type": "rename_variable", "variable_id": "v1", "name": "total",
    })
    assert state["variables"] == {"v1": "total"}
