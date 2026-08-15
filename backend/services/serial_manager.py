"""
ArduBlock — Gestión del monitor serial.

Estado del puerto serial como clase (antes eran variables globales en app.py).
Con el servidor threaded (Fase C) se añade un lock coarse para serializar
open/close/write sobre el único puerto.
"""

import threading


class SerialManager:
    """Estado del monitor serial — una instancia por aplicación."""

    def __init__(self):
        self._port = None
        self._thread = None
        self._buffer: list[str] = []
        self._lock = threading.Lock()
        self._running = False
        self._op_lock = threading.Lock()  # serializa open/close/write

    @property
    def port(self):
        return self._port

    @property
    def running(self) -> bool:
        return self._running

    @property
    def lock(self) -> threading.Lock:
        return self._lock

    def is_connected(self) -> bool:
        return self._running and self._port is not None

    def open(self, port, baud: int):
        """Abre la conexión serial e inicia el hilo de lectura."""
        import serial

        with self._op_lock:
            ser = serial.Serial(port, baud, timeout=0.5)
            self._port = ser
            self._running = True
            self._buffer = []

        def _read_loop():
            while self._running:
                try:
                    line = self._port.readline()
                    if line:
                        with self._lock:
                            self._buffer.append(
                                line.decode("utf-8", errors="replace")
                            )
                except Exception:
                    break

        self._thread = threading.Thread(target=_read_loop, daemon=True)
        self._thread.start()

    def read_buffer(self) -> str:
        """Lee y vacía el buffer serial."""
        with self._lock:
            data = "".join(self._buffer)
            self._buffer = []
        return data

    def write(self, data: str) -> int:
        """Escribe datos al puerto serial. Retorna bytes escritos."""
        with self._op_lock:
            if not self._port or not self._running:
                raise RuntimeError("No conectado")
            encoded = data.encode("utf-8")
            self._port.write(encoded)
            return len(encoded)

    def close(self):
        """Cierra la conexión serial."""
        with self._op_lock:
            self._running = False
            if self._port:
                try:
                    self._port.close()
                except Exception:
                    pass
                self._port = None
            self._buffer = []

    def status(self) -> dict:
        return {
            "connected": self._running,
            "port": self._port.port if self._port else None,
            "baud": self._port.baudrate if self._port else None,
        }
