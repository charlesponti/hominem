import type { UserSelect } from '@hominem/db/types/users'
import type { HominemUser } from './types'

/**
 * Build canonical HominemUser from database user row.
 */
export function toHominemUser(source: UserSelect): HominemUser {
  return {
    id: source.id,
    email: source.email,
    name: source.name || undefined,
    image: source.image || source.photoUrl || undefined,
    isAdmin: Boolean(source.isAdmin),
    createdAt: source.createdAt.toString(),
    updatedAt: source.updatedAt.toString(),
  }
}
