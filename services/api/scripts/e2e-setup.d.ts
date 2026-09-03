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
 * outbound OTP email to the mailbox by default (explicit
 * HOMINEM_EMAIL_PROVIDER=resend disables capture). OTPs are never exposed over the API; this script reads the
 * same-host file directly.
 */
import 'dotenv/config';
