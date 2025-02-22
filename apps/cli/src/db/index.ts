import { drizzle } from 'drizzle-orm/libsql/node'
import assert from 'node:assert'

const { DATABASE_URL } = process.env

assert(DATABASE_URL, 'Missing DATABASE_URL')

export const db = drizzle(DATABASE_URL)
