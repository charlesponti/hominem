import { db } from '@ponti/utils/db'
import { list, userLists, users } from '@ponti/utils/schema'
import { desc, eq } from 'drizzle-orm'

export async function getUserLists(userId: string) {
  return db
    .select()
    .from(userLists)
    .where(eq(userLists.userId, userId))
    .leftJoin(list, eq(userLists.listId, list.id))
    .leftJoin(users, eq(userLists.userId, users.id))
    .orderBy(desc(list.createdAt))
}
