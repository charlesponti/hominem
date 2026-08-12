import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

const AUTH_API_BASE_URL = 'http://localhost:4040';
const AUTH_TEST_OTP_URL = `${AUTH_API_BASE_URL}/api/auth/test/otp/latest`;
const AUTH_E2E_SECRET = 'otp-secret';
const OTP_FETCH_TIMEOUT_MS = 15_000;
const OTP_FETCH_RETRY_DELAY_MS = 500;

interface OtpResponse {
  otp: string;
}

export function createE2eEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@hominem.test`;
}

/**
 * Career signs in through the API-hosted login (/auth redirects there).
 * The hosted login is a plain HTML form: email step ("Continue") then a
 * six-digit OTP step ("Verify"). Landing URL after success is the career
 * fallback, /work.
 */
async function startEmailOtpFlow(page: Page, email: string) {
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
  }).toPass({ timeout: 20_000 });

  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/login\?.*step=otp.*email=/, { timeout: 30_000 });
}

async function fetchLatestSignInOtp(email: string) {
  const deadline = Date.now() + OTP_FETCH_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const response = await fetch(
      `${AUTH_TEST_OTP_URL}?email=${encodeURIComponent(email)}&type=sign-in`,
      { headers: { 'x-e2e-auth-secret': AUTH_E2E_SECRET } },
    );

    if (response.ok) {
      const payload = (await response.json()) as OtpResponse;
      expect(payload.otp.length).toBeGreaterThan(3);
      return payload.otp;
    }

    await new Promise((resolve) => setTimeout(resolve, OTP_FETCH_RETRY_DELAY_MS));
  }

  throw new Error(`Timed out waiting for sign-in OTP for ${email}`);
}

export async function signInWithOtp(page: Page, email: string) {
  await startEmailOtpFlow(page, email);
  const otp = await fetchLatestSignInOtp(email);

  const digits = page.locator('input[data-otp-digit]');
  await expect(digits).toHaveCount(6, { timeout: 15_000 });
  for (let i = 0; i < 6; i++) {
    await digits.nth(i).fill(otp[i] ?? '');
  }
  await expect(digits.first()).toHaveValue(otp[0] ?? '');

  // The hosted login keeps the submitted OTP in a hidden form field; its
  // own JS syncs it from the digit inputs. Set it via evaluate (Playwright
  // fill() refuses hidden inputs) so the value is correct even if the
  // client-side sync lags.
  const otpField = page.locator('input[name="otp"]');
  await otpField.evaluate((input, value) => {
    if (!(input instanceof HTMLInputElement)) return;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, otp);

  await page.getByRole('button', { name: 'Verify' }).click();
  await expect(page).toHaveURL(/\/work/, { timeout: 30_000 });
}
