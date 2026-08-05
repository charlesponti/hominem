import 'dotenv/config';
import { defineConfig } from 'vitest/config';

const testDatabaseUrl = 'postgresql://postgres:postgres@127.0.0.1:5434/app-test';

export default defineConfig({
  test: {
    env: {
      AUTH_E2E_SECRET: 'otp-secret',
      BETTER_AUTH_SECRET: 'ci-test-better-auth-secret',
      DATABASE_URL: testDatabaseUrl,
      NODE_ENV: 'test',
      OPENROUTER_API_KEY: 'some-random-key',
      REDIS_URL: 'redis://localhost:6379',
      RESEND_API_KEY: 'some-resend-api-key',
      RESEND_FROM_EMAIL: 'test@example.com',
      RESEND_FROM_NAME: 'Test Sender',
    },
  },
});
