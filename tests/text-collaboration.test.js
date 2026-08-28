import { describe, expect, it, vi } from 'vitest';
import { TextCollaborationClient } from '../frontend/js/text-collaboration.js';

describe('TextCollaborationClient', () => {
  it('queues an operation and advances revision after server confirmation', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ accepted: true, revision: 2 }),
    });
    const client = new TextCollaborationClient({
      projectId: 4, fileId: 8, clientId: 'tab-a', fetchImpl,
    });

    client.enqueue([{ from: 1, to: 1, insert: 'A' }]);
    await vi.waitFor(() => expect(client.pending).toHaveLength(0));
    const payload = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(payload).toMatchObject({ base_revision: 1, client_id: 'tab-a', sequence: 1 });
    expect(client.revision).toBe(2);
    expect(client.pending).toHaveLength(0);
  });

  it('transforms a remote insert against a pending local insert', () => {
    const applyRemote = vi.fn();
    const client = new TextCollaborationClient({
      projectId: 4, fileId: 8, clientId: 'client-b', applyRemote,
    });
    client.pending = [{
      base_revision: 1, client_id: 'client-b', sequence: 1,
      changes: [{ from: 1, to: 1, insert: 'B' }],
    }];

    client._receive(JSON.stringify({
      type: 'operation', revision: 2, client_id: 'client-a',
      changes: [{ from: 1, to: 1, insert: 'A' }],
    }));

    expect(applyRemote).toHaveBeenCalledWith(
      [{ from: 1, to: 1, insert: 'A' }],
      [expect.objectContaining({ changes: [{ from: 2, to: 2, insert: 'B' }] })],
    );
  });

  it('ignores its own operation broadcast', () => {
    const applyRemote = vi.fn();
    const client = new TextCollaborationClient({
      projectId: 4, fileId: 8, clientId: 'client-a', applyRemote,
    });
    client._receive(JSON.stringify({
      type: 'operation', revision: 2, client_id: 'client-a',
      changes: [{ from: 0, to: 0, insert: 'x' }],
    }));
    expect(applyRemote).not.toHaveBeenCalled();
  });
});
