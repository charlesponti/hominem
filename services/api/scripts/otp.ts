/**
 * Prints the latest OTP captured by the scripted email provider for a given
 * address, so it doesn't have to be read out of the mailbox file by hand
 * during local development.
 *
 * Usage: pnpm --filter @hominem/api exec tsx scripts/otp.ts <email>
 *
 * Needs the server running with NODE_ENV != production (or ENV=scripted) so
 * outbound OTP email is captured to the mailbox instead of sent. OTPs are
 * never exposed over the API; this script reads the same-host file directly.
 */

import { readLatestScriptedOtp, resolveScriptedMailboxPath } from '@hominem/utils/scripted-mailbox';

const POLL_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 500;

function die(message: string): never {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const email = process.argv[2];
  if (!email) die('Usage: pnpm --filter @hominem/api exec tsx scripts/otp.ts <email>');

  const mailboxFile = resolveScriptedMailboxPath();
  const existing = readLatestScriptedOtp(mailboxFile, email);
  if (existing?.otp) {
    console.log(existing.otp);
    return;
  }

  // No record yet — the send may still be in flight as a background task, so
  // poll briefly instead of failing immediately.
  process.stderr.write(`Waiting for an OTP sent to ${email}...\n`);
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  for (;;) {
    const record = readLatestScriptedOtp(mailboxFile, email);
    if (record?.otp) {
      console.log(record.otp);
      return;
    }
    if (Date.now() >= deadline) {
      die(
        `No OTP captured for ${email} in ${mailboxFile}\nIs local email capture active? Set ENV=scripted to force scripted mode.`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

main();
