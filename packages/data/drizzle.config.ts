import 'dotenv/config'
import assert from 'node:assert'
import { defineConfig } from 'drizzle-kit'

const DATABASE_URL =
  process.env.NODE_ENV === 'test'
    ? 'postgres://postgres:postgres@localhost:4433/hominem-test'
    : process.env.DATABASE_URL

assert(DATABASE_URL, 'Missing DATABASE_URL')

console.log('Using DATABASE_URL:', DATABASE_URL)
export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: DATABASE_URL,
  },
})
