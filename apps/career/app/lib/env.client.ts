import { createClientEnv } from '@hominem/env';

import { careerClientSchema } from './env.schema';

let cachedEnv: ReturnType<typeof createClientEnv<typeof careerClientSchema>> | null = null;

export function getClientEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = createClientEnv(careerClientSchema, 'careerClient');
  return cachedEnv;
}
