import { createServerEnv } from '@hominem/env';
import { financeSchema } from '@hominem/env/finance';

export const serverEnv = createServerEnv(financeSchema, 'financeServer');
