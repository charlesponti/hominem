import { sql } from 'drizzle-orm'
import { db } from '../db'

let warnedUnavailable = false

/**
 * Truncates all public tables in the test database (except migration metadata).
 * Safe to call between tests to keep isolation; no-op with a warning if the DB
 * is unavailable (e.g., local tests without postgres running).
 */
export async function resetTestDb(): Promise<void> {
  try {
    await db.execute(sql`
      DO $$
      DECLARE r record;
      BEGIN
        FOR r IN (
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename NOT IN ('_prisma_migrations', '__drizzle_migrations', 'drizzle_migrations')
        ) LOOP
          EXECUTE format('TRUNCATE TABLE %I CASCADE', r.tablename);
        END LOOP;
      END $$;
    `)
  } catch (error) {
    if (!warnedUnavailable) {
      console.warn(
        'Test DB reset skipped: database unavailable or reset failed.',
        error instanceof Error ? error.message : String(error)
      )
      warnedUnavailable = true
    }
  }
}
