import { randomUUID } from 'node:crypto'
import { db } from '../db'
import {
  type PlaidItem,
  type PlaidItemInsert,
  financialInstitutions,
  plaidItems,
} from '../db/schema'
import { and, eq } from 'drizzle-orm'

export async function getPlaidItemByUserAndItemId(
  userId: string,
  itemId: string
): Promise<PlaidItem | null> {
  return (
    (await db.query.plaidItems.findFirst({
      where: and(eq(plaidItems.userId, userId), eq(plaidItems.itemId, itemId)),
    })) ?? null
  )
}

export async function getPlaidItemById(id: string, userId: string): Promise<PlaidItem | null> {
  return (
    (await db.query.plaidItems.findFirst({
      where: and(eq(plaidItems.id, id), eq(plaidItems.userId, userId)),
    })) ?? null
  )
}

export async function getPlaidItemByItemId(itemId: string): Promise<PlaidItem | null> {
  return (
    (await db.query.plaidItems.findFirst({
      where: eq(plaidItems.itemId, itemId),
    })) ?? null
  )
}

export async function ensureInstitutionExists(id: string, name: string) {
  const existing = await db.query.financialInstitutions.findFirst({
    where: eq(financialInstitutions.id, id),
  })

  if (existing) { return existing }

  const [created] = await db
    .insert(financialInstitutions)
    .values({
      id,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  return created
}

export async function upsertPlaidItem(params: {
  userId: string
  itemId: string
  accessToken: string
  institutionId: string
  status?: PlaidItem['status']
  lastSyncedAt?: Date | null
}): Promise<PlaidItem> {
  const {
    userId,
    itemId,
    accessToken,
    institutionId,
    status = 'active',
    lastSyncedAt = null,
  } = params

  const existingItem = await getPlaidItemByUserAndItemId(userId, itemId)

  if (existingItem) {
    const [updated] = await db
      .update(plaidItems)
      .set({
        accessToken,
        status,
        error: null,
        lastSyncedAt,
        updatedAt: new Date(),
      })
      .where(eq(plaidItems.id, existingItem.id))
      .returning()

    return updated
  }

  const [created] = await db
    .insert(plaidItems)
    .values({
      id: randomUUID(),
      itemId,
      accessToken,
      institutionId,
      status,
      lastSyncedAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId,
    })
    .returning()

  return created
}

export async function updatePlaidItemStatusByItemId(
  itemId: string,
  updates: Partial<Pick<PlaidItemInsert, 'status' | 'error' | 'updatedAt' | 'lastSyncedAt'>>
) {
  await db
    .update(plaidItems)
    .set({
      ...updates,
      updatedAt: updates.updatedAt ?? new Date(),
    })
    .where(eq(plaidItems.itemId, itemId))
}

export async function updatePlaidItemStatusById(
  id: string,
  updates: Partial<Pick<PlaidItemInsert, 'status' | 'error' | 'updatedAt' | 'lastSyncedAt'>>
) {
  await db
    .update(plaidItems)
    .set({
      ...updates,
      updatedAt: updates.updatedAt ?? new Date(),
    })
    .where(eq(plaidItems.id, id))
}

export async function deletePlaidItem(id: string, userId: string) {
  await db.delete(plaidItems).where(and(eq(plaidItems.id, id), eq(plaidItems.userId, userId)))
}
