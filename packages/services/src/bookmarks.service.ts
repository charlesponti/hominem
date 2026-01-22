import { db } from '@hominem/db';
import { bookmark, type BookmarkInsert, type BookmarkSelect } from '@hominem/db/schema';
import { and, desc, eq } from 'drizzle-orm';

export type { BookmarkInsert, BookmarkSelect };

export async function listBookmarksByUser(userId: string): Promise<BookmarkSelect[]> {
  return db
    .select()
    .from(bookmark)
    .where(eq(bookmark.userId, userId))
    .orderBy(desc(bookmark.createdAt));
}

export async function createBookmarkForUser(
  userId: string,
  data: Omit<BookmarkInsert, 'id' | 'userId'>,
): Promise<BookmarkSelect> {
  const [created] = await db
    .insert(bookmark)
    .values({
      ...data,
      id: crypto.randomUUID(),
      userId,
    })
    .returning();

  return created;
}

export async function updateBookmarkForUser(
  id: string,
  userId: string,
  data: Partial<Omit<BookmarkInsert, 'id' | 'userId'>>,
): Promise<BookmarkSelect | null> {
  const [updated] = await db
    .update(bookmark)
    .set(data)
    .where(and(eq(bookmark.id, id), eq(bookmark.userId, userId)))
    .returning();

  return updated ?? null;
}

export async function deleteBookmarkForUser(id: string, userId: string): Promise<boolean> {
  const result = await db
    .delete(bookmark)
    .where(and(eq(bookmark.id, id), eq(bookmark.userId, userId)))
    .returning({ id: bookmark.id });

  return result.length > 0;
}
