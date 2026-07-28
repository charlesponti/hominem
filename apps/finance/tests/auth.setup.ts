import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { createAuthTestEmail, signInWithEmailOtp } from './auth.flow-helpers';

const authDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.auth');
const authStorageState = path.join(authDir, 'finance-user.json');

test('authenticate finance e2e user', async ({ page }) => {
  await mkdir(authDir, { recursive: true });
  await signInWithEmailOtp(page, createAuthTestEmail('finance-setup'));
  await expect(page).toHaveURL(/\/finance$/);
  await page.context().storageState({ path: authStorageState });
});
