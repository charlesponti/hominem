import Database from 'bun:sqlite'
import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import * as schema from './schema'

import assert from 'node:assert'

const { DATABASE_URL } = Bun.env

assert(DATABASE_URL, 'Missing DATABASE_URL')

const sqlite = new Database(DATABASE_URL)
export const db: BunSQLiteDatabase<typeof schema> = drizzle({ client: sqlite, schema })
