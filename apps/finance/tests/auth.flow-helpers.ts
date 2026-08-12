import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
const AUTH_API_BASE_URL = 'http://localhost:4040';
const AUTH_TEST_OTP_URL = `${AUTH_API_BASE_URL}/api/auth/test/otp/latest`;
const AUTH_E2E_SECRET = 'otp-secret';
const OTP_FETCH_TIMEOUT_MS = 15_000;
const OTP_FETCH_RETRY_DELAY_MS = 500;

export interface OtpResponse {
  otp: string;
}

export function createAuthTestEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@hominem.test`;
}

export async function startEmailOtpFlow(page: Page, email: string) {
  await page.goto('/auth');

  // Wait for full React hydration: in Vite dev mode, React may still be
  // reconciling the SSR HTML when the page appears ready. A fill before
  // hydration is complete will be wiped when React takes over the DOM.
  // Retry until the fill value sticks — this is the reliable hydration signal.
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
  const deadline = Date.now() + OTP_FETCH_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const otpResponse = await fetch(
      `${AUTH_TEST_OTP_URL}?email=${encodeURIComponent(email)}&type=sign-in`,
      {
        method: 'GET',
        headers: {
          'x-e2e-auth-secret': AUTH_E2E_SECRET,
        },
      },
    );

    if (otpResponse.ok) {
      const otpPayload = (await otpResponse.json()) as OtpResponse;
      expect(otpPayload.otp.length).toBeGreaterThan(3);
      return otpPayload.otp;
    }

    await new Promise((resolve) => setTimeout(resolve, OTP_FETCH_RETRY_DELAY_MS));
  }

  throw new Error(`Timed out waiting for sign-in OTP for ${email}`);
}

export async function signInWithEmailOtp(page: Page, email: string) {
  await startEmailOtpFlow(page, email);
  const otp = await fetchLatestSignInOtp(email);
  await submitOtpCode(page, otp);
  await expect(page).toHaveURL(/\/finance$/, { timeout: 30000 });
}

export async function enterOtpCode(page: Page, otp: string) {
  const normalized = otp.replace(/\D/g, '').slice(0, 6);

  // Check if the page uses individual digit inputs or a single OTP field
  const digitInputs = page.locator('input[inputmode="numeric"]');
  const hasDigitInputs = await digitInputs.count();

  if (hasDigitInputs > 0) {
    // Individual digit inputs — fill each one
    for (let i = 0; i < 6; i++) {
      await digitInputs.nth(i).fill(normalized[i] ?? '');
    }

    // Verify digit inputs have values
    await expect(digitInputs.first()).toHaveValue(normalized[0] ?? '', { timeout: 5000 });
  }

  // The hosted login keeps the submitted OTP in a hidden form field.
  const otpField = page.locator('input[name="otp"]');
  const hasOtpField = await otpField.count();

  if (hasOtpField > 0) {
    await otpField.fill(normalized);
    await expect(otpField).toHaveValue(normalized, { timeout: 5000 });

    // Manually trigger React events
    await otpField.evaluate((input, value) => {
      if (!(input instanceof HTMLInputElement)) return;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, normalized);

    await expect(otpField).toHaveValue(normalized, { timeout: 5000 });
  }
}

export async function submitOtpCode(page: Page, otp: string) {
  const normalized = otp.replace(/\D/g, '').slice(0, 6);
  expect(normalized.length).toBeGreaterThan(3);
  await enterOtpCode(page, normalized);

  // Submit the form
  await page.locator('input[name="otp"]').evaluate((input) => {
    if (!(input instanceof HTMLInputElement)) return;
    const form = input.closest('form');
    if (form instanceof HTMLFormElement) {
      form.requestSubmit();
    }
  });
}
