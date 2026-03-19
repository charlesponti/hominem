import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatOutput } from '../contracts';
import {
  archiveChatQuery,
  clearChatMessagesQuery,
  createChatQuery,
  deleteChatQuery,
  getChatByIdQuery,
  getChatByNoteIdQuery,
  getOrCreateActiveChatQuery,
  getUserChatsQuery,
  updateChatTitleQuery,
} from './chat.queries';
import { ChatService } from './chat.service';

vi.mock('./chat.queries', () => ({
  archiveChatQuery: vi.fn(),
  createChatQuery: vi.fn(),
  getChatByIdQuery: vi.fn(),
  getOrCreateActiveChatQuery: vi.fn(),
  getUserChatsQuery: vi.fn(),
  updateChatTitleQuery: vi.fn(),
  deleteChatQuery: vi.fn(),
  clearChatMessagesQuery: vi.fn(),
  getChatByNoteIdQuery: vi.fn(),
}));

const buildChat = (overrides: Partial<ChatOutput> = {}): ChatOutput => ({
  archivedAt: overrides.archivedAt ?? null,
  id: overrides.id ?? 'chat_1',
  userId: overrides.userId ?? 'user_1',
  title: overrides.title ?? 'New Chat',
  noteId: overrides.noteId ?? null,
  createdAt: overrides.createdAt ?? '2026-03-04T00:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-03-04T00:00:00.000Z',
});

describe('ChatService', () => {
  const service = new ChatService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes caller scope to getOrCreateActiveChat query', async () => {
    const chat = buildChat();
    vi.mocked(getOrCreateActiveChatQuery).mockResolvedValue(chat);

    const result = await service.getOrCreateActiveChat('user_1', 'chat_1');

    expect(result).toEqual(chat);
    expect(getOrCreateActiveChatQuery).toHaveBeenCalledWith('user_1', 'chat_1');
  });

  it('applies ownership scope when updating chat title', async () => {
    const chat = buildChat({ title: 'Renamed' });
    vi.mocked(updateChatTitleQuery).mockResolvedValue(chat);

    const result = await service.updateChatTitle('chat_1', 'Renamed', 'user_1');

    expect(result.title).toBe('Renamed');
    expect(updateChatTitleQuery).toHaveBeenCalledWith('chat_1', 'Renamed', 'user_1');
  });

  it('archives chat with caller ownership scope', async () => {
    const chat = buildChat({ archivedAt: '2026-03-19T00:00:00.000Z' });
    vi.mocked(archiveChatQuery).mockResolvedValue(chat);

    const result = await service.archiveChat('chat_1', 'user_1');

    expect(result.archivedAt).toBe('2026-03-19T00:00:00.000Z');
    expect(archiveChatQuery).toHaveBeenCalledWith('chat_1', 'user_1');
  });

  it('treats delete as idempotent when scoped chat does not exist', async () => {
    vi.mocked(deleteChatQuery).mockResolvedValue(false);

    const result = await service.deleteChat('chat_1', 'user_1');

    expect(result).toBe(true);
    expect(deleteChatQuery).toHaveBeenCalledWith('chat_1', 'user_1');
  });

  it('treats clear messages as idempotent when scoped chat does not exist', async () => {
    vi.mocked(clearChatMessagesQuery).mockResolvedValue(false);

    const result = await service.clearChatMessages('chat_1', 'user_1');

    expect(result).toBe(true);
    expect(clearChatMessagesQuery).toHaveBeenCalledWith('chat_1', 'user_1');
  });

  it('keeps search scoped to caller-owned chats', async () => {
    vi.mocked(getUserChatsQuery).mockResolvedValue([
      buildChat({ id: 'chat_1', title: 'Project Alpha' }),
      buildChat({ id: 'chat_2', title: 'Weekly Notes' }),
    ]);

    const result = await service.searchChats({
      userId: 'user_1',
      query: 'project',
      limit: 20,
    });

    expect(result.map((chat) => chat.id)).toEqual(['chat_1']);
  });

  it('creates note chat with caller ownership when none exists', async () => {
    const created = buildChat({ id: 'chat_note_1', noteId: 'note_1' });
    vi.mocked(getChatByNoteIdQuery).mockResolvedValue(null);
    vi.mocked(createChatQuery).mockResolvedValue(created);

    const result = await service.getOrCreateChatForNote('note_1', 'user_1');

    expect(result).toEqual(created);
    expect(createChatQuery).toHaveBeenCalledWith({
      title: 'Note Chat',
      userId: 'user_1',
      noteId: 'note_1',
    });
  });

  it('loads chat by id with caller ownership scope', async () => {
    const chat = buildChat();
    vi.mocked(getChatByIdQuery).mockResolvedValue(chat);

    const result = await service.getChatById('chat_1', 'user_1');

    expect(result).toEqual(chat);
    expect(getChatByIdQuery).toHaveBeenCalledWith('chat_1', 'user_1');
  });
});
