import type { Chat, SessionSource } from '@hominem/rpc/types';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CHAT_TITLE,
  getChatTitle,
  isDefaultChatTitle,
  normalizeChatTitle,
  updateChatTitleCaches,
} from '~/services/chat/chat-title';
import { chatKeys } from '~/services/notes/query-keys';

describe('chat title helpers', () => {
  it('normalizes titles, recognizes the default title, and resolves the display title', () => {
    expect(normalizeChatTitle('  hello   world  ')).toBe('hello world');
    expect(normalizeChatTitle('   ')).toBe(DEFAULT_CHAT_TITLE);
    expect(isDefaultChatTitle(DEFAULT_CHAT_TITLE)).toBe(true);
    expect(isDefaultChatTitle('Something else')).toBe(false);
  });

  it('gets the display title - custom, source-derived, or default', () => {
    const captureSource: SessionSource = {
      kind: 'capture',
      preview: 'First real message',
    };
    const linkedNoteSource: SessionSource = {
      kind: 'artifact',
      id: 'note-1',
      type: 'note' as const,
      title: 'Linked note title',
    };
    const newSource: SessionSource = {
      kind: 'new',
    };

    // Custom title takes precedence
    expect(getChatTitle('Saved title', captureSource)).toBe('Saved title');

    // Falls back to source-derived when title is default
    expect(getChatTitle(DEFAULT_CHAT_TITLE, captureSource)).toBe('First real message');
    expect(getChatTitle(null, captureSource)).toBe('First real message');
    expect(getChatTitle(undefined, captureSource)).toBe('First real message');

    // Linked note source
    expect(getChatTitle(DEFAULT_CHAT_TITLE, linkedNoteSource)).toBe('Linked note title');

    // New chat falls back to default
    expect(getChatTitle(null, newSource)).toBe(DEFAULT_CHAT_TITLE);
  });

  it('updates the canonical chat record', () => {
    const queryClient = new QueryClient();
    const chat: Chat = {
      archivedAt: null,
      createdAt: '2026-04-13T01:29:18.000Z',
      id: 'chat-1',
      noteId: null,
      title: DEFAULT_CHAT_TITLE,
      updatedAt: '2026-04-13T01:29:18.000Z',
      userId: 'user-1',
    };
    queryClient.setQueryData(chatKeys.activeChat(chat.id), chat);

    updateChatTitleCaches(queryClient, {
      chatId: chat.id,
      title: 'A better title',
      updatedAt: '2026-04-13T01:30:00.000Z',
    });

    expect(queryClient.getQueryData(chatKeys.activeChat(chat.id))).toMatchObject({
      title: 'A better title',
      updatedAt: '2026-04-13T01:30:00.000Z',
    });
  });
});
