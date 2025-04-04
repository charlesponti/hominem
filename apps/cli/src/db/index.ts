import { logger } from '@/logger'
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

  // Create database connection
  db = drizzle(`file:${DB_PATH}`, { schema })
  logger.info('Database connection created successfully!')
  return db
}
