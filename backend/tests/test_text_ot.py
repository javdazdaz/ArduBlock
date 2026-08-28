import pytest

from backend.text_ot import apply_changes, transform_changes, validate_changes


def test_apply_changes_uses_codemirror_ranges():
    assert apply_changes("abcdef", [{"from": 1, "to": 3, "insert": "X"}]) == "aXdef"


def test_concurrent_inserts_converge_with_client_tiebreak():
    first = [{"from": 1, "to": 1, "insert": "A"}]
    second = [{"from": 1, "to": 1, "insert": "B"}]

    first_after_second = transform_changes(first, second, "client-a", "client-b")
    second_after_first = transform_changes(second, first, "client-b", "client-a")

    assert apply_changes(apply_changes("xy", second), first_after_second) == "xABy"
    assert apply_changes(apply_changes("xy", first), second_after_first) == "xABy"


def test_remote_delete_shifts_local_insert():
    local = [{"from": 5, "to": 5, "insert": "!"}]
    remote = [{"from": 1, "to": 4, "insert": ""}]
    transformed = transform_changes(local, remote, "a", "b")
    assert transformed == [{"from": 2, "to": 2, "insert": "!"}]


def test_validate_changes_rejects_overlapping_ranges():
    with pytest.raises(ValueError):
        validate_changes(10, [
            {"from": 1, "to": 5, "insert": "x"},
            {"from": 4, "to": 6, "insert": "y"},
        ])
