import type { ApiEnv } from '@hominem/env';

import { env } from '../env';

export function createTestEnv(overrides: Partial<ApiEnv> = {}): ApiEnv {
  return {
    ...env,
    NODE_ENV: 'test',
    AUTH_E2E_ENABLED: true,
    AUTH_E2E_SECRET: 'otp-secret',
    HOMINEM_EMAIL_PROVIDER: 'scripted',
    ...overrides,
  };
}
