import { createServerEnv } from '@hominem/env';

import { financeSchema } from './env.schema';

export const serverEnv = createServerEnv(financeSchema, 'financeServer');
