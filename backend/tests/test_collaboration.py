import json

from backend.collaboration import CollaborationBroker


class FakeSocket:
    def __init__(self):
        self.messages = []

    def send(self, message):
        self.messages.append(json.loads(message))


def test_presence_uses_connection_and_client_identity():
    broker = CollaborationBroker()
    first_socket = FakeSocket()
    second_socket = FakeSocket()
    first = broker.join(1, 2, "same-user-tab-a", 7, "Ana", first_socket)
    second = broker.join(1, 2, "same-user-tab-b", 7, "Ana", second_socket)

    peers = broker.presence(1, 2)
    assert {peer["client_id"] for peer in peers} == {"same-user-tab-a", "same-user-tab-b"}
    assert first.connection_id != second.connection_id

    broker.broadcast(1, 2, {"type": "operation", "revision": 4}, exclude=first.connection_id)
    assert first_socket.messages == []
    assert second_socket.messages == [{"type": "operation", "revision": 4}]

    broker.leave(1, 2, first.connection_id)
    assert [peer["client_id"] for peer in broker.presence(1, 2)] == ["same-user-tab-b"]
