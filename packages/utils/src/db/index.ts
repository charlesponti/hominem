import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { logger } from '../logger'
import * as schema from './schema'

const DATABASE_URL =
  process.env.NODE_ENV === 'test'
    ? 'postgres://postgres:postgres@localhost:4433/hominem-test'
    : process.env.DATABASE_URL

let db: PostgresJsDatabase<typeof schema>

if (DATABASE_URL) {
  const client = postgres(DATABASE_URL)
  db = drizzle(client, { schema })
} else {
  logger.warn(
    'DATABASE_URL not provided. Using in-memory mock implementation. Some features may be limited.'
  )
}

export { db }

export const takeOne = <T>(values: T[]): T | undefined => {
  return values[0]
}

export const takeUniqueOrThrow = <T>(values: T[]): T => {
  if (values.length === 0) {
    throw new Error('No value found')
  }
  if (values.length > 1) {
    throw new Error('Found multiple values')
  }
  if (!values[0]) {
    throw new Error('Value is undefined')
  }
  return values[0]
}
