import * as sharded from '@hominem/auth/server'
import { env } from './env'

export const authConfig = {
  supabaseUrl: env.VITE_SUPABASE_URL,
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY,
}

export const getServerSession = (request: Request) =>
  sharded.getServerSession(request, authConfig)

export const getAuthState = (request: Request) =>
  sharded.getAuthState(request, authConfig)
export const getServerAuth = (request: Request) =>
  sharded.getServerAuth(request, authConfig)

export const createSupabaseServerClient = (request: Request) =>
  sharded.createSupabaseServerClient(request, authConfig)

