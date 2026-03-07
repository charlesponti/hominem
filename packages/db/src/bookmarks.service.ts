import { db } from '.';
import { and, desc, eq } from 'drizzle-orm';
import { bookmarks } from '@hominem/db/schema/bookmarks';

export type BookmarkInsert = typeof bookmarks.$inferInsert;
export type BookmarkSelect = typeof bookmarks.$inferSelect;

export async function listBookmarksByUser(userId: string): Promise<BookmarkSelect[]> {
  return db
    .select()
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt));
}

export async function createBookmarkForUser(
  userId: string,
  data: Omit<BookmarkInsert, 'id' | 'userId'>,
): Promise<BookmarkSelect> {
  const [created] = await db
    .insert(bookmarks)
    .values({
      ...data,
      id: crypto.randomUUID(),
      userId,
    })
    .returning();

  if (!created) {
    throw new Error('Failed to create bookmarks');
  }

  return created;
}

export async function updateBookmarkForUser(
  id: string,
  userId: string,
  data: Partial<Omit<BookmarkInsert, 'id' | 'userId'>>,
): Promise<BookmarkSelect | null> {
  const [updated] = await db
    .update(bookmarks)
    .set(data)
    .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)))
    .returning();

  return updated ?? null;
}

export async function deleteBookmarkForUser(id: string, userId: string): Promise<boolean> {
  const result = await db
    .delete(bookmarks)
    .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)))
    .returning({ id: bookmarks.id });

  return result.length > 0;
}
