import { db } from '.';
import { and, desc, eq } from 'drizzle-orm';
import { possessions } from '@hominem/db/schema/possessions';

export type PossessionInsert = typeof possessions.$inferInsert;
export type PossessionSelect = typeof possessions.$inferSelect;

type UpdatePossessionInput = Partial<
  Omit<PossessionInsert, 'id' | 'userId' | 'createdAt'>
> & {
  id: string;
  userId: string;
};

type CreatePossessionInput = Omit<PossessionInsert, 'id' | 'createdAt'> & {
  userId: string;
};

export async function listPossessions(userId: string): Promise<PossessionSelect[]> {
  return db
    .select()
    .from(possessions)
    .where(eq(possessions.userId, userId))
    .orderBy(desc(possessions.createdAt));
}

export async function createPossession(input: CreatePossessionInput): Promise<PossessionSelect> {
  const [created] = await db
    .insert(possessions)
    .values({
      ...input,
    })
    .returning();

  if (!created) {
    throw new Error('Failed to create possession');
  }

  return created;
}

export async function updatePossession(
  input: UpdatePossessionInput,
): Promise<PossessionSelect | undefined> {
  const { id, userId, ...updates } = input;
  const [updated] = await db
    .update(possessions)
    .set({
      ...updates,
    })
    .where(and(eq(possessions.id, id), eq(possessions.userId, userId)))
    .returning();

  return updated;
}

export async function deletePossession(id: string, userId: string): Promise<void> {
  await db.delete(possessions).where(and(eq(possessions.id, id), eq(possessions.userId, userId)));
}
