import { logger } from '@ponti/utils/logger'
import Database from 'bun:sqlite'
import { drizzle, type BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { env } from '../env'
import * as schema from './schema'

const { DB_PATH } = env
export let sqlite: Database
export let db: BunSQLiteDatabase<typeof schema>

export function initDb() {
  // Check if database file exists
  if (!fs.existsSync(DB_PATH) && process.argv[2] !== 'init') {
    logger.error(`Database file does not exist at ${DB_PATH}`)
    logger.error(`Please run 'hominem init' to set up your environment.`)
    process.exit(1)
  }

  // Check if database directory exists, create it if not
  const dbDir = path.dirname(DB_PATH)
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true })
      logger.info(`Database directory created at ${dbDir}`)
    } catch (error) {
      logger.error(`Failed to create database directory at ${dbDir}:`, error)
      throw error
    }
  }

  logger.info('Creating database connection...')
  // Create database connection
  sqlite = new Database(DB_PATH)
  db = drizzle({ client: sqlite, schema })
  return db
}

// Initialize immediately
try {
  initDb()
} catch (err) {
  logger.error('Failed to initialize database:', err)
  process.exit(1)
}
