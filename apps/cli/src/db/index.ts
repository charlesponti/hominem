import { consola } from 'consola'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'
import fs from 'node:fs'
import path from 'node:path'
import { env } from '../env'
import * as schema from './schema'

const { DB_PATH } = env
export let db: LibSQLDatabase<typeof schema>

export async function initDb() {
  // Check if database file exists
  if (!fs.existsSync(DB_PATH) && process.argv[2] !== 'init') {
    consola.error(`Database file does not exist at ${DB_PATH}`)
    consola.error(`Please run 'hominem init' to set up your environment.`)
    process.exit(1)
  }

  // Check if database directory exists, create it if not
  const dbDir = path.dirname(DB_PATH)
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true })
      consola.info(`Database directory created at ${dbDir}`)
    } catch (error) {
      consola.error(`Failed to create database directory at ${dbDir}:`, error)
      throw error
    }
  }

  // Create database connection
  try {
    db = drizzle(`file:${DB_PATH}`, { schema })
    consola.info('Database connection established')
    return db
  } catch (error) {
    consola.error('Failed to connect to the database:', error)
    process.exit(1)
  }
}
