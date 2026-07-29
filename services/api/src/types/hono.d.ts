import type { User } from '@ponti-studios/auth/types';
import type { Queue } from 'bullmq';

import type { AuthContext } from '../auth/types';

declare module 'hono' {
  interface ContextVariableMap {
    auth?: AuthContext;
    queues: {
      importTransactions: Queue;
      placePhotoEnrich: Queue;
    };
  }
}
