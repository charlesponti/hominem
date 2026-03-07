import crypto from 'node:crypto'
import type { Selectable } from 'kysely'
import type { Database, HealthRecords } from '@hominem/db'
import { db } from '@hominem/db'

type HealthRecordRow = Selectable<Database['health_records']>

function toHealthRecord(row: HealthRecordRow): HealthRecords {
  return {
    id: row.id,
    userId: row.user_id,
    recordType: row.record_type,
    recordedAt: row.recorded_at instanceof Date ? row.recorded_at.toISOString() : row.recorded_at,
    value: row.value,
    unit: row.unit,
    metadata: row.metadata,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  }
}

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
    query = query.where('recorded_at', '>=', startTime)
  }

  if (filters.endDate) {
    const endTime = filters.endDate.toISOString()
    query = query.where('recorded_at', '<=', endTime)
  }

  if (filters.activityType) {
    query = query.where('record_type', '=', filters.activityType)
  }

  const results = await query.execute()
  return results.map(toHealthRecord)
}

export async function getHealthRecord(id: string): Promise<HealthRecords | null> {
  const result = await db
    .selectFrom('health_records')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirst()

  return result ? toHealthRecord(result) : null
}

export async function createHealthRecord(
  data: Omit<HealthRecords, 'id' | 'createdAt'>,
): Promise<HealthRecords> {
  const now = new Date().toISOString()

  const record = await db
    .insertInto('health_records')
    .values({
      id: crypto.randomUUID(),
      user_id: data.userId,
      record_type: data.recordType,
      recorded_at: data.recordedAt,
      value: data.value,
      unit: data.unit,
      metadata: data.metadata ?? null,
      created_at: now,
    })
    .returningAll()
    .executeTakeFirstOrThrow()

  return toHealthRecord(record)
}

export async function updateHealthRecord(
  id: string,
  updates: Partial<Omit<HealthRecords, 'id' | 'createdAt'>>,
): Promise<HealthRecords | null> {
  const updateData: Record<string, unknown> = {}

  if (updates.userId !== undefined) updateData.user_id = updates.userId
  if (updates.recordType !== undefined) updateData.record_type = updates.recordType
  if (updates.recordedAt !== undefined) updateData.recorded_at = updates.recordedAt
  if (updates.value !== undefined) updateData.value = updates.value
  if (updates.unit !== undefined) updateData.unit = updates.unit
  if (updates.metadata !== undefined) updateData.metadata = updates.metadata

  if (Object.keys(updateData).length === 0) {
    return getHealthRecord(id)
  }

  const record = await db
    .updateTable('health_records')
    .set(updateData)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()

  return record ? toHealthRecord(record) : null
}

export async function deleteHealthRecord(id: string): Promise<boolean> {
  const result = await db
    .deleteFrom('health_records')
    .where('id', '=', id)
    .executeTakeFirst()

  return (result.numDeletedRows ?? 0n) > 0n
}
