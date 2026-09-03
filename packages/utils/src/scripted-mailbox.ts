import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

// Local mailbox for OTPs captured by the scripted email provider.
//
// Why a file and not an API route: authentication secrets must never be
// retrievable over HTTP, no matter how the endpoint is gated — flags get
// misconfigured and header secrets leak. The scripted provider only runs on
// the same host as the tests consuming it (local dev, CI), so the capture
// can stay on the local filesystem where Unix permissions are the boundary,
// exactly like the gitignored .env files holding real secrets.
//
// The OTP itself is still the real randomly generated code flowing through
// the normal send path; only delivery is scripted. Records are JSONL:
// {"to":"...","otp":"123456","subject":"...","capturedAt":"..."}.

export interface ScriptedMailboxRecord {
  to: string;
  otp: string | null;
  subject: string;
  capturedAt: string;
}

export function resolveScriptedMailboxPath(explicit?: string): string {
  const override = explicit ?? process.env.HOMINEM_SCRIPTED_MAILBOX;
  if (override && override.length > 0) return override;
  return join(homedir(), '.hominem', 'scripted-mailbox.jsonl');
}

// Best-effort: mailbox capture must never break the send path it observes.
export function appendScriptedMailboxRecord(
  mailboxFile: string,
  record: Omit<ScriptedMailboxRecord, 'capturedAt'>,
): void {
  try {
    mkdirSync(dirname(mailboxFile), { recursive: true });
    appendFileSync(
      mailboxFile,
      `${JSON.stringify({ ...record, capturedAt: new Date().toISOString() })}\n`,
      { mode: 0o600 },
    );
  } catch {
    return;
  }
}

function parseMailboxLine(line: string): ScriptedMailboxRecord | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const to = Reflect.get(value, 'to');
  const otp = Reflect.get(value, 'otp');
  const subject = Reflect.get(value, 'subject');
  const capturedAt = Reflect.get(value, 'capturedAt');
  if (typeof to !== 'string' || typeof capturedAt !== 'string') return null;
  if (otp !== null && typeof otp !== 'string') return null;
  return { to, otp, subject: typeof subject === 'string' ? subject : '', capturedAt };
}

// Latest captured OTP for an exact recipient address, or null. OTP sends run
// as a background task, so callers poll this until a record appears.
export function readLatestScriptedOtp(
  mailboxFile: string,
  email: string,
): ScriptedMailboxRecord | null {
  if (!existsSync(mailboxFile)) return null;
  let latest: ScriptedMailboxRecord | null = null;
  for (const line of readFileSync(mailboxFile, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const record = parseMailboxLine(line);
    if (!record || record.to !== email || !record.otp) continue;
    if (!latest || record.capturedAt > latest.capturedAt) latest = record;
  }
  return latest;
}
