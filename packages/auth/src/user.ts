import type { User } from './types'
import type { UserSelect } from './contracts'

export function toUser(source: UserSelect): User {
  return {
    id: source.id,
    email: source.email,
    name: source.name || undefined,
    image: source.image || undefined,
    isAdmin: Boolean(source.isAdmin),
    createdAt: source.createdAt ?? '',
    updatedAt: source.updatedAt ?? '',
  }
}
