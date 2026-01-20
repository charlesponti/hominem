import { db } from '@hominem/db';
import { health } from '@hominem/db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';

export type HealthRecord = typeof health.$inferSelect;
export type HealthInsert = typeof health.$inferInsert;

export async function listHealthRecords(filters: {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  activityType?: string;
}) {
  const conditions = [];
  if (filters.userId) {
    conditions.push(eq(health.userId, filters.userId));
  }
  if (filters.startDate) {
    conditions.push(gte(health.date, filters.startDate));
  }
  if (filters.endDate) {
    conditions.push(lte(health.date, filters.endDate));
  }
  if (filters.activityType) {
    conditions.push(eq(health.activityType, filters.activityType));
  }

  if (conditions.length === 0) {
    return db.select().from(health);
  }

  return db
    .select()
    .from(health)
    .where(and(...conditions));
}

export async function getHealthRecord(id: number) {
  const result = await db.select().from(health).where(eq(health.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createHealthRecord(data: HealthInsert) {
  const [record] = await db.insert(health).values(data).returning();
  return record;
}

export async function updateHealthRecord(id: number, updates: Partial<HealthInsert>) {
  const [record] = await db.update(health).set(updates).where(eq(health.id, id)).returning();
  return record ?? null;
}

export async function deleteHealthRecord(id: number) {
  const deleted = await db.delete(health).where(eq(health.id, id)).returning();
  return deleted.length > 0;
}
