/** Cliente de transporte para operaciones semánticas del workspace Blockly. */
export class BlockCollaborationClient {
  constructor({ projectId, clientId, applyRemote, onPresence, fetchImpl = fetch,
    WebSocketImpl = globalThis.WebSocket, locationImpl = globalThis.location } = {}) {
    this.projectId = projectId;
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
    this.stopped = false;
  }

  enqueue(operation) {
    if (this.suppressLocal || !operation || this.stopped) return;
    this.pending.push({ base_revision: this.revision, client_id: this.clientId,
      sequence: ++this.sequence, operation });
    void this._flush();
  }

  async _flush() {
    if (this.sending || !this.pending.length || this.stopped) return;
    this.sending = true;
    try {
      const response = await this.fetchImpl(`/api/projects/${this.projectId}/block-operations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.pending[0]),
      });
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
    if (this.stopped || !this.WebSocketImpl || !this.locationImpl?.host) return;
    const protocol = this.locationImpl.protocol === 'https:' ? 'wss:' : 'ws:';
    this.socket = new this.WebSocketImpl(
      `${protocol}//${this.locationImpl.host}/ws/projects/${this.projectId}/blocks?client_id=${encodeURIComponent(this.clientId)}`,
    );
    this.socket.onmessage = ({ data }) => {
      let message;
      try { message = typeof data === 'string' ? JSON.parse(data) : data; } catch (_) { return; }
      if (message.type === 'presence') { this.onPresence?.(message); return; }
      if (message.type !== 'block_operation' || message.client_id === this.clientId) return;
      this.revision = Math.max(this.revision, message.revision || this.revision);
      this.suppressLocal = true;
      try { this.applyRemote?.(message.operation); } finally { this.suppressLocal = false; }
    };
    this.socket.onclose = () => {
      if (!this.stopped) setTimeout(() => this.connect(), 1000);
    };
  }

  sendPresence(payload) {
    if (this.socket?.readyState === this.WebSocketImpl?.OPEN) {
      this.socket.send(JSON.stringify({ type: 'presence', ...payload }));
    }
  }

  stop() { this.stopped = true; this.socket?.close(); this.socket = null; }
}
