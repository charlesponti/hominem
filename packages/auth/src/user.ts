import type { HominemUser } from './types'

export interface UserSelect {
  id: string
  email: string
  name: string | null
  image: string | null
  is_admin: boolean | null
  created_at: string | null
  updated_at: string | null
}

export function toHominemUser(source: UserSelect): HominemUser {
  return {
    id: source.id,
    email: source.email,
    name: source.name || undefined,
    image: source.image || undefined,
    isAdmin: Boolean(source.is_admin),
    createdAt: source.created_at ?? '',
    updatedAt: source.updated_at ?? '',
  }
}
