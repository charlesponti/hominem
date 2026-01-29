import { db } from '@hominem/db';
import { possessions, type PossessionInput, type PossessionOutput } from '@hominem/db/schema';
import { and, desc, eq } from 'drizzle-orm';

type CreatePossessionInput = Omit<PossessionInput, 'createdAt' | 'updatedAt'> & {
  userId: string;
};

type UpdatePossessionInput = Partial<
  Omit<PossessionInput, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
> & {
  id: string;
  userId: string;
};

export async function listPossessions(userId: string): Promise<PossessionOutput[]> {
  return db
    .select()
    .from(possessions)
    .where(eq(possessions.userId, userId))
    .orderBy(desc(possessions.createdAt));
}

export async function createPossession(input: CreatePossessionInput): Promise<PossessionOutput> {
  const [created] = await db
    .insert(possessions)
    .values({
      ...input,
      dateAcquired: new Date(input.dateAcquired),
    })
    .returning();

  return created;
}

export async function updatePossession(
  input: UpdatePossessionInput,
): Promise<PossessionOutput | undefined> {
  const { id, userId, ...updates } = input;
  const [updated] = await db
    .update(possessions)
    .set({
      ...updates,
      dateAcquired: updates.dateAcquired ? new Date(updates.dateAcquired) : undefined,
    })
    .where(and(eq(possessions.id, id), eq(possessions.userId, userId)))
    .returning();

  return updated;
}

export async function deletePossession(id: string, userId: string): Promise<void> {
  await db.delete(possessions).where(and(eq(possessions.id, id), eq(possessions.userId, userId)));
}
