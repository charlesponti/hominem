import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'
import assert from 'node:assert'

const { DATABASE_URL } = process.env

assert(DATABASE_URL, 'Missing DATABASE_URL')

export default defineConfig({
  out: './src/db/migrations',
  schema: './src/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: DATABASE_URL,
  },
})
