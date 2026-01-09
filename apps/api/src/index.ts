import '@total-typescript/ts-reset'
import 'dotenv/config'

import { initSupabaseAdmin } from '@hominem/utils/supabase'
import { env } from './lib/env.js'
import { startServer } from './server.js'

// Initialize Supabase admin client from environment for this process
initSupabaseAdmin({
  supabaseUrl: env.SUPABASE_URL,
  supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
})

startServer().catch((error) => {
  console.error(error)
  process.exit(1)
})
