/**
 * Cliente de colaboración de texto para un documento CodeMirror.
 * El servidor sigue siendo la autoridad; el WebSocket solo transporta eventos.
 */

export class TextCollaborationClient {
  constructor({ projectId, fileId, clientId, applyRemote, onPresence, fetchImpl = fetch,
    WebSocketImpl = globalThis.WebSocket, locationImpl = globalThis.location } = {}) {
    this.projectId = projectId;
    this.fileId = fileId;
    this.clientId = clientId;
    this.applyRemote = applyRemote;
    this.onPresence = onPresence;
    this.fetchImpl = fetchImpl;
    this.WebSocketImpl = WebSocketImpl;
    this.locationImpl = locationImpl;
    this.revision = 1;
    this.sequence = 0;
    this.pending = [];
    this.suppressLocal = false;
    this.socket = null;
    this.stopped = false;
  }

  enqueue(changes) {
    if (this.suppressLocal || !changes?.length || this.stopped) return;
    const operation = {
      base_revision: this.revision,
      client_id: this.clientId,
      sequence: ++this.sequence,
      changes,
    };
    this.pending.push(operation);
    void this._flush();
  }

  async _flush() {
    if (this.sending || !this.pending.length || this.stopped) return;
    this.sending = true;
    const operation = this.pending[0];
    try {
      const response = await this.fetchImpl(
        `/api/projects/${this.projectId}/files/${this.fileId}/operations`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(operation) },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      this.revision = result.revision;
      this.pending.shift();
    } catch (error) {
      this.onError?.(error);
    } finally {
      this.sending = false;
      if (this.pending.length && !this.stopped) setTimeout(() => this._flush(), 500);
    }
  }

  connect() {
    if (this.stopped || !this.WebSocketImpl) return;
    const protocol = this.locationImpl?.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = this.locationImpl?.host || globalThis.location?.host;
    if (!host) return;
    this.socket = new this.WebSocketImpl(
      `${protocol}//${host}/ws/projects/${this.projectId}/files/${this.fileId}?client_id=${encodeURIComponent(this.clientId)}`,
    );
    this.socket.onmessage = (event) => this._receive(event.data);
    this.socket.onclose = () => {
      if (!this.stopped) setTimeout(() => this.connect(), 1000);
    };
  }

  _receive(raw) {
    let message;
    try { message = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (_) { return; }
    if (message.type === 'presence') {
      this.onPresence?.(message);
      return;
    }
    if (message.type !== 'operation' || message.client_id === this.clientId) return;
    this.revision = Math.max(this.revision, message.revision || this.revision);
    let remoteChanges = message.changes || [];
    for (const operation of this.pending) {
      remoteChanges = transformChanges(remoteChanges, operation.changes, message.client_id, this.clientId);
    }
    this.pending = this.pending.map((operation) => ({
      ...operation,
      changes: transformChanges(operation.changes, message.changes || [], this.clientId, message.client_id),
    }));
    this.suppressLocal = true;
    try {
      this.applyRemote?.(remoteChanges, this.pending);
    } finally {
      this.suppressLocal = false;
    }
  }

  sendPresence(payload) {
    if (this.socket?.readyState === this.WebSocketImpl?.OPEN) {
      this.socket.send(JSON.stringify({ type: 'presence', ...payload }));
    }
  }

  stop() {
    this.stopped = true;
    this.socket?.close();
    this.socket = null;
  }
}

export function changesFromUpdate(update) {
  const changes = [];
  update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    changes.push({ from: fromA, to: toA, insert: inserted.toString() });
  });
  return changes;
}

function mapPosition(position, remote, incomingClient, remoteClient) {
  const from = remote.from;
  const to = remote.to;
  if (from === to) {
    if (position < from) return position;
    if (position > from) return position + remote.insert.length;
    return position + (incomingClient > remoteClient ? remote.insert.length : 0);
  }
  if (position <= from) return position;
  if (position >= to) return position + remote.insert.length - (to - from);
  return from;
}

function transformChanges(changes, remoteChanges, incomingClient, remoteClient) {
  return changes.map((change) => {
    let transformed = { ...change };
    for (const remote of remoteChanges) {
      transformed = {
        ...transformed,
        from: mapPosition(transformed.from, remote, incomingClient, remoteClient),
        to: mapPosition(transformed.to, remote, incomingClient, remoteClient),
      };
    }
    return transformed;
  });
}
