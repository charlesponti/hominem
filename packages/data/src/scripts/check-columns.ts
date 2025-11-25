import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema'

const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client, { schema })

async function main() {
  try {
    console.log('Checking columns in users table...')
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `)
    console.log(
      'Columns:',
      result.map((r) => r.column_name)
    )
  } catch (error) {
    console.error('Error checking columns:', error)
  } finally {
    await client.end()
  }
}

main()
