import type { User } from '@hominem/data/schema'
import type { Queues } from '@hominem/data/types'

declare module 'hono' {
  interface ContextVariableMap {
    user?: User
    userId?: string | null
    supabaseId: string
    queues: Queues
  }
}
