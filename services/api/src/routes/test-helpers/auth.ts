import { vi } from 'vitest';

/**
 * Dynamically imports createServer with the given environment variables mocked.
 * Merges overrides onto the real env so Better Auth still has baseURL, secrets, etc.
 * Returns a factory that produces a fresh app instance per call.
 */
export async function importServerWithEnv(envOverrides: Record<string, string>) {
  vi.resetModules();
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:4433/hominem-test';
  process.env.BETTER_AUTH_SECRET = 'ci-test-better-auth-secret-32-characters';
  process.env.OPENROUTER_API_KEY = 'some-random-key';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.RESEND_API_KEY = 'some-resend-api-key';
  process.env.RESEND_FROM_EMAIL = 'test@example.com';
  process.env.RESEND_FROM_NAME = 'Test Sender';
  vi.doMock('../../env', async () => {
    const actual = await vi.importActual<typeof import('../../env')>('../../env');
    return {
      env: {
        ...actual.env,
        ...envOverrides,
      },
    };
  });

  const { createServer } = await import('../../server');
  return createServer;
}
