import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Mocks the Resend vendor at its outbound network boundary (the OTP email
// content, including the real randomly generated code, still flows through
// the normal application code path — only the HTTP call to Resend itself is
// intercepted). Lets E2E clients read back the code a real user would have
// received by email, without hardcoding or bypassing OTP generation.

type ScriptedEmail = {
  to: string;
  subject: string;
  text: string;
  otp: string | null;
  capturedAt: Date;
};

const capturedEmails = new Map<string, ScriptedEmail>();

function extractOtp(text: string): string | null {
  return text.match(/verification code is: (\d{6})/i)?.[1] ?? null;
}

const server = setupServer(
  http.post('https://api.resend.com/emails', async ({ request }) => {
    // .clone() first: with OpenTelemetry's fetch/undici auto-instrumentation
    // active (as it is on a real server boot, unlike a vitest import), the
    // instrumentation reads the request body for span capture before this
    // handler runs, so a direct request.json() throws "Body has already
    // been read".
    const body = (await request.clone().json()) as {
      to: string | string[];
      subject: string;
      text: string;
    };
    const to = Array.isArray(body.to) ? body.to[0] : body.to;
    if (to) {
      capturedEmails.set(to, {
        to,
        subject: body.subject,
        text: body.text,
        otp: extractOtp(body.text ?? ''),
        capturedAt: new Date(),
      });
    }
    return HttpResponse.json({ id: `scripted-email-${capturedEmails.size}` });
  }),
);

export function installResendMock() {
  capturedEmails.clear();
  server.listen({ onUnhandledRequest: 'bypass' });
  return () => server.close();
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
