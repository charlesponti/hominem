import { describe, expect, it } from 'vitest';

import { toThreadViewModel } from '~/components/inbox/ThreadViewModel';

describe('toThreadViewModel', () => {
  it('keeps chat as a conversation presentation', () => {
    const item = {
      id: 'chat-1',
      entityId: 'chat-1',
      kind: 'chat' as const,
      preview: 'Hello',
      title: 'A chat',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    expect(toThreadViewModel(item, '/thread/chat-1')).toMatchObject({
      kind: 'chat',
      variant: 'conversation',
      route: '/thread/chat-1',
    });
  });

  it('keeps note as a document presentation', () => {
    const item = {
      id: 'note-1',
      entityId: 'note-1',
      kind: 'note' as const,
      preview: 'Body',
      title: 'A note',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    expect(toThreadViewModel(item, '/thread/note-1')).toMatchObject({
      kind: 'note',
      variant: 'document',
      route: '/thread/note-1',
    });
  });
});
