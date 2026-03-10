import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const reuseExistingServer = process.env.REUSE_SERVERS === 'true'
const apiBaseUrl = 'http://api.lvh.me:4040'
const financeBaseUrl = 'http://finance.lvh.me:4444'

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  workers: 1,
  retries: 1,
  globalSetup: './tests/global-setup.ts',
  use: {
    baseURL: financeBaseUrl,
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'bun run --filter @hominem/db build && bun run --filter @hominem/api dev',
      cwd: workspaceRoot,
      url: `${apiBaseUrl}/`,
      reuseExistingServer,
      timeout: 120_000,
      env: {
        NODE_ENV: 'test',
        PORT: '4040',
        API_URL: apiBaseUrl,
        BETTER_AUTH_URL: apiBaseUrl,
        AUTH_PASSKEY_RP_ID: 'lvh.me',
        AUTH_PASSKEY_ORIGIN: apiBaseUrl,
        AUTH_COOKIE_DOMAIN: 'lvh.me',
        FINANCE_URL: financeBaseUrl,
        NOTES_URL: 'http://notes.lvh.me:4445',
        ROCCO_URL: 'http://rocco.lvh.me:4446',
        DATABASE_URL: 'postgres://postgres:postgres@localhost:4433/hominem-test',
        AUTH_TEST_OTP_ENABLED: 'true',
        AUTH_E2E_SECRET: 'otp-secret',
        AUTH_E2E_ENABLED: 'true',
        AUTH_EMAIL_OTP_EXPIRES_SECONDS: '60',
        OPENAI_API_KEY: 'test-openai-key',
      },
    },
    {
      command: 'bunx react-router dev --host 0.0.0.0 --port 4444',
      cwd: path.resolve(workspaceRoot, 'apps/finance'),
      url: `${financeBaseUrl}/`,
      reuseExistingServer,
      timeout: 60_000,
      env: {
        VITE_PUBLIC_API_URL: apiBaseUrl,
        AUTH_COOKIE_DOMAIN: 'lvh.me',
      },
    },
  ],
})
