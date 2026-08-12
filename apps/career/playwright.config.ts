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
      command: 'pnpm --filter @hominem/api dev',
      cwd: workspaceRoot,
      url: `${apiBaseUrl}/`,
      reuseExistingServer,
      timeout: 120_000,
      env: {
        NODE_ENV: 'test',
        PORT: '4040',
        API_URL: apiBaseUrl,
        AUTH_COOKIE_DOMAIN: 'lvh.me',
        CAREER_URL: careerBaseUrl,
        NOTES_URL: 'http://notes.lvh.me:4445',
        ROCCO_URL: 'http://rocco.lvh.me:4446',
        DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:4433/hominem-test',
        BETTER_AUTH_SECRET: 'e2e-better-auth-secret-32-characters',
        AUTH_E2E_SECRET: 'otp-secret',
        AUTH_E2E_ENABLED: 'true',
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
        AUTH_COOKIE_DOMAIN: 'lvh.me',
      },
    },
  ],
});
