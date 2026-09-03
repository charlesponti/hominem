import { createClientEnv } from '@hominem/env';
import { financeClientSchema } from '@hominem/env/finance';

let cachedEnv: ReturnType<typeof createClientEnv<typeof financeClientSchema>> | null = null;

export function getClientEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = createClientEnv(financeClientSchema, 'financeClient');
  return cachedEnv;
}
