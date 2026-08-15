"""
ArduBlock — Cola de compilación (Fase C).

Cola en memoria con un pool acotado de workers (ThreadPoolExecutor). Los
endpoints de compilación encolan el trabajo aquí y el cliente hace polling
del estado. Sin dependencias externas y monolítico: pensado para un único
proceso Flask (los jobs en vuelo se pierden si el proceso se reinicia, lo
cual es aceptable para una compilación — el alumno vuelve a compilar).

La concurrencia real de arduino-cli la limita el semáforo en
services/arduino_cli.py; este pool limita cuántos jobs se procesan a la vez
y da una cola ordenada con estado consultable.
"""

import os
import secrets
import threading
import time
from concurrent.futures import ThreadPoolExecutor

MAX_WORKERS = int(os.environ.get("ARDUBLOCK_COMPILE_WORKERS", "2"))
MAX_QUEUED = int(os.environ.get("ARDUBLOCK_COMPILE_MAX_QUEUED", "100"))
MAX_JOBS = 500  # tope duro del registro (memoria)
JOB_TTL_SECONDS = 300  # 5 min


class QueueFullError(Exception):
    """La cola llegó al tope de jobs activos."""


_executor = None
_executor_lock = threading.Lock()
_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()


def _get_executor() -> ThreadPoolExecutor:
    global _executor
    with _executor_lock:
        if _executor is None:
            _executor = ThreadPoolExecutor(
                max_workers=MAX_WORKERS, thread_name_prefix="compile"
            )
        return _executor


def _prune_locked(now: float) -> None:
    """Elimina jobs viejos y, si hay demasiados, los 'done' más antiguos."""
    stale = [
        k for k, v in _jobs.items() if now - v["created_at"] > JOB_TTL_SECONDS
    ]
    for k in stale:
        del _jobs[k]
    if len(_jobs) > MAX_JOBS:
        done = sorted(
            (k for k, v in _jobs.items() if v["status"] in ("done", "error")),
            key=lambda k: _jobs[k]["created_at"],
        )
        for k in done[: len(_jobs) - MAX_JOBS]:
            del _jobs[k]


def submit(fn) -> str:
    """Encola `fn` en un worker y devuelve el job_id."""
    now = time.monotonic()
    with _jobs_lock:
        _prune_locked(now)
        active = sum(
            1 for v in _jobs.values() if v["status"] in ("queued", "running")
        )
        if active >= MAX_QUEUED:
            raise QueueFullError("Cola de compilación llena, intentá de nuevo")
    job_id = secrets.token_hex(16)
    with _jobs_lock:
        _jobs[job_id] = {
            "status": "queued",
            "result": None,
            "created_at": time.monotonic(),
        }

    def _run() -> None:
        with _jobs_lock:
            if job_id not in _jobs:
                return  # fue podado antes de arrancar
            _jobs[job_id]["status"] = "running"
        try:
            result = fn()
            with _jobs_lock:
                _jobs[job_id]["result"] = result
                _jobs[job_id]["status"] = "done"
        except Exception as e:  # noqa: BLE001 — el job no debe tumbar el worker
            with _jobs_lock:
                _jobs[job_id]["result"] = {"error": str(e)}
                _jobs[job_id]["status"] = "error"

    _get_executor().submit(_run)
    return job_id


def get(job_id: str):
    """Devuelve {'status', 'result'} o None si el job no existe."""
    with _jobs_lock:
        job = _jobs.get(job_id)
        if job is None:
            return None
        return {"status": job["status"], "result": job["result"]}


def shutdown() -> None:
    """Cancela la cola y libera el pool (para el cierre del servidor)."""
    global _executor
    with _executor_lock:
        if _executor is not None:
            _executor.shutdown(wait=False, cancel_futures=True)
            _executor = None
