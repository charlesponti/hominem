import type { ApiEnv } from '@hominem/env';

import { env } from '../env';

export function createTestEnv(overrides: Partial<ApiEnv> = {}): ApiEnv {
  return {
    ...env,
    NODE_ENV: 'test',
    HOMINEM_EMAIL_PROVIDER: 'scripted',
    ...overrides,
  };
}
