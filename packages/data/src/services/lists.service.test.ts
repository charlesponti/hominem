import crypto from 'node:crypto'
import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { db } from '../db'
import {
  list,
  users,
  item as itemTable,
  userLists,
} from '../db/schema'
import {
  getOwnedLists,
  getUserLists,
  getOwnedListsWithItemCount,
  getUserListsWithItemCount,
} from './lists.service'
import { eq } from 'drizzle-orm'
import { createTestUser } from '../../../utils/test/fixtures'

// Helper to check if DB is available; skip tests if not
async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await db.select().from(users).limit(1)
    return true
  } catch {
    console.warn('Database not available, skipping lists.service tests. Start test database on port 4433.')
    return false
  }
}

const dbAvailable = await isDatabaseAvailable()

describe.skipIf(!dbAvailable)('lists.service', () => {
  const ownerId = crypto.randomUUID()
  const sharedUserId = crypto.randomUUID()
  const listId = crypto.randomUUID()

  beforeEach(async () => {
    await createTestUser({ id: ownerId, name: 'Owner' })
    await createTestUser({ id: sharedUserId, name: 'Shared User' })

    // Create a list for owner
    await db.insert(list).values({ id: listId, name: 'Test List', userId: ownerId }).onConflictDoNothing()

    // Share the list with the shared user
    await db
      .insert(userLists)
      .values({ listId, userId: sharedUserId })
      .onConflictDoNothing()
  })

  afterEach(async () => {
    // Clean up items, user lists, lists and users
    await db.delete(itemTable).where(eq(itemTable.listId, listId)).catch(() => {})
    await db.delete(userLists).where(eq(userLists.listId, listId)).catch(() => {})
    await db.delete(list).where(eq(list.id, listId)).catch(() => {})
    await db.delete(users).where(eq(users.id, ownerId)).catch(() => {})
    await db.delete(users).where(eq(users.id, sharedUserId)).catch(() => {})
  })

  it('getOwnedLists should return lists owned by user (metadata only)', async () => {
    const owned = await getOwnedLists(ownerId)
    const found = owned.find((l) => l.id === listId)
    expect(found).toBeDefined()
    expect(found?.itemCount).toBeUndefined()
  })

  it('getUserLists should return lists shared with user (metadata only)', async () => {
    const shared = await getUserLists(sharedUserId)
    const found = shared.find((l) => l.id === listId)
    expect(found).toBeDefined()
    expect(found?.itemCount).toBeUndefined()
  })

  it('getOwnedListsWithItemCount should return counts for items in owned lists', async () => {
    // Insert a couple of items for the list
    const item1 = { id: crypto.randomUUID(), type: 'PLACE', itemId: crypto.randomUUID(), listId, userId: ownerId }
    const item2 = { id: crypto.randomUUID(), type: 'PLACE', itemId: crypto.randomUUID(), listId, userId: ownerId }
    await db.insert(itemTable).values([item1, item2]).onConflictDoNothing()

    const owned = await getOwnedListsWithItemCount(ownerId)
    const found = owned.find((l) => l.id === listId)
    expect(found).toBeDefined()
    expect(found?.itemCount).toBe(2)
  })

  it('getUserListsWithItemCount should return counts for items in shared lists', async () => {
    // Insert items
    const item1 = { id: crypto.randomUUID(), type: 'PLACE', itemId: crypto.randomUUID(), listId, userId: ownerId }
    await db.insert(itemTable).values(item1).onConflictDoNothing()

    const shared = await getUserListsWithItemCount(sharedUserId)
    const found = shared.find((l) => l.id === listId)
    expect(found).toBeDefined()
    expect(found?.itemCount).toBe(1)
  })
})
