import { afterAll, afterEach, beforeEach } from 'vitest'
import { client } from './src/db'
import { startTestTransaction, type TestTransaction } from './src/test-utils/db-transaction'

process.env.NODE_ENV = 'test'

let activeTransaction: TestTransaction | null = null

beforeEach(async () => {
  activeTransaction = await startTestTransaction()
})

afterEach(async () => {
  if (activeTransaction) {
    await activeTransaction.rollback()
    activeTransaction = null
  }
})

// Close the shared Postgres client if it was opened during tests.
afterAll(async () => {
  try {
    await client?.end?.()
  } catch {
    // ignore client shutdown errors in test environment
  }
})
