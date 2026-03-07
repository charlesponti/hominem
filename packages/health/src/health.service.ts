import type { HealthRecords } from '@hominem/db'
import { db } from '@hominem/db'

type HealthRecordInsert = Omit<HealthRecords, 'id' | 'created_at'>

export async function listHealthRecords(filters: {
  userId?: string
  startDate?: Date
  endDate?: Date
  activityType?: string
}): Promise<HealthRecords[]> {
  let query = db.selectFrom('health_records').selectAll()

  if (filters.userId) {
    query = query.where('user_id', '=', filters.userId)
  }

  if (filters.startDate) {
    const startTime = filters.startDate.toISOString()
    query = query.where('recorded_at', '>=', startTime as any)
  }

  if (filters.endDate) {
    const endTime = filters.endDate.toISOString()
    query = query.where('recorded_at', '<=', endTime as any)
  }

  if (filters.activityType) {
    query = query.where('record_type', '=', filters.activityType)
  }

  return query.execute() as unknown as Promise<HealthRecords[]>
}

export async function getHealthRecord(id: string): Promise<HealthRecords | null> {
  const result = await db
    .selectFrom('health_records')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()

  return (result ?? null) as HealthRecords | null
}

export async function createHealthRecord(data: Omit<HealthRecordInsert, 'id' | 'created_at'>): Promise<HealthRecords> {
  const record = await db
    .insertInto('health_records')
    .values(data as any)
    .returningAll()
    .executeTakeFirstOrThrow()

  return record as unknown as HealthRecords
}

export async function updateHealthRecord(
  id: string,
  updates: Partial<Omit<HealthRecordInsert, 'id' | 'created_at'>>
): Promise<HealthRecords | null> {
  const record = await db
    .updateTable('health_records')
    .set(updates as any)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()

  return (record ?? null) as HealthRecords | null
}

export async function deleteHealthRecord(id: string): Promise<boolean> {
  const result = await db
    .deleteFrom('health_records')
    .where('id', '=', id)
    .executeTakeFirst()

  return (result.numDeletedRows ?? 0n) > 0n
}
