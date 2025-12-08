import type { AuthAppMetadata, AuthUserMetadata, HominemUser, SupabaseAuthUser } from './types'

/**
 * Minimal database user shape required to construct a HominemUser.
 * Other modules can use this without depending on the database layer directly.
 */
export type DbUserLike = {
  id: string
  email: string
  name?: string | null
  image?: string | null
  photoUrl?: string | null
  supabaseId: string
  isAdmin?: boolean | null
  createdAt: string
  updatedAt: string
}

function extractName(userMetadata: AuthUserMetadata): string | undefined {
  return (
    userMetadata.name ||
    userMetadata.full_name ||
    userMetadata.display_name ||
    [userMetadata.first_name, userMetadata.last_name].filter(Boolean).join(' ').trim() ||
    undefined
  )
}

function extractImage(userMetadata: AuthUserMetadata): string | undefined {
  return userMetadata.avatar_url || userMetadata.picture || userMetadata.image
}

function extractIsAdmin(
  userMetadata: AuthUserMetadata,
  appMetadata: AuthAppMetadata | undefined
): boolean {
  return Boolean(
    userMetadata.isAdmin || userMetadata.is_admin || appMetadata?.isAdmin || appMetadata?.is_admin
  )
}

/**
 * Convert a Supabase user to the canonical HominemUser shape.
 * This is a pure client-side mapping (no database lookup).
 */
export function createHominemUserFromSupabase(supabaseUser: SupabaseAuthUser): HominemUser {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: extractName(supabaseUser.user_metadata),
    image: extractImage(supabaseUser.user_metadata),
    supabaseId: supabaseUser.id,
    isAdmin: extractIsAdmin(supabaseUser.user_metadata, supabaseUser.app_metadata),
    createdAt: supabaseUser.created_at || new Date().toISOString(),
    updatedAt: supabaseUser.updated_at || supabaseUser.created_at || new Date().toISOString(),
  }
}

/**
 * Convert a database user row to the canonical HominemUser shape.
 */
export function createHominemUserFromDb(user: DbUserLike): HominemUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name || undefined,
    image: user.image || user.photoUrl || undefined,
    supabaseId: user.supabaseId,
    isAdmin: Boolean(user.isAdmin),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}
