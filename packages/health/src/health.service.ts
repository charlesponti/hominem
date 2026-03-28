/**
 * Health record persistence was removed during the database schema redesign.
 *
 * The API routes and other packages still import these functions, but there is
 * no longer a `health_records` table in `@hominem/db`.
 */

export interface HealthRecordRow {
  id: string;
  user_id: string;
  record_type: string;
  recorded_at: Date | string;
  value: string;
  unit: string | null;
  source: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string | null;
}

export interface ListHealthRecordsInput {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  activityType?: string;
}

export interface CreateHealthRecordInput {
  user_id: string;
  record_type: string;
  recorded_at: Date;
  value: string;
  unit: string;
  source: string | null;
  metadata: Record<string, unknown> | null;
}

export interface UpdateHealthRecordInput {
  recorded_at?: Date;
  record_type?: string;
  value?: string;
  unit?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown> | null;
  updated_at?: Date | string | null;
}

export async function listHealthRecords(
  _input?: ListHealthRecordsInput,
): Promise<HealthRecordRow[]> {
  return [];
}

export async function getHealthRecord(_id: string): Promise<HealthRecordRow | null> {
  return null;
}

export async function createHealthRecord(
  _input: CreateHealthRecordInput,
): Promise<HealthRecordRow | null> {
  return null;
}

export async function updateHealthRecord(
  _id: string,
  _input: UpdateHealthRecordInput,
): Promise<HealthRecordRow | null> {
  return null;
}

export async function deleteHealthRecord(_id: string): Promise<boolean> {
  return false;
}
