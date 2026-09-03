import { readLatestScriptedOtp, resolveScriptedMailboxPath } from '@hominem/utils/scripted-mailbox';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
const OTP_FETCH_TIMEOUT_MS = 15_000;
const OTP_FETCH_RETRY_DELAY_MS = 500;

export function createAuthTestEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@hominem.test`;
}

async function startEmailOtpFlow(page: Page, email: string) {
  await page.goto('/auth');

  // in dev mode the page can look ready before React finishes hydrating, and a fill
  // done too early gets wiped when hydration takes over - so retry until it sticks
  const emailInput = page.getByLabel('Email address');
  await emailInput.waitFor({ state: 'visible' });
  await expect(async () => {
    await emailInput.fill(email);
    await expect(emailInput).toHaveValue(email);
  }).toPass({ timeout: 20000 });

  const continueButton = page.getByRole('button', { name: 'Continue' });
  await expect(continueButton).toBeEnabled();
  await continueButton.click();

  // The app redirects to the API-owned hosted login for the OTP step.
  await expect(page).toHaveURL(/\/login\?.*step=otp.*email=/, { timeout: 30000 });
}

export async function fetchLatestSignInOtp(email: string) {
  // OTPs are never exposed over the API: the scripted provider appends them
  // to a same-host mailbox file, which this polls — the OTP send runs as a
  // server background task, so the capture lands after the request responds.
  const mailboxFile = resolveScriptedMailboxPath();
  const deadline = Date.now() + OTP_FETCH_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const record = readLatestScriptedOtp(mailboxFile, email);

    if (record?.otp) {
      expect(record.otp.length).toBeGreaterThan(3);
      return record.otp;
    }

    await new Promise((resolve) => setTimeout(resolve, OTP_FETCH_RETRY_DELAY_MS));
  }

  throw new Error(`Timed out waiting for sign-in OTP for ${email} in ${mailboxFile}`);
}

export async function signInWithEmailOtp(page: Page, email: string) {
  await startEmailOtpFlow(page, email);
  const otp = await fetchLatestSignInOtp(email);
  await submitOtpCode(page, otp);
  await expect(page).toHaveURL(/\/finance$/, { timeout: 30000 });
}

async function enterOtpCode(page: Page, otp: string) {
  const normalized = otp.replace(/\D/g, '').slice(0, 6);

  // The hosted login's visible digit inputs are marked with data-otp-digit
  // (see services/api/src/routes/login/pages.tsx) — not inputmode="numeric".
  const digitInputs = page.locator('input[data-otp-digit]');
  await expect(digitInputs).toHaveCount(6, { timeout: 15_000 });
  for (let i = 0; i < 6; i++) {
    await digitInputs.nth(i).fill(normalized[i] ?? '');
  }
  await expect(digitInputs.first()).toHaveValue(normalized[0] ?? '');

  // The hosted login keeps the submitted OTP in a hidden form field; its own
  // JS syncs it from the digit inputs. Set it via evaluate — Playwright's
  // fill() refuses hidden inputs (retries until timeout instead of erroring)
  // — so the value is correct even if the client-side sync lags.
  const otpField = page.locator('input[name="otp"]');
  await otpField.evaluate((input, value) => {
    if (!(input instanceof HTMLInputElement)) return;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, normalized);
}

async function submitOtpCode(page: Page, otp: string) {
  const normalized = otp.replace(/\D/g, '').slice(0, 6);
  expect(normalized.length).toBeGreaterThan(3);
  await enterOtpCode(page, normalized);

  await page.locator('input[name="otp"]').evaluate((input) => {
    if (!(input instanceof HTMLInputElement)) return;
    const form = input.closest('form');
    if (form instanceof HTMLFormElement) {
      form.requestSubmit();
    }
  });
}
