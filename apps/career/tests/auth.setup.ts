import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { createE2eEmail, signInWithOtp } from './auth.flow-helpers';

const authDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.auth');
const authStorageState = path.join(authDir, 'career-user.json');

test('authenticate career e2e user', async ({ page }) => {
  await mkdir(authDir, { recursive: true });
  await signInWithOtp(page, createE2eEmail('career-setup'));
  await expect(page).toHaveURL(/\/work$/, { timeout: 30_000 });
  await page.context().storageState({ path: authStorageState });
});
