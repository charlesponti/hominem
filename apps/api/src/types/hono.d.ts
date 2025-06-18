import type { User } from '@hominem/utils/schema'
import type { Queue } from 'bullmq'

declare module 'hono' {
  interface ContextVariableMap {
    user?: User
    userId?: string | null
    supabaseId?: string | null
    queues: {
      plaidSync: Queue
      importTransactions: Queue
    }
  }
}
