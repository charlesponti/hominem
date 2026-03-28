import { getUserChatsQuery } from '@hominem/chat-services/server';
import { db } from '@hominem/db';
import type { FocusItem, FocusListOutput } from '@hominem/rpc';
import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../middleware/auth';

export const focusRoutes = new Hono<AppContext>().use('*', authMiddleware).get('/', async (c) => {
  const userId = c.get('userId')!;

  const [noteRows, chats] = await Promise.all([
    db
      .selectFrom('app.notes')
      .selectAll()
      .where('owner_user_id', '=', userId)
      .orderBy('updated_at', 'desc')
      .limit(100)
      .execute(),
    getUserChatsQuery(userId, 20),
  ]);

  const noteItems: FocusItem[] = noteRows.map((row) => {
    return {
      kind: 'note',
      id: row.id,
      title: 'Untitled note',
      preview: null,
      updatedAt:
        row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    };
  });

  const chatItems: FocusItem[] = chats.map((chat) => ({
    kind: 'chat',
    id: chat.id,
    title: chat.title?.trim() || 'Untitled session',
    preview: null,
    updatedAt: chat.updatedAt,
  }));

  const items = [...noteItems, ...chatItems].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return c.json({ items } satisfies FocusListOutput);
});
