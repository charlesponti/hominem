/**
 * Sets up the persistent E2E test account and prints a session cookie ready
 * to export for iOS XCUITest runs.
 *
 * Usage: pnpm e2e:setup
 *
 * Sends an OTP to e2e@test.hakumi.io (creating the user if needed), reads the
 * real OTP back from the scripted provider's local mailbox file, signs in
 * with it, then prints export statements for E2E_SESSION_COOKIE, E2E_USER_ID,
 * and E2E_USER_EMAIL.
 *
 * Needs the server running with NODE_ENV != production — local dev captures
 * outbound OTP email to the mailbox by default (explicit ENV=scripted enables capture).
 * OTPs are never exposed over the API; this script reads the same-host file directly.
 */

import { readLatestScriptedOtp, resolveScriptedMailboxPath } from '@hominem/utils/scripted-mailbox';
import 'dotenv/config';
import z from 'zod';

const API_URL = (process.env.API_URL ?? 'http://localhost:4040').replace(/\/$/, '');
const ORIGIN = process.env.E2E_ORIGIN ?? process.env.WEB_URL ?? 'http://localhost:4445';
const TEST_EMAIL = 'e2e@test.hakumi.io';
const OTP_POLL_TIMEOUT_MS = 15_000;
const OTP_POLL_INTERVAL_MS = 500;

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
  // The OTP send runs as a server background task, so the capture lands
  // after the send request already responded — poll the mailbox.
  const mailboxFile = resolveScriptedMailboxPath();
  const deadline = Date.now() + OTP_POLL_TIMEOUT_MS;
  for (;;) {
    const record = readLatestScriptedOtp(mailboxFile, TEST_EMAIL);
    if (record?.otp) return record.otp;
    if (Date.now() >= deadline) {
      throw new Error(
        `No OTP captured for ${TEST_EMAIL} in ${mailboxFile}\nIs local email capture active? Set ENV=scripted to force scripted mode.`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, OTP_POLL_INTERVAL_MS));
  }
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

  const json = await res.json();
  const body = z
    .object({
      user: z
        .object({
          id: z.string(),
          email: z.string(),
          name: z.string().nullable().optional(),
        })
        .optional(),
    })
    .parse(json);

  if (!body.user) {
    throw new Error('Sign-in response missing user object');
  }

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
    die(err instanceof Error ? err.message : 'Unknown error');
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
