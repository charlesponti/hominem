import type { User } from './types'
import type { UserRow } from './contracts'

export function toUser(source: UserRow): User {
  return {
    id: source.id,
    email: source.email,
    name: source.name ?? undefined,
    image: source.image ?? undefined,
    createdAt: source.createdAt instanceof Date ? source.createdAt.toISOString() : String(source.createdAt),
    updatedAt: source.updatedAt instanceof Date ? source.updatedAt.toISOString() : String(source.updatedAt),
  }
}
