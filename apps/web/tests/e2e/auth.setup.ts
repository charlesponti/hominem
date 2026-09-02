import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

const authPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../.auth/chat-user.json',
);

test('prepare the authenticated chat browser state', async ({ page, context }) => {
  const sessionCookie = process.env.E2E_SESSION_COOKIE;
  if (!sessionCookie) {
    throw new Error(
      'E2E_SESSION_COOKIE is required. Run `eval "$(pnpm --filter @hominem/api --silent e2e:setup 2>/dev/null | grep \'export \')"` first.',
    );
  }

  const separator = sessionCookie.indexOf('=');
  if (separator <= 0) throw new Error('E2E_SESSION_COOKIE must be a name=value cookie');

  await context.addCookies([
    {
      name: sessionCookie.slice(0, separator),
      value: sessionCookie.slice(separator + 1),
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
  await page.goto('/chats');
  await expect(page.getByRole('heading', { name: 'Chats' })).toBeVisible();
  await mkdir(path.dirname(authPath), { recursive: true });
  await context.storageState({ path: authPath });
});
