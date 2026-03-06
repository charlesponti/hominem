import postgres from 'postgres'

const url = process.env.DATABASE_URL
if (!url) {
  console.log('DATABASE_URL_MISSING')
  process.exit(0)
}

const sql = postgres(url, { prepare: false })
const rows = await sql`select identifier, value, expires_at, created_at from user_verification order by created_at desc limit 10`
console.log(JSON.stringify(rows, null, 2))
await sql.end()
