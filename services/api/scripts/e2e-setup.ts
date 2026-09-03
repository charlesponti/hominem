/**
 * Sets up the persistent E2E test account and prints a session cookie ready
 * to export for iOS XCUITest runs.
 *
 * Usage: pnpm e2e:setup
 *
 * Sends an OTP to e2e@test.hakumi.io (creating the user if needed), reads the
 * real OTP back from the server's scripted-email test route, signs in with
 * it, then prints export statements for E2E_SESSION_COOKIE, E2E_USER_ID, and
 * E2E_USER_EMAIL.
 *
 * Needs the server running with NODE_ENV != production,
 * HOMINEM_EMAIL_PROVIDER=scripted, and AUTH_E2E_ENABLED=true — that's what
 * exposes GET /api/auth/test/otp/latest.
 */

import 'dotenv/config';

const API_URL = (process.env.API_URL ?? 'http://localhost:4040').replace(/\/$/, '');
const ORIGIN = process.env.E2E_ORIGIN ?? process.env.WEB_URL ?? 'http://localhost:4445';
const TEST_EMAIL = 'e2e@test.hakumi.io';
const AUTH_E2E_SECRET = process.env.AUTH_E2E_SECRET ?? '';

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
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ email: TEST_EMAIL, type: 'sign-in' }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
}

async function fetchOTP(): Promise<string> {
  const url = `${API_URL}/api/auth/test/otp/latest?email=${encodeURIComponent(TEST_EMAIL)}&type=sign-in`;
  const res = await fetch(url, { headers: { 'x-e2e-auth-secret': AUTH_E2E_SECRET } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `HTTP ${res.status}: ${body}\nIs the server running with HOMINEM_EMAIL_PROVIDER=scripted and AUTH_E2E_ENABLED=true?`,
    );
  }
  const body = (await res.json()) as { otp: string };
  return body.otp;
}

interface SignInResult {
  sessionCookie: string;
  user: { id: string; email: string; name: string | null };
}

async function signIn(otp: string): Promise<SignInResult> {
  const res = await fetch(`${API_URL}/api/auth/sign-in/email-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ email: TEST_EMAIL, otp }),
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
    const otp = await step('Reading OTP', fetchOTP);
    result = await step('Signing in', () => signIn(otp));
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
