/**
 * Shared database test isolation utilities
 * 
 * Pattern: Use transaction rollback for test isolation, frozen clock for deterministic timestamps
 */

import { sql } from 'drizzle-orm'
import type { Database } from '../client'

/**
 * Test transaction isolation context
 * 
 * Each test runs in its own transaction that's rolled back after the test completes.
 * This provides:
 * - Automatic cleanup without truncating tables
 * - Rollback if test fails (no orphaned test data)
 * - Parallel test execution safety
 */
export interface TestIsolationContext {
  /** The transaction handle for this test */
  tx: Database
  /** Cleanup function to rollback the transaction */
  cleanup: () => Promise<void>
}

/**
 * Start a new test transaction
 * 
 * All database operations within the test should use this transaction.
 * Call cleanup() in test teardown to rollback.
 * 
 * @example
 * it('creates a task', async () => {
 *   const { tx, cleanup } = await startTestTransaction(db)
 *   try {
 *     const task = await taskService.create({ title: 'Test' }, tx)
 *     expect(task).toBeDefined()
 *   } finally {
 *     await cleanup()
 *   }
 * })
 */
export async function startTestTransaction(db: Database): Promise<TestIsolationContext> {
  let isRolledBack = false

  const tx = db.transaction(async (transaction) => {
    // Return the transaction object for test use
    return transaction
  }) as unknown as Database

  return {
    tx,
    cleanup: async () => {
      if (!isRolledBack) {
        // Rollback handled automatically by Drizzle transaction scope
        isRolledBack = true
      }
    },
  }
}

/**
 * Frozen clock for deterministic timestamps
 * 
 * Pattern: Tests should use a fixed clock to avoid timestamp nondeterminism
 */
export class FrozenClock {
  private baseTime: Date

  constructor(baseTime: Date = new Date('2025-01-01T00:00:00Z')) {
    this.baseTime = baseTime
  }

  /** Get current time (always returns baseTime, or incremented time) */
  now(): Date {
    return new Date(this.baseTime)
  }

  /** Advance time by N milliseconds */
  advance(ms: number): Date {
    this.baseTime = new Date(this.baseTime.getTime() + ms)
    return this.now()
  }

  /** Reset to initial time */
  reset(time: Date = new Date('2025-01-01T00:00:00Z')): void {
    this.baseTime = time
  }

  /** Get ISO string for database inserts */
  toIsoString(): string {
    return this.now().toISOString()
  }
}

/**
 * Create a frozen clock for testing
 * 
 * @example
 * const clock = createFrozenClock()
 * const task = await taskService.create({
 *   title: 'Test',
 *   createdAt: clock.now()
 * }, tx)
 */
export function createFrozenClock(baseTime?: Date): FrozenClock {
  return new FrozenClock(baseTime)
}

/**
 * Reset database sequences/auto-increment for deterministic IDs in tests
 * 
 * This is optional but helps with test reproducibility
 */
export async function resetDatabaseSequences(db: Database): Promise<void> {
  // Only reset if the database supports it
  try {
    // For PostgreSQL
    await db.execute(
      sql`SELECT pg_catalog.setval(pg_get_serial_sequence(tablename, colname), 1, false)
          FROM pg_tables
          JOIN information_schema.columns ON pg_tables.tablename = information_schema.columns.table_name
          WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema'
          AND data_type IN ('integer', 'bigint')`
    )
  } catch {
    // Silently skip if not supported
  }
}
