import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { logger } from '../logger'
import postgres from 'postgres'
import * as schema from './schema'

const DATABASE_URL =
  process.env.NODE_ENV === 'test'
    ? 'postgres://postgres:postgres@localhost:4433/hominem-test'
    : process.env.DATABASE_URL

// Create a mock DB client if DATABASE_URL is not provided
class MockDB {
  async select() { 
    return this 
  }
  async from() { 
    return this 
  }
  async where() { 
    return [] 
  }
  async orderBy() { 
    return []
  }
  async limit() {
    return []
  }
  async insert() { 
    return { 
      values: () => ({
        returning: () => [{ id: 'mock-id' }]
      })
    }
  }
  async update() {
    return {
      set: () => ({
        where: () => ({
          returning: () => []
        })
      })
    }
  }
  async delete() {
    return {
      where: () => ({ count: 0 })
    }
  }
}

let client: any
let db: any

// Only create a real DB connection if DATABASE_URL is available
if (DATABASE_URL) {
  client = postgres(DATABASE_URL)
  db = drizzle(client, { schema })
} else {
  logger.warn('DATABASE_URL not provided. Using in-memory mock implementation. Some features may be limited.')
  db = new MockDB()
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
