import { resolveOAuthResumeUrl } from '@hominem/auth/shared/redirect-policy';
import { Hono } from 'hono';
import { z } from 'zod';

import { betterAuthServer } from '../auth/better-auth';
import { API_BRAND } from '../brand';
import { env } from '../env';

const emailSchema = z.string().email();
const otpSchema = z.string().length(6);

type LoginPageProps = {
  email: string;
  error?: string;
  oauthQuery: string;
  step: 'email' | 'otp';
};

function getFormValue(form: Record<string, string | File>, name: string) {
  const value = form[name];
  return typeof value === 'string' ? value : '';
}

function getOAuthResumeUrl(query: string) {
  return resolveOAuthResumeUrl(query, env.API_URL);
}

function loginUrl(input: {
  email?: string;
  error?: string;
  oauthQuery: string;
  step: 'email' | 'otp';
}) {
  const url = new URL('/login', env.API_URL);
  const query = new URLSearchParams(input.oauthQuery);
  query.set('step', input.step);
  if (input.email) query.set('email', input.email);
  if (input.error) query.set('error', input.error);
  url.search = query.toString();
  return url.toString();
}

function LoginPage({ email, error, oauthQuery, step }: LoginPageProps) {
  const isOtpStep = step === 'otp';

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <title>Sign in | {API_BRAND.appName}</title>
      </head>
      <body>
        <main>
          <h1>Sign in to {API_BRAND.appName}</h1>
          <p>
            {isOtpStep
              ? `We sent a verification code to ${email}.`
              : 'Enter your email to continue.'}
          </p>
          {error ? <p role="alert">{error}</p> : null}
          <form action={isOtpStep ? '/login/verify' : '/login/send'} method="post">
            <input name="oauth" type="hidden" value={oauthQuery} />
            {isOtpStep ? (
              <>
                <input name="email" type="hidden" value={email} />
                <label>
                  Verification code
                  <input autoComplete="one-time-code" inputMode="numeric" name="otp" required />
                </label>
              </>
            ) : (
              <label>
                Email address
                <input autoComplete="email" name="email" required type="email" value={email} />
              </label>
            )}
            <button type="submit">{isOtpStep ? 'Verify and continue' : 'Continue'}</button>
          </form>
          {isOtpStep ? (
            <form action="/login/send" method="post">
              <input name="oauth" type="hidden" value={oauthQuery} />
              <input name="email" type="hidden" value={email} />
              <button type="submit">Resend code</button>
            </form>
          ) : null}
        </main>
      </body>
    </html>
  );
}

async function callBetterAuth(input: {
  body: Record<string, string>;
  path: string;
  request: Request;
}) {
  const headers = new Headers(input.request.headers);
  headers.set('content-type', 'application/json');
  if (!headers.has('origin')) headers.set('origin', env.API_URL);

  return betterAuthServer.handler(
    new Request(new URL(`/api/auth${input.path}`, env.API_URL), {
      method: 'POST',
      headers,
      body: JSON.stringify(input.body),
    }),
  );
}

export const loginRoutes = new Hono()
  .get('/login', async (c) => {
    const url = new URL(c.req.url);
    const oauthQuery = url.searchParams.toString();
    const oauthResumeUrl = getOAuthResumeUrl(oauthQuery);
    if (!oauthResumeUrl) return c.text('Invalid OAuth authorization request.', 400);

    const session = await betterAuthServer.api.getSession({ headers: c.req.raw.headers });
    if (session) return c.redirect(oauthResumeUrl);

    const email = url.searchParams.get('email') ?? '';
    const step =
      url.searchParams.get('step') === 'otp' && emailSchema.safeParse(email).success
        ? 'otp'
        : 'email';
    return c.html(
      <LoginPage
        email={email}
        error={url.searchParams.get('error') ?? undefined}
        oauthQuery={oauthQuery}
        step={step}
      />,
    );
  })
  .post('/login/send', async (c) => {
    const form = await c.req.parseBody();
    const email = getFormValue(form, 'email');
    const oauthQuery = getFormValue(form, 'oauth');

    if (!getOAuthResumeUrl(oauthQuery) || !emailSchema.safeParse(email).success) {
      return c.redirect(
        loginUrl({ error: 'Enter a valid email address.', oauthQuery, step: 'email' }),
        303,
      );
    }

    const response = await callBetterAuth({
      body: { email, type: 'sign-in' },
      path: '/email-otp/send-verification-otp',
      request: c.req.raw,
    });
    if (!response.ok) {
      return c.redirect(
        loginUrl({
          email,
          error: 'Unable to send a verification code. Try again.',
          oauthQuery,
          step: 'email',
        }),
        303,
      );
    }

    return c.redirect(loginUrl({ email, oauthQuery, step: 'otp' }), 303);
  })
  .post('/login/verify', async (c) => {
    const form = await c.req.parseBody();
    const email = getFormValue(form, 'email');
    const oauthQuery = getFormValue(form, 'oauth');
    const otp = getFormValue(form, 'otp');
    const oauthResumeUrl = getOAuthResumeUrl(oauthQuery);

    if (
      !oauthResumeUrl ||
      !emailSchema.safeParse(email).success ||
      !otpSchema.safeParse(otp).success
    ) {
      return c.redirect(
        loginUrl({
          email,
          error: 'Enter the six-digit verification code.',
          oauthQuery,
          step: 'otp',
        }),
        303,
      );
    }

    const response = await callBetterAuth({
      body: { email, otp },
      path: '/sign-in/email-otp',
      request: c.req.raw,
    });
    if (!response.ok && (response.status < 300 || response.status >= 400)) {
      return c.redirect(
        loginUrl({
          email,
          error: 'Verification failed. Check your code and try again.',
          oauthQuery,
          step: 'otp',
        }),
        303,
      );
    }

    const headers = new Headers(response.headers);
    headers.set('location', oauthResumeUrl);
    return new Response(null, { headers, status: 303 });
  });
