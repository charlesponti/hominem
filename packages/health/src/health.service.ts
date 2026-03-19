import crypto from 'node:crypto';

import type { Database } from '@hominem/db';
import { db } from '@hominem/db';
import type { Selectable } from 'kysely';

export type HealthRecordRow = Selectable<Database['health_records']>;

export async function listHealthRecords(filters: {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  recordType?: string;
}): Promise<HealthRecordRow[]> {
  let query = db.selectFrom('health_records').selectAll();

  if (filters.userId) {
    query = query.where('user_id', '=', filters.userId);
  }

  if (filters.startDate) {
    query = query.where('recorded_at', '>=', filters.startDate);
  }

  if (filters.endDate) {
    query = query.where('recorded_at', '<=', filters.endDate);
  }

  if (filters.recordType) {
    query = query.where('record_type', '=', filters.recordType);
  }

  return query.execute();
}

export async function getHealthRecord(id: string): Promise<HealthRecordRow | null> {
  const result = await db
    .selectFrom('health_records')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst();

  return result ?? null;
}

export async function createHealthRecord(
  data: Omit<HealthRecordRow, 'id' | 'created_at'>,
): Promise<HealthRecordRow> {
  const now = new Date();

  return db
    .insertInto('health_records')
    .values({
      id: crypto.randomUUID(),
      created_at: now,
      ...data,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateHealthRecord(
  id: string,
  updates: Partial<Omit<HealthRecordRow, 'id' | 'created_at'>>,
): Promise<HealthRecordRow | null> {
  if (Object.keys(updates).length === 0) {
    return getHealthRecord(id);
  }

  const result = await db
    .updateTable('health_records')
    .set(updates)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();

  return result ?? null;
}

export async function deleteHealthRecord(id: string): Promise<boolean> {
  const result = await db.deleteFrom('health_records').where('id', '=', id).executeTakeFirst();

  return (result.numDeletedRows ?? 0n) > 0n;
}
