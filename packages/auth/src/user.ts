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
type HominemUserSource = SupabaseAuthUser | DbUserLike

function isSupabaseUser(source: HominemUserSource): source is SupabaseAuthUser {
  return 'user_metadata' in source && 'app_metadata' in source
}

/**
 * Single entry point for building a HominemUser from either Supabase auth data
 * (no DB required) or a database row shape. Source-specific helpers below call this.
 */
export function toHominemUser(source: HominemUserSource): HominemUser {
  if (isSupabaseUser(source)) {
    return {
      id: source.id,
      email: source.email || '',
      name: extractName(source.user_metadata),
      image: extractImage(source.user_metadata),
      supabaseId: source.id,
      isAdmin: extractIsAdmin(source.user_metadata, source.app_metadata),
      createdAt: source.created_at || new Date().toISOString(),
      updatedAt: source.updated_at || source.created_at || new Date().toISOString(),
    }
  }

  return {
    id: source.id,
    email: source.email,
    name: source.name || undefined,
    image: source.image || source.photoUrl || undefined,
    supabaseId: source.supabaseId,
    isAdmin: Boolean(source.isAdmin),
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  }
}

/**
 * Convert a Supabase user to the canonical HominemUser shape.
 * Thin wrapper around toHominemUser for backwards compatibility.
 */
export function createHominemUserFromSupabase(supabaseUser: SupabaseAuthUser): HominemUser {
  return toHominemUser(supabaseUser)
}
