import { describe, expect, it, vi } from 'vitest';
import { BlockCollaborationClient } from '../frontend/js/block-collaboration.js';

describe('BlockCollaborationClient', () => {
  it('sends semantic operations and advances the graph revision', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ accepted: true, revision: 2 }),
    });
    const client = new BlockCollaborationClient({ projectId: 3, clientId: 'tab-a', fetchImpl });
    client.enqueue({ type: 'create_block', block_id: 'b1', block_type: 'text' });
    await vi.waitFor(() => expect(client.pending).toHaveLength(0));
    const payload = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(payload).toMatchObject({ base_revision: 1, client_id: 'tab-a', sequence: 1 });
    expect(payload.operation.type).toBe('create_block');
    expect(client.revision).toBe(2);
  });

  it('ignores its own broadcast and applies a remote operation', () => {
    const applyRemote = vi.fn();
    class FakeSocket {
      static OPEN = 1;
      constructor() { this.readyState = 1; }
    }
    const client = new BlockCollaborationClient({
      projectId: 3, clientId: 'tab-a', applyRemote, WebSocketImpl: FakeSocket,
      locationImpl: { protocol: 'http:', host: 'localhost' },
    });
    client.connect();
    client.socket.onmessage({ data: JSON.stringify({
      type: 'block_operation', client_id: 'tab-a', operation: { type: 'delete_block', block_id: 'b1' },
    }) });
    client.socket.onmessage({ data: JSON.stringify({
      type: 'block_operation', client_id: 'tab-b', operation: { type: 'delete_block', block_id: 'b1' },
    }) });
    expect(applyRemote).toHaveBeenCalledTimes(1);
    expect(client.suppressLocal).toBe(false);
  });
});
