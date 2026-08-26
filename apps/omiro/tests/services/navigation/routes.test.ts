import { describe, expect, it } from 'vitest';

import {
  ARCHIVED_CHATS_ROUTE,
  HOME_ROUTE,
  NEW_CHAT_ROUTE,
  SETTINGS_ROUTE,
  STREAM_ROUTE,
  TIME_ROUTE,
  getContentRoute,
  getTimeBlockRoute,
} from '~/services/navigation/routes';

describe('protected routes', () => {
  it('builds the canonical Chat, Stream, and Time routes', () => {
    expect(HOME_ROUTE).toBe('/(protected)');
    expect(NEW_CHAT_ROUTE).toBe('/(protected)/new-chat');
    expect(STREAM_ROUTE).toBe('/(protected)/stream');
    expect(TIME_ROUTE).toBe('/(protected)/time');
    expect(SETTINGS_ROUTE).toBe('/(protected)/settings');
    expect(ARCHIVED_CHATS_ROUTE).toBe('/(protected)/chats/archived');
    expect(getContentRoute('chat', 'chat-1')).toBe('/(protected)/chats/chat-1');
    expect(getContentRoute('note', 'note-1')).toBe('/(protected)/notes/note-1');
  });

  it('rejects an empty content id', () => {
    expect(() => getContentRoute('chat', '')).toThrow('Content route requires an id');
  });

  it('builds canonical Time item routes', () => {
    expect(getTimeBlockRoute('task', 'task 1')).toBe('/(protected)/time/task/task%201');
    expect(getTimeBlockRoute('event', 'event-1')).toBe('/(protected)/time/event/event-1');
  });
});
