import type { User } from '@hominem/db/types/users';
import type { Queues } from '@hominem/services';
import type { AuthContextEnvelope } from '../auth/types';

declare module 'hono' {
  interface ContextVariableMap {
    user?: User;
    userId?: string | null;
    auth?: AuthContextEnvelope;
    queues: Queues;
  }
}
