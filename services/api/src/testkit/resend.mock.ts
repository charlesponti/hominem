import { isObject } from '@hominem/utils';
import { appendScriptedMailboxRecord } from '@hominem/utils/scripted-mailbox';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Mocks the Resend vendor at its outbound network boundary (the OTP email
// content, including the real randomly generated code, still flows through
// the normal application code path — only the HTTP call to Resend itself is
// intercepted).
//
// For live servers (not unit tests), pass mailboxFile to also append each
// capture to a local JSONL mailbox that same-host E2E helpers read back.
// That file is the only OTP retrieval channel: authentication secrets are
// never exposed over HTTP. Unit tests omit mailboxFile and read the
// in-memory capture via getScriptedEmail instead, so no test writes disk.

type ScriptedEmail = {
  to: string;
  subject: string;
  text: string;
  otp: string | null;
  capturedAt: Date;
};

const capturedEmails = new Map<string, ScriptedEmail>();
let mailboxFile: string | null = null;

function extractOtp(text: string): string | null {
  return text.match(/verification code is: (\d{6})/i)?.[1] ?? null;
}

function isResendEmailBody(
  value: unknown,
): value is { to: string | string[]; subject: string; text: string } {
  if (!isObject(value)) return false;
  const to = Reflect.get(value, 'to');
  return (
    (typeof to === 'string' ||
      (Array.isArray(to) && to.every((item) => typeof item === 'string'))) &&
    typeof Reflect.get(value, 'subject') === 'string' &&
    typeof Reflect.get(value, 'text') === 'string'
  );
}

const server = setupServer(
  http.post('https://api.resend.com/emails', async ({ request }) => {
    // .clone() first: with OpenTelemetry's fetch/undici auto-instrumentation
    // active (as it is on a real server boot, unlike a vitest import), the
    // instrumentation reads the request body for span capture before this
    // handler runs, so a direct request.json() throws "Body has already
    // been read".
    const body: unknown = await request.clone().json();
    if (!isResendEmailBody(body)) {
      return HttpResponse.json({ error: 'Invalid scripted email body' }, { status: 400 });
    }
    const to = Array.isArray(body.to) ? body.to[0] : body.to;
    if (to) {
      const otp = extractOtp(body.text ?? '');
      capturedEmails.set(to, {
        to,
        subject: body.subject,
        text: body.text,
        otp,
        capturedAt: new Date(),
      });
      // Defense in depth behind index.ts refusing scripted+production at
      // boot: the mailbox only ever exists on non-production hosts.
      if (mailboxFile && process.env.NODE_ENV !== 'production' && otp) {
        appendScriptedMailboxRecord(mailboxFile, { to, otp, subject: body.subject });
      }
    }
    return HttpResponse.json({ id: `scripted-email-${capturedEmails.size}` });
  }),
);

export function installResendMock(options: { mailboxFile?: string } = {}) {
  capturedEmails.clear();
  mailboxFile = options.mailboxFile ?? null;
  server.listen({ onUnhandledRequest: 'bypass' });
  return () => {
    mailboxFile = null;
    server.close();
  };
}

export function getScriptedEmail(to: string): ScriptedEmail | null {
  return capturedEmails.get(to) ?? null;
}

export function clearScriptedEmails(): void {
  capturedEmails.clear();
}

// Test-only: seed a capture directly instead of round-tripping a real HTTP
// call through the mocked Resend endpoint.
export function setScriptedEmailForTest(email: Omit<ScriptedEmail, 'capturedAt'>): void {
  capturedEmails.set(email.to, { ...email, capturedAt: new Date() });
}
