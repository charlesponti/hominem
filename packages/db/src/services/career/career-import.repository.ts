import { sql } from '../../db';
import type { DbHandle } from '../../transaction';

export type CareerImportStatus =
  | 'queued'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'dismissed'
  | 'resolved';
export type CareerImportStage =
  | 'queued'
  | 'validating-url'
  | 'fetching-posting'
  | 'extracting-fields'
  | 'validating-result'
  | 'draft-ready';

export interface CareerImportRecord {
  id: string;
  ownerUserId: string;
  sourceUrl: string;
  sourceHost: string;
  queueJobId: string;
  status: CareerImportStatus;
  stage: CareerImportStage;
  progress: number;
  draft: unknown;
  errorCode: string | null;
  errorMessage: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  resolvedAt: string | null;
}

type CareerImportRow = {
  id: string;
  owner_userid: string;
  source_url: string;
  source_host: string;
  queue_job_id: string;
  status: CareerImportStatus;
  stage: CareerImportStage;
  progress: number;
  draft: unknown;
  error_code: string | null;
  error_message: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  resolved_at: string | null;
};

function toRecord(row: CareerImportRow): CareerImportRecord {
  return {
    id: row.id,
    ownerUserId: row.owner_userid,
    sourceUrl: row.source_url,
    sourceHost: row.source_host,
    queueJobId: row.queue_job_id,
    status: row.status,
    stage: row.stage,
    progress: row.progress,
    draft: row.draft,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    attempts: row.attempts,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    resolvedAt: row.resolved_at,
  };
}

const columns = sql`
  id, owner_userid, source_url, source_host, queue_job_id, status, stage,
  progress, draft, error_code, error_message, attempts, created_at,
  updated_at, completed_at, resolved_at
`;

export const CareerImportRepository = {
  async create(
    handle: DbHandle,
    input: { ownerUserId: string; sourceUrl: string; sourceHost: string; queueJobId: string },
  ): Promise<CareerImportRecord> {
    const result = await sql<CareerImportRow>`
      INSERT INTO app.career_import_jobs
        (owner_userid, source_url, source_host, queue_job_id)
      VALUES
        (${input.ownerUserId}, ${input.sourceUrl}, ${input.sourceHost}, ${input.queueJobId})
      RETURNING ${columns}
    `.execute(handle);
    return toRecord(result.rows[0]);
  },

  async getById(
    handle: DbHandle,
    ownerUserId: string,
    id: string,
  ): Promise<CareerImportRecord | null> {
    const result = await sql<CareerImportRow>`
      SELECT ${columns}
      FROM app.career_import_jobs
      WHERE id = ${id} AND owner_userid = ${ownerUserId}
    `.execute(handle);
    return result.rows[0] ? toRecord(result.rows[0]) : null;
  },

  async getByQueueJobId(
    handle: DbHandle,
    ownerUserId: string,
    queueJobId: string,
  ): Promise<CareerImportRecord | null> {
    const result = await sql<CareerImportRow>`
      SELECT ${columns}
      FROM app.career_import_jobs
      WHERE queue_job_id = ${queueJobId} AND owner_userid = ${ownerUserId}
    `.execute(handle);
    return result.rows[0] ? toRecord(result.rows[0]) : null;
  },

  async listOpen(handle: DbHandle, ownerUserId: string): Promise<CareerImportRecord[]> {
    const result = await sql<CareerImportRow>`
      SELECT ${columns}
      FROM app.career_import_jobs
      WHERE owner_userid = ${ownerUserId}
        AND status NOT IN ('dismissed', 'resolved')
      ORDER BY updated_at DESC
      LIMIT 50
    `.execute(handle);
    return result.rows.map(toRecord);
  },

  async update(
    handle: DbHandle,
    id: string,
    patch: {
      status?: CareerImportStatus;
      stage?: CareerImportStage;
      progress?: number;
      draft?: unknown;
      errorCode?: string | null;
      errorMessage?: string | null;
      attempts?: number;
      completedAt?: string | null;
      resolvedAt?: string | null;
    },
  ): Promise<CareerImportRecord | null> {
    const result = await sql<CareerImportRow>`
      UPDATE app.career_import_jobs
      SET
        status = COALESCE(${patch.status ?? null}, status),
        stage = COALESCE(${patch.stage ?? null}, stage),
        progress = COALESCE(${patch.progress ?? null}, progress),
        draft = COALESCE(${patch.draft === undefined ? null : JSON.stringify(patch.draft)}, draft),
        error_code = CASE WHEN ${patch.errorCode === undefined} THEN error_code ELSE ${patch.errorCode ?? null} END,
        error_message = CASE WHEN ${patch.errorMessage === undefined} THEN error_message ELSE ${patch.errorMessage ?? null} END,
        attempts = COALESCE(${patch.attempts ?? null}, attempts),
        completed_at = CASE WHEN ${patch.completedAt === undefined} THEN completed_at ELSE ${patch.completedAt ?? null} END,
        resolved_at = CASE WHEN ${patch.resolvedAt === undefined} THEN resolved_at ELSE ${patch.resolvedAt ?? null} END,
        updated_at = now()
      WHERE id = ${id}
      RETURNING ${columns}
    `.execute(handle);
    return result.rows[0] ? toRecord(result.rows[0]) : null;
  },
};
