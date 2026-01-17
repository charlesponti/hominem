import type { User } from '@hominem/db/schema'
import type { Queues } from '@hominem/services/types'

declare module 'hono' {
  interface ContextVariableMap {
    user?: User
    userId?: string | null
    supabaseId: string
    queues: Queues
  }
}
