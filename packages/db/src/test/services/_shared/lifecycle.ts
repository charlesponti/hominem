import { db, sql } from '../../../index'
import { startTestTransaction, type TestTransaction } from '../../db-transaction'

function validateIdentifier(identifier: string): void {
  const valid = /^[a-z_][a-z0-9_]*$/i.test(identifier)
  if (!valid) {
    throw new Error(`invalid SQL identifier: ${identifier}`)
  }
}

export async function truncateTables(tableNames: readonly string[]): Promise<void> {
  if (tableNames.length === 0) {
    return
  }

  const validated = tableNames.map((tableName) => {
    validateIdentifier(tableName)
    return `"${tableName}"`
  })

  await db.execute(sql.raw(`truncate table ${validated.join(', ')} restart identity cascade`))
}

export interface IsolatedTransactionHarness {
  db: TestTransaction['db']
  rollback: () => Promise<void>
  commit: () => Promise<void>
}

export async function startIsolatedTransactionHarness(): Promise<IsolatedTransactionHarness> {
  const tx = await startTestTransaction()
  return {
    db: tx.db,
    rollback: tx.rollback,
    commit: tx.commit,
  }
}

export async function withIsolatedTransaction<T>(
  run: (harness: IsolatedTransactionHarness) => Promise<T>,
): Promise<T> {
  const harness = await startIsolatedTransactionHarness()
  try {
    const result = await run(harness)
    await harness.rollback()
    return result
  } catch (error) {
    await harness.rollback()
    throw error
  }
}
