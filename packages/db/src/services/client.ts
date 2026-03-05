import { getDb as getRootDb } from '../client'
import type { Database as RootDatabase } from '../client'

export type Database = RootDatabase

export function getDb(): Database {
  return getRootDb()
}
