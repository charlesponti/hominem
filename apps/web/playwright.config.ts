import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const webUrl = process.env.WEB_URL ?? 'https://web.lvh.me:4200';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: webUrl,
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  projects: [
    { name: 'auth', testMatch: /auth\.setup\.ts/ },
    { name: 'auth-collaborator', testMatch: /auth-collaborator\.setup\.ts/ },
    {
      name: 'chat',
      dependencies: ['auth', 'auth-collaborator'],
      testIgnore: /\.setup\.ts$/,
      use: { storageState: path.join(appDir, 'tests/.auth/chat-user.json') },
    },
  ],
});
