import { createClientEnv } from '@hominem/env';
import { financeClientSchema } from './env.schema';

let cachedEnv: ReturnType<typeof createClientEnv<typeof financeClientSchema>> | null = null;

export function getClientEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = createClientEnv(financeClientSchema, 'financeClient');
  return cachedEnv;
}
