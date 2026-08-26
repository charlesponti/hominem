import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('~/services/storage/mmkv', () => {
  const store = new Map<string, string>();

  return {
    storage: {
      getString: (key: string) => store.get(key),
      remove: (key: string) => {
        store.delete(key);
      },
      set: (key: string, value: string) => {
        store.set(key, value);
      },
    },
  };
});

describe('inbox launch state', () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it('stores resume metadata independently from drafts', async () => {
    const launchState = await import('~/services/navigation/launch-state');

    launchState.writeInboxDraft('Follow up on notes');
    launchState.writeResumeTarget({
      kind: 'note',
      id: 'note-1',
      title: 'Roadmap note',
      updatedAt: '2026-06-18T12:00:00.000Z',
    });

    expect(launchState.readInboxDraft()).toBe('Follow up on notes');
    expect(launchState.readResumeTarget()).toEqual({
      kind: 'note',
      id: 'note-1',
      title: 'Roadmap note',
      updatedAt: '2026-06-18T12:00:00.000Z',
    });

    launchState.clearResumeTarget();
    expect(launchState.readResumeTarget()).toBeNull();
    expect(launchState.readInboxDraft()).toBe('Follow up on notes');
  });

  it('keeps the new-chat draft separate from the All composer draft', async () => {
    const launchState = await import('~/services/navigation/launch-state');

    launchState.writeInboxDraft('A note in All');
    launchState.writeNewChatDraft('A new conversation');

    expect(launchState.readInboxDraft()).toBe('A note in All');
    expect(launchState.readNewChatDraft()).toBe('A new conversation');
    launchState.clearNewChatDraft();
    expect(launchState.readNewChatDraft()).toBe('');
    expect(launchState.readInboxDraft()).toBe('A note in All');
  });

  it('consumes inbox resume metadata once', async () => {
    const launchState = await import('~/services/navigation/launch-state');

    launchState.writeResumeTarget({
      kind: 'chat',
      id: 'chat-1',
      title: 'Follow up',
      updatedAt: '2026-06-18T12:00:00.000Z',
    });

    expect(launchState.consumeResumeTarget()).toEqual({
      kind: 'chat',
      id: 'chat-1',
      title: 'Follow up',
      updatedAt: '2026-06-18T12:00:00.000Z',
    });
    expect(launchState.consumeResumeTarget()).toBeNull();
    expect(launchState.readResumeTarget()).toBeNull();
  });

  it('only consumes the inbox restore attempt once per module load', async () => {
    const launchState = await import('~/services/navigation/launch-state');

    expect(launchState.consumeRestoreAttempt()).toBe(true);
    expect(launchState.consumeRestoreAttempt()).toBe(false);
  });
});
