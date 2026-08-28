"""Broker efímero para transporte WebSocket y presencia."""

from __future__ import annotations

import json
import threading
import uuid
from dataclasses import dataclass
from typing import Any


@dataclass
class Peer:
    connection_id: str
    client_id: str
    user_id: int
    display_name: str
    has_avatar: bool
    ws: Any


class CollaborationBroker:
    """Estado en memoria; nunca es fuente persistente ni de autorización."""

    def __init__(self) -> None:
        self._rooms: dict[tuple[int, int], dict[str, Peer]] = {}
        self._lock = threading.RLock()

    def join(self, project_id: int, file_id: int, client_id: str, user_id: int, display_name: str, ws: Any, has_avatar: bool = False) -> Peer:
        peer = Peer(str(uuid.uuid4()), client_id, user_id, display_name, has_avatar, ws)
        with self._lock:
            self._rooms.setdefault((project_id, file_id), {})[peer.connection_id] = peer
        return peer

    def leave(self, project_id: int, file_id: int, connection_id: str) -> None:
        with self._lock:
            peers = self._rooms.get((project_id, file_id))
            if peers:
                peers.pop(connection_id, None)
                if not peers:
                    self._rooms.pop((project_id, file_id), None)

    def presence(self, project_id: int, file_id: int) -> list[dict[str, Any]]:
        with self._lock:
            return [
                {
                    "connection_id": peer.connection_id,
                    "client_id": peer.client_id,
                    "user_id": peer.user_id,
                    "display_name": peer.display_name,
                    "has_avatar": peer.has_avatar,
                }
                for peer in self._rooms.get((project_id, file_id), {}).values()
            ]

    def broadcast(self, project_id: int, file_id: int, message: dict[str, Any], exclude: str | None = None) -> None:
        encoded = json.dumps(message, ensure_ascii=False)
        with self._lock:
            peers = list(self._rooms.get((project_id, file_id), {}).values())
        stale = []
        for peer in peers:
            if peer.connection_id == exclude:
                continue
            try:
                peer.ws.send(encoded)
            except Exception:
                stale.append(peer.connection_id)
        for connection_id in stale:
            self.leave(project_id, file_id, connection_id)


broker = CollaborationBroker()
