import type { users } from '@hominem/db/all-schema';
import type { Queues } from '@hominem/services/types';

import type { AuthContextEnvelope } from '../auth/types';

declare module 'hono' {
  type User = typeof users.$inferSelect;

  interface ContextVariableMap {
    user?: User;
    userId?: string | null;
    auth?: AuthContextEnvelope;
    queues: Queues;
  }
}
