/**
 * Bookmarks service - manages bookmarks and collections
 *
 * Contract:
 * - list* methods return arrays ([] when empty, never null)
 * - get* methods return T | null
 * - create/update/delete throw on system errors, return null/false for expected misses
 * - All operations are user-scoped (userId filter)
 */

import { eq, and, desc } from 'drizzle-orm'
import type { Database } from './client'
import { db as defaultDb } from '../index'
import { bookmarks } from '../schema/bookmarks'
import type { UserId } from './_shared/ids'
import { ForbiddenError } from './_shared/errors'

// Local types for this service
type Bookmark = typeof bookmarks.$inferSelect
type BookmarkInsert = typeof bookmarks.$inferInsert
type BookmarkUpdate = Partial<Omit<BookmarkInsert, 'id' | 'userId' | 'createdAt'>>

/**
 * Internal helper: verify user ownership
 * @throws ForbiddenError if bookmark doesn't belong to user
 */
async function getBookmarkWithOwnershipCheck(db: Database | undefined, bookmarkId: string, userId: UserId): Promise<Bookmark> {
  const database = db || (defaultDb as any as Database)
  const bookmark = await database.query.bookmarks.findFirst({
    where: and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, String(userId))),
  })

  if (!bookmark) {
    throw new ForbiddenError(`Bookmark not found or access denied`, 'ownership')
  }

  return bookmark
}

/**
 * List user's bookmarks with optional folder filtering
 *
 * @param userId - User ID (enforced in all queries)
 * @param folder - Optional folder filter
 * @param db - Database context
 * @returns Array of bookmarks (empty if none)
 */
export async function listBookmarks(
  userId: UserId,
  folder?: string,
  db?: Database
): Promise<Bookmark[]> {
  const database = db || (defaultDb as any as Database)
  const filters: any[] = [eq(bookmarks.userId, String(userId))]

  if (folder) {
    filters.push(eq(bookmarks.folder, folder))
  }

  const results = await database.query.bookmarks.findMany({
    where: and(...filters),
    orderBy: desc(bookmarks.createdAt),
  })

  return results
}

/**
 * Get a single bookmark by ID
 *
 * @param bookmarkId - Bookmark ID
 * @param userId - User ID (enforces ownership)
 * @param db - Database context
 * @returns Bookmark or null if not found
 */
export async function getBookmark(
  bookmarkId: string,
  userId: UserId,
  db?: Database
): Promise<Bookmark | null> {
  const database = db || (defaultDb as any as Database)
  const bookmark = await database.query.bookmarks.findFirst({
    where: and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, String(userId))),
  })

  return bookmark ?? null
}

/**
 * Create a new bookmark
 *
 * @param userId - User ID
 * @param input - Bookmark data
 * @param db - Database context
 * @throws Error if creation fails
 * @returns Created bookmark
 */
export async function createBookmark(
  userId: UserId,
  input: {
    url: string
    title?: string | null
    description?: string | null
    folder?: string | null
  },
  db?: Database
): Promise<Bookmark> {
  const database = db || (defaultDb as any as Database)
  const result = await database.insert(bookmarks)
    .values({
      userId: String(userId),
      url: input.url,
      title: input.title ?? null,
      description: input.description ?? null,
      folder: input.folder ?? null,
    })
    .returning()

  if (!result[0]) {
    throw new Error('Failed to create bookmark')
  }

  return result[0]
}

/**
 * Update an existing bookmark
 *
 * @param bookmarkId - Bookmark ID
 * @param userId - User ID (enforces ownership)
 * @param input - Partial bookmark data to update
 * @param db - Database context
 * @throws ForbiddenError if user doesn't own the bookmark
 * @returns Updated bookmark or null if already deleted
 */
export async function updateBookmark(
  bookmarkId: string,
  userId: UserId,
  input: BookmarkUpdate,
  db?: Database
): Promise<Bookmark | null> {
  const database = db || (defaultDb as any as Database)
  // Verify ownership first
  await getBookmarkWithOwnershipCheck(database, bookmarkId, userId)

  const result = await database.update(bookmarks)
    .set(input)
    .where(eq(bookmarks.id, bookmarkId))
    .returning()

  return result[0] ?? null
}

/**
 * Delete a bookmark
 *
 * @param bookmarkId - Bookmark ID
 * @param userId - User ID (enforces ownership)
 * @param db - Database context
 * @throws ForbiddenError if user doesn't own the bookmark
 * @returns True if deleted, false if already deleted
 */
export async function deleteBookmark(
  bookmarkId: string,
  userId: UserId,
  db?: Database
): Promise<boolean> {
  const database = db || (defaultDb as any as Database)
  // Verify ownership first
  await getBookmarkWithOwnershipCheck(database, bookmarkId, userId)

  // Delete the bookmark
  const result = await database.delete(bookmarks).where(eq(bookmarks.id, bookmarkId)).returning()

  return result.length > 0
}
