import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const DATABASE_URL =
  process.env.NODE_ENV === 'test'
    ? 'postgres://postgres:postgres@localhost:4433/hominem-test'
    : process.env.DATABASE_URL

let client: ReturnType<typeof postgres> | null = null
let db: PostgresJsDatabase<typeof schema> | null = null

// Lazy initialization - only connect when db is actually accessed
function getDb(): PostgresJsDatabase<typeof schema> {
  if (!db) {
    if (!DATABASE_URL) {
      throw new Error(
        'DATABASE_URL not provided. Set DATABASE_URL environment variable or NODE_ENV=test for test database.'
      )
    }
    client = postgres(DATABASE_URL)
    db = drizzle(client, { schema })
  }
  return db
}

// Create a Proxy to intercept db access and initialize lazily
const dbProxy = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    const actualDb = getDb()
    const value = actualDb[prop as keyof typeof actualDb]
    return typeof value === 'function' ? value.bind(actualDb) : value
  },
})

export { client, dbProxy as db }

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
