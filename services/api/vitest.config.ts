import 'dotenv/config';
import { defineConfig } from 'vitest/config';

import { TEST_DATABASE_URL } from '@hominem/db/test/database-url';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    env: {
      AUTH_E2E_SECRET: 'otp-secret',
      BETTER_AUTH_SECRET: 'ci-test-better-auth-secret',
      DATABASE_URL: TEST_DATABASE_URL,
      NODE_ENV: 'test',
      OPENROUTER_API_KEY: 'some-random-key',
      REDIS_URL: 'redis://localhost:6379',
      RESEND_API_KEY: 'some-resend-api-key',
      RESEND_FROM_EMAIL: 'test@example.com',
      RESEND_FROM_NAME: 'Test Sender',
    },
  },
});
