import * as Linking from 'expo-linking'
import * as SecureStore from 'expo-secure-store'
import { makeRedirectUri } from 'expo-auth-session'
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

import { SUPABASE_ANON_KEY, SUPABASE_URL } from './constants'

const SECURE_STORE_PREFIX = 'hominem.auth.'

const secureStoreAdapter = {
  getItem: async (key: string) => {
    return SecureStore.getItemAsync(`${SECURE_STORE_PREFIX}${key}`)
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(`${SECURE_STORE_PREFIX}${key}`, value)
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(`${SECURE_STORE_PREFIX}${key}`)
  },
}

let supabaseClient: SupabaseClient | null = null

export function getSupabaseMobileClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  if (!(SUPABASE_URL && SUPABASE_ANON_KEY)) {
    throw new Error('Missing Supabase configuration in mobile environment')
  }

  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: secureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  })

  return supabaseClient
}

export function getMobileRedirectUri() {
  return makeRedirectUri({
    scheme: 'mindsherpa',
    path: 'auth/callback',
  })
}

export async function exchangeAuthCodeFromUrl(url: string): Promise<Session | null> {
  const supabase = getSupabaseMobileClient()
  const parsed = Linking.parse(url)
  const queryParams = parsed.queryParams ?? {}

  const code = typeof queryParams.code === 'string' ? queryParams.code : null
  if (!code) {
    return null
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    throw error
  }

  return data.session
}
