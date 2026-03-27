/**
 * Health record persistence was removed during the database schema redesign.
 *
 * The API routes and other packages still import these functions, but there is
 * no longer a `health_records` table in `@hominem/db`.
 */

export type HealthRecordRow = never;

export async function listHealthRecords(): Promise<HealthRecordRow[]> {
  return [];
}

export async function getHealthRecord(): Promise<HealthRecordRow | null> {
  return null;
}

export async function createHealthRecord(): Promise<HealthRecordRow> {
  throw new Error('Health record persistence is not available');
}

export async function updateHealthRecord(): Promise<HealthRecordRow | null> {
  return null;
}

export async function deleteHealthRecord(): Promise<boolean> {
  return false;
}
