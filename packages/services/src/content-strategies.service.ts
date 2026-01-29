import { db } from '@hominem/db';
import {
  contentStrategies,
  type ContentStrategiesInput,
  type ContentStrategiesOutput,
  type ContentStrategy,
} from '@hominem/db/schema';
import { and, eq } from 'drizzle-orm';

export class ContentStrategiesService {
  async create(data: ContentStrategiesInput) {
    const [result] = await db.insert(contentStrategies).values(data).returning();
    return result;
  }

  async getByUserId(userId: string): Promise<ContentStrategiesOutput[]> {
    return db.select().from(contentStrategies).where(eq(contentStrategies.userId, userId));
  }

  async getById(id: string, userId: string): Promise<ContentStrategiesOutput | undefined> {
    const [result] = await db
      .select()
      .from(contentStrategies)
      .where(and(eq(contentStrategies.id, id), eq(contentStrategies.userId, userId)));

    return result;
  }

  async update(
    id: string,
    userId: string,
    data: {
      title?: string;
      description?: string;
      strategy?: ContentStrategy;
    },
  ): Promise<ContentStrategiesOutput | undefined> {
    const [result] = await db
      .update(contentStrategies)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(contentStrategies.id, id), eq(contentStrategies.userId, userId)))
      .returning();

    return result;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(contentStrategies)
      .where(and(eq(contentStrategies.id, id), eq(contentStrategies.userId, userId)));

    return result.length > 0;
  }
}
