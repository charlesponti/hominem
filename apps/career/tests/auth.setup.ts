import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import {
  createE2eEmail,
  signInWithOtp,
  startEmailOtpFlow,
  submitOtpCode,
} from './auth.flow-helpers';

const authDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.auth');
const authStorageState = path.join(authDir, 'career-user.json');

// The OTP login form is served by the API and shared by every consuming app
// (career, finance, web, WH?T — see docs/authentication.md), so its error
// state only needs covering once, here, rather than duplicated per app.
test('rejects an invalid verification code', async ({ page, context }) => {
  await context.clearCookies();
  await startEmailOtpFlow(page, createE2eEmail('career-invalid-otp'));
  await submitOtpCode(page, '111111');

  await expect(page).toHaveURL(/\/login\?.*step=otp.*error=/, { timeout: 30_000 });
  await expect(page.getByText('Verification failed. Check your code and try again.')).toBeVisible({
    timeout: 15_000,
  });
  await expect(page).not.toHaveURL(/\/work$/);
});

test('authenticate career e2e user', async ({ page }) => {
  await mkdir(authDir, { recursive: true });
  await signInWithOtp(page, createE2eEmail('career-setup'));
  await expect(page).toHaveURL(/\/work$/, { timeout: 30_000 });
  await page.context().storageState({ path: authStorageState });
});
