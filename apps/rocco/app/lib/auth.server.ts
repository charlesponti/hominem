import {
  createSupabaseServerClient as sharedCreateSupabaseServerClient,
  getAuthState as sharedGetAuthState,
  getServerAuth as sharedGetServerAuth,
  getServerSession as sharedGetServerSession,
} from '@hominem/auth/server'
import { env } from './env'

export const authConfig = {
  supabaseUrl: env.VITE_SUPABASE_URL,
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY,
}

export const getServerSession = (request: Request) =>
  sharedGetServerSession(request, authConfig)

export const getAuthState = (request: Request) =>
  sharedGetAuthState(request, authConfig)

export const getServerAuth = (request: Request) =>
  sharedGetServerAuth(request, authConfig)

export const createSupabaseServerClient = (request: Request) =>
  sharedCreateSupabaseServerClient(request, authConfig)
