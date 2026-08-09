import { describe, expect, it } from 'vitest';

import {
  ARCHIVED_CHATS_ROUTE,
  ALL_ROUTE,
  HOME_ROUTE,
  INBOX_ROUTE,
  SETTINGS_ROUTE,
  TIME_ROUTE,
  getContentRoute,
  getTimeBlockRoute,
} from '~/services/navigation/routes';

describe('inbox routes', () => {
  it('builds the canonical All and Time routes', () => {
    expect(HOME_ROUTE).toBe('/(protected)');
    expect(ALL_ROUTE).toBe(HOME_ROUTE);
    expect(INBOX_ROUTE).toBe(ALL_ROUTE);
    expect(TIME_ROUTE).toBe('/(protected)/time');
    expect(SETTINGS_ROUTE).toBe('/(protected)/settings');
    expect(ARCHIVED_CHATS_ROUTE).toBe('/(protected)/settings/archived-chats');
    expect(getContentRoute('chat', 'chat-1')).toBe('/(protected)/inbox/chat/chat-1');
    expect(getContentRoute('note', 'note-1')).toBe('/(protected)/inbox/note/note-1');
  });

  it('rejects an empty content id', () => {
    expect(() => getContentRoute('chat', '')).toThrow('Content route requires an id');
  });

  it('builds canonical Time item routes', () => {
    expect(getTimeBlockRoute('task', 'task 1')).toBe('/(protected)/time/task/task%201');
    expect(getTimeBlockRoute('event', 'event-1')).toBe('/(protected)/time/event/event-1');
  });
});
