import * as schema from '@hominem/utils/schema'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from './env.server'

const client = postgres(env.DATABASE_URL)
export const db: PostgresJsDatabase<typeof schema> = drizzle(client, { schema })

export { client }
