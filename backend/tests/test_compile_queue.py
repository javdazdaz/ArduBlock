"""Tests de la cola de compilación (Fase C) y endpoints asíncronos."""

import time

from backend import compile_queue


def _poll(job_id, timeout=5.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        st = compile_queue.get(job_id)
        if st["status"] in ("done", "error"):
            return st
        time.sleep(0.02)
    return compile_queue.get(job_id)


def test_submit_and_poll_done():
    compile_queue.shutdown()
    job_id = compile_queue.submit(lambda: {"ok": True})
    st = _poll(job_id)
    assert st["status"] == "done"
    assert st["result"] == {"ok": True}
    compile_queue.shutdown()


def test_submit_error_is_captured():
    compile_queue.shutdown()

    def boom():
        raise RuntimeError("boom")

    job_id = compile_queue.submit(boom)
    st = _poll(job_id)
    assert st["status"] == "error"
    assert st["result"] == {"error": "boom"}
    compile_queue.shutdown()


def test_get_unknown_job_is_none():
    assert compile_queue.get("noexiste") is None


def test_compile_endpoint_async(client):
    resp = client.post("/api/compile", json={"code": "void setup(){}"})
    assert resp.status_code == 202
    data = resp.get_json()
    assert data["status"] == "queued"
    job_id = data["job_id"]
    assert job_id

    deadline = time.monotonic() + 5
    st = None
    while time.monotonic() < deadline:
        st = client.get(f"/api/compile/{job_id}").get_json()
        if st["status"] in ("done", "error"):
            break
        time.sleep(0.02)
    assert st["status"] in ("done", "error")
    # En tests no hay arduino-cli: el worker devuelve un dict con success False.
    assert isinstance(st["result"], dict)


def test_compile_hex_endpoint_async(client):
    resp = client.post("/api/compile-hex", json={"code": "void setup(){}"})
    assert resp.status_code == 202
    job_id = resp.get_json()["job_id"]
    deadline = time.monotonic() + 5
    st = None
    while time.monotonic() < deadline:
        st = client.get(f"/api/compile-hex/{job_id}").get_json()
        if st["status"] in ("done", "error"):
            break
        time.sleep(0.02)
    assert st["status"] in ("done", "error")


def test_compile_status_unknown_is_404(client):
    assert client.get("/api/compile/noexiste").status_code == 404
