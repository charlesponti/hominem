import type { User } from './types'
import type { UserSelect } from './contracts'

export function toUser(source: UserSelect): User {
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
