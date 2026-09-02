import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const webUrl = process.env.WEB_URL ?? 'http://localhost:4445';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: webUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  projects: [
    { name: 'auth', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chat',
      dependencies: ['auth'],
      testIgnore: /auth\.setup\.ts/,
      use: { storageState: path.join(appDir, 'tests/.auth/chat-user.json') },
    },
  ],
});
