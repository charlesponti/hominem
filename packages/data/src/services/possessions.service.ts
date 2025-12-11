import { db } from '@hominem/data/db'
import { type PossessionInsert, possessions } from '@hominem/data/schema'
import { and, desc, eq } from 'drizzle-orm'

type CreatePossessionInput = Omit<PossessionInsert, 'createdAt' | 'updatedAt'> & {
  userId: string
}

type UpdatePossessionInput = Partial<
  Omit<PossessionInsert, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
> & {
  id: string
  userId: string
}

export async function listPossessions(userId: string) {
  return db
    .select()
    .from(possessions)
    .where(eq(possessions.userId, userId))
    .orderBy(desc(possessions.createdAt))
}

export async function createPossession(input: CreatePossessionInput) {
  const [created] = await db
    .insert(possessions)
    .values({
      ...input,
      dateAcquired: new Date(input.dateAcquired),
    })
    .returning()

  return created
}

export async function updatePossession(input: UpdatePossessionInput) {
  const { id, userId, ...updates } = input
  const [updated] = await db
    .update(possessions)
    .set({
      ...updates,
      dateAcquired: updates.dateAcquired ? new Date(updates.dateAcquired) : undefined,
    })
    .where(and(eq(possessions.id, id), eq(possessions.userId, userId)))
    .returning()

  return updated
}

export async function deletePossession(id: string, userId: string) {
  await db.delete(possessions).where(and(eq(possessions.id, id), eq(possessions.userId, userId)))
}
