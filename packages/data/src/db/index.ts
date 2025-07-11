import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const DATABASE_URL =
  process.env.NODE_ENV === 'test'
    ? 'postgres://postgres:postgres@localhost:4433/hominem-test'
    : process.env.DATABASE_URL

let client: ReturnType<typeof postgres> | null = null
let db: PostgresJsDatabase<typeof schema>

if (DATABASE_URL) {
  client = postgres(DATABASE_URL)
  db = drizzle(client, { schema })
} else {
  console.warn('DATABASE_URL not provided.')
}

export { client, db }

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
