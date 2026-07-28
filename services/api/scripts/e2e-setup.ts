/**
 * e2e-setup.ts
 *
 * Provisions the persistent E2E test account and prints a ready-to-export
 * session cookie for use in iOS XCUITest runs.
 *
 * Usage:
 *   pnpm e2e:setup
 *
 * What it does:
 *   1. Sends an OTP to e2e@test.hakumi.io  (creates the user if absent)
 *   2. Signs in via POST /api/auth/sign-in/email-otp using the fixed test OTP
 *   3. Prints export statements for E2E_SESSION_COOKIE, E2E_USER_ID, E2E_USER_EMAIL
 *
 * Prerequisites on the server:
 *   NODE_ENV != production  (so the fixed test OTP is used instead of a random one)
 */

import 'dotenv/config';
import { TEST_OTP } from '../src/auth/better-auth';

const API_URL = (process.env.API_URL ?? 'http://localhost:4040').replace(/\/$/, '');
const TEST_EMAIL = 'e2e@test.hakumi.io';

function die(message: string): never {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

async function step<T>(label: string, fn: () => Promise<T>): Promise<T> {
  process.stdout.write(`  ${label}... `);
  try {
    const result = await fn();
    console.log('✓');
    return result;
  } catch (err) {
    console.log('✗');
    throw err;
  }
}

async function sendOTP(): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/email-otp/send-verification-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, type: 'sign-in' }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
}

interface SignInResult {
  sessionCookie: string;
  user: { id: string; email: string; name: string | null };
}

async function signIn(): Promise<SignInResult> {
  const res = await fetch(`${API_URL}/api/auth/sign-in/email-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, otp: TEST_OTP }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }

  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) {
    throw new Error(
      'No Set-Cookie header in sign-in response. Check that AUTH_COOKIE_DOMAIN is set correctly for the local environment.',
    );
  }

  const sessionCookie = setCookie.split(';')[0]?.trim() ?? '';
  if (!sessionCookie) throw new Error('Could not parse session cookie value');

  const body = (await res.json()) as {
    user?: { id: string; email: string; name?: string | null };
  };
  const user = body.user;
  if (!user?.id || !user?.email) {
    throw new Error('Sign-in response missing user data');
  }

  return { sessionCookie, user: { id: user.id, email: user.email, name: user.name ?? null } };
}

async function main() {
  console.log('\nOmiro E2E setup\n');
  console.log(`  API:   ${API_URL}`);
  console.log(`  Email: ${TEST_EMAIL}`);
  console.log();

  let result: SignInResult;

  try {
    await step('Sending OTP', sendOTP);
    result = await step('Signing in', signIn);
  } catch (err) {
    die((err as Error).message);
  }

  const { sessionCookie, user } = result!;

  console.log('\n──────────────────────────────────────────────────────────\n');
  console.log('E2E credentials ready.\n');
  console.log('Export these before running iOS E2E tests:\n');
  console.log(`  export E2E_SESSION_COOKIE="${sessionCookie}"`);
  console.log(`  export E2E_USER_ID="${user.id}"`);
  console.log(`  export E2E_USER_EMAIL="${user.email}"`);
  if (user.name) console.log(`  export E2E_USER_NAME="${user.name}"`);
  console.log('\n──────────────────────────────────────────────────────────');
  console.log('\nOr pipe into your shell:\n');
  console.log(`  eval "$(pnpm --silent e2e:setup 2>/dev/null | grep 'export ')"\n`);
}

main();
