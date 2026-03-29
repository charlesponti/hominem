import type { User } from './types'
import type { UserRow } from './contracts'

export function toUser(source: UserRow): User {
  return {
    id: source.id,
    email: source.email,
    name: source.name ?? undefined,
    image: source.avatar_url ?? undefined,
    createdAt: source.createdat.toISOString(),
    updatedAt: source.updatedat.toISOString(),
  }
}
