import { env } from '../env';
import type { ApiEnv } from '../env.schema';

export function createTestEnv(overrides: Partial<ApiEnv> = {}): ApiEnv {
  return {
    ...env,
    NODE_ENV: 'test',
    ENV: 'scripted',
    ...overrides,
  };
}
