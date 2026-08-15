"""
Tests del guard de sketches (Fase A): bloqueo de includes peligrosos que
avr-gcc usaría para leer archivos del host y volcarlos en stderr.
"""

from backend.sketch_guard import find_unsafe_include


def test_allows_legit_includes():
    assert find_unsafe_include("#include <Arduino.h>\nvoid setup(){}") is None
    assert find_unsafe_include('#include "mytab.h"\nvoid loop(){}') is None
    assert find_unsafe_include("void setup(){}") is None


def test_blocks_absolute_include():
    assert find_unsafe_include('#include "/etc/passwd"') == "/etc/passwd"
    assert find_unsafe_include("#include </etc/passwd>") == "/etc/passwd"


def test_blocks_traversal_include():
    assert find_unsafe_include('#include "../secret.h"') == "../secret.h"
    assert (
        find_unsafe_include('#include "a/../../etc/passwd"') == "a/../../etc/passwd"
    )


def test_blocks_include_next_and_import():
    assert find_unsafe_include('#include_next "/etc/passwd"') == "/etc/passwd"
    assert find_unsafe_include('#import "/etc/passwd"') == "/etc/passwd"


def test_blocks_pragma_dependency():
    assert find_unsafe_include('#pragma GCC dependency "/etc/passwd"') == "/etc/passwd"


def test_blocks_in_tabs():
    assert (
        find_unsafe_include(
            "void setup(){}",
            [{"filename": "t.h", "content": '#include "/etc/passwd"'}],
        )
        == "/etc/passwd"
    )


def test_blocks_with_space_after_hash():
    assert find_unsafe_include('# include "/etc/passwd"') == "/etc/passwd"


def test_compile_rejects_unsafe_include(client):
    resp = client.post("/api/compile", json={"code": '#include "/etc/passwd"'})
    assert resp.status_code == 422
    assert "Include no permitido" in resp.get_json()["error"]
