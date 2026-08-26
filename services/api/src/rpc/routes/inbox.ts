import { db, sql } from '@hominem/db';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { InboxQuerySchema } from '../../schemas/inbox.schema';
import { authMiddleware, type AppContext } from '../middleware/auth';

type InboxCursor = {
  updatedAt: string;
  id: string;
};

type InboxRow = {
  kind: 'note' | 'chat';
  id: string;
  entityId: string;
  title: string | null;
  preview: string | null;
  updatedAt: string;
};

function encodeInboxCursor(item: InboxRow): string {
  return Buffer.from(JSON.stringify({ updatedAt: item.updatedAt, id: item.id })).toString(
    'base64url',
  );
}

function decodeInboxCursor(cursor: string | undefined): InboxCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as InboxCursor;
    if (typeof parsed.updatedAt !== 'string' || typeof parsed.id !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export const inboxRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', zValidator('query', InboxQuerySchema), async (c) => {
    const userId = c.get('auth')!.userId;
    const query = c.req.valid('query');
    const parsedLimit = query.limit ? Number.parseInt(query.limit, 10) : 50;
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;
    const cursor = decodeInboxCursor(query.cursor);
    const { rows } = await sql<InboxRow>`
      with inbox_items as (
        select
          'chat' as "kind",
          c.id as "id",
          c.id as "entityId",
          c.title as "title",
          null::text as "preview",
          c.last_message_at as "updatedAt"
        from app.chats c
        where c.owner_userid = ${userId}
          and c.archived_at is null

        union all

        select
          'note' as "kind",
          n.id as "id",
          n.id as "entityId",
          n.title as "title",
          left(coalesce(n.excerpt, n.content), 240) as "preview",
          n.updatedat as "updatedAt"
        from app.notes n
        where n.owner_userid = ${userId}
      )
      select *
      from inbox_items
      where ${
        cursor
          ? sql`("updatedAt", "id") < (${cursor.updatedAt}::timestamptz, ${cursor.id})`
          : sql`true`
      }
      order by "updatedAt" desc, "id" desc
      limit ${limit + 1}
    `.execute(db);

    const items = rows.slice(0, limit);
    const lastItem = items.at(-1);
    const nextCursor = rows.length > limit && lastItem ? encodeInboxCursor(lastItem) : null;

    return c.json({
      items,
      nextCursor,
    });
  });
