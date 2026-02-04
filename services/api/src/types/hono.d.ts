import type { User } from '@hominem/db/types/users';
import type { Queues } from '@hominem/services/types';

declare module 'hono' {
  interface ContextVariableMap {
    user?: User;
    userId?: string | null;
    supabaseId: string;
    queues: Queues;
  }
}
