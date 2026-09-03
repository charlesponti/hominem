import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const reuseExistingServer = process.env.REUSE_SERVERS === 'true';
const apiBaseUrl = 'http://localhost:4040';
const careerBaseUrl = 'http://localhost:4451';
const authStorageState = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'tests/.auth/career-user.json',
);

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  workers: 1,
  retries: 1,
  globalSetup: './tests/global-setup.ts',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: careerBaseUrl,
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'app',
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
      use: { storageState: authStorageState },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @hominem/api dev:app',
      cwd: workspaceRoot,
      url: `${apiBaseUrl}/`,
      reuseExistingServer,
      timeout: 120_000,
      env: {
        NODE_ENV: 'test',
        PORT: '4040',
        API_URL: apiBaseUrl,
        // career and the API both run on plain "localhost" here (different
        // ports, same host), so a host-only cookie already reaches both —
        // no Domain attribute needed. Setting one to "lvh.me" would be
        // invalid for a response coming from "localhost" (RFC 6265
        // domain-match failure) and the browser would silently drop the
        // session cookie, breaking sign-in with no visible error.
        AUTH_COOKIE_DOMAIN: '',
        CAREER_URL: careerBaseUrl,
        NOTES_URL: 'http://notes.lvh.me:4445',
        ROCCO_URL: 'http://rocco.lvh.me:4446',
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:4433/hominem-test',
        // Must match vitest.config.ts / test-helpers/auth.ts's secret: this
        // webServer and `pnpm test` both point at the same persistent local
        // Postgres `hominem-test` database, and Better Auth's JWKS private
        // key row is encrypted under whichever secret last wrote it — a
        // mismatched secret here makes JWT-plugin requests from whichever
        // suite runs second fail with "Failed to decrypt private key".
        BETTER_AUTH_SECRET: 'ci-test-better-auth-secret-32-characters',
        HOMINEM_EMAIL_PROVIDER: 'scripted',
        AUTH_EMAIL_OTP_EXPIRES_SECONDS: '60',
        OPENAI_API_KEY: 'test-openai-key',
        RESEND_API_KEY: 'test-resend-key',
        RESEND_FROM_EMAIL: 'test@hominem.test',
        RESEND_FROM_NAME: 'Test Hominem',
      },
    },
    {
      command: 'npx react-router dev --host 0.0.0.0 --port 4451',
      cwd: path.resolve(workspaceRoot, 'apps/career'),
      url: `${careerBaseUrl}/`,
      reuseExistingServer,
      timeout: 60_000,
      env: {
        HOMINEM_INTERNAL_API_URL: apiBaseUrl,
        PUBLIC_APP_URL: careerBaseUrl,
        VITE_PUBLIC_API_URL: apiBaseUrl,
        // Must match the API webServer's DATABASE_URL above: the API creates
        // the e2e user in this DB during login, and career writes projects/
        // positions directly to Postgres via packages/db in its own routes
        // (see project.repository.ts) — without this override it falls back
        // to apps/career/.env's real dev DATABASE_URL, a different database
        // where that user doesn't exist, causing a foreign-key violation on
        // every write.
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:4433/hominem-test',
      },
    },
  ],
});
