import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const reuseExistingServer = process.env.REUSE_SERVERS === 'true' || !process.env.CI

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4445',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'bun run --filter @hominem/db build && bun run --filter @hominem/api dev',
      cwd: workspaceRoot,
      url: 'http://localhost:4040/',
      reuseExistingServer,
      timeout: 120_000,
      env: {
        NODE_ENV: 'test',
        PORT: '4040',
        API_URL: 'http://localhost:4040',
        NOTES_URL: 'http://localhost:4445',
        DATABASE_URL: 'postgres://postgres:postgres@localhost:4433/hominem-test',
        AUTH_TEST_OTP_ENABLED: 'true',
        AUTH_E2E_SECRET: 'otp-secret',
        OPENROUTER_API_KEY: 'test-openrouter-key',
        SEND_EMAILS: 'false',
      },
    },
    {
      command: 'bun dev --filter @hominem/web',
      cwd: workspaceRoot,
      url: 'http://localhost:4445/',
      reuseExistingServer,
      timeout: 60_000,
    },
  ],
})
