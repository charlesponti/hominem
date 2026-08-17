import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  resolveAppRedirectUrl,
  resolveOAuthResumeUrl,
} from '@ponti-studios/auth/shared/redirect-policy';
import { Hono } from 'hono';
import { z } from 'zod';

import { betterAuthServer, getTrustedOrigins } from '../auth/better-auth';
import { env } from '../env';
import { MCP_SCOPES } from '../scopes';

const emailSchema = z.string().email();
const otpSchema = z.string().length(6);
const logoPath = join(process.cwd(), 'public', 'logo.hominem.500x500.webp');

// Two callers land on this one hosted login page:
//  - 'oauth': Better Auth's MCP plugin resuming an authorize request
//    (response_type/client_id/redirect_uri query params).
//  - 'app': another hominem-authenticated app (labs, career, finance, ...)
//    that doesn't host its own login UI, via ?next=<absolute-url>.
type ResumeMode = 'app' | 'oauth';

type Resume = { mode: ResumeMode; url: string };

type LoginPageProps = {
  email: string;
  error?: string;
  mode: ResumeMode;
  resumeQuery: string;
  step: 'email' | 'otp';
};

type AuthErrorPageProps = {
  description?: string;
  error?: string;
  mode?: ResumeMode;
};

type ConsentPageProps = {
  clientName: string;
  query: string;
  scopes: string[];
  error?: string;
};

const pageStyles = `
  :root {
    color-scheme: light;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #fcfcfd;
    color: #1c2024;
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    --auth-background: #fcfcfd;
    --auth-card: #f9f9fb;
    --auth-panel: #f0f0f3;
    --auth-text: #1c2024;
    --auth-muted: #60646c;
    --auth-tertiary: #80838d;
    --auth-primary: #000000;
    --auth-primary-text: #ffffff;
    --auth-border: #cdced6;
    --auth-danger: #c82c31;
    --auth-danger-background: #fff4f3;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      color-scheme: dark;
      background: #111113;
      color: #edeef0;
      --auth-background: #111113;
      --auth-card: #18191b;
      --auth-panel: #212225;
      --auth-text: #edeef0;
      --auth-muted: #b0b4ba;
      --auth-tertiary: #777b84;
      --auth-primary: #ffffff;
      --auth-primary-text: #111113;
      --auth-border: #43484e;
      --auth-danger: #ff9592;
      --auth-danger-background: #321b1b;
    }
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
    background: var(--auth-background);
  }

  button, input { font: inherit; }

  .auth-page {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 64px 16px;
    background: var(--auth-background);
    color: var(--auth-text);
  }

  .auth-layout {
    width: min(100%, 512px);
  }

  .auth-card {
    padding: 64px 48px;
    border: 1px solid var(--auth-border);
    border-radius: 8px;
    color: var(--auth-text);
    background: var(--auth-card);
    box-shadow: 0 10px 25px rgba(0, 0, 0, .08);
  }

  .auth-content {
    width: 100%;
    max-width: 384px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 80px;
    text-align: center;
  }

  .auth-heading {
    display: flex;
    flex-direction: column;
    gap: 8px;
    text-align: left;
  }

  .auth-heading h2 { margin: 0; }

  .brand-lockup {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 32px;
    color: var(--auth-text);
    font-size: 14px;
    font-weight: 600;
  }

  .brand-logo {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    object-fit: cover;
    filter: grayscale(1);
  }

  .auth-card h2 {
    margin: 0;
    color: var(--auth-text);
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    font-size: 30px;
    font-weight: 600;
    letter-spacing: -.04em;
  }

  .card-copy {
    margin: 0;
    color: var(--auth-muted);
    font-size: 14px;
    line-height: 1.55;
  }

  .card-copy strong { color: var(--auth-text); }

  .field {
    display: grid;
    gap: 6px;
    text-align: left;
  }

  .field label {
    color: var(--auth-text);
    font-size: 12px;
    font-weight: 500;
  }

  .field input {
    width: 100%;
    min-height: 36px;
    padding: 0 12px;
    border: 1px solid var(--auth-border);
    border-radius: 6px;
    outline: none;
    color: var(--auth-text);
    background: var(--auth-panel);
  }

  .field input:hover { border-color: var(--auth-muted); }

  .field input:focus {
    border-color: var(--auth-primary);
    background: var(--auth-card);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--auth-primary) 20%, transparent);
  }

  .otp-field {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .otp-input {
    width: 40px;
    height: 48px;
    min-height: 48px;
    padding: 0;
    text-align: center;
    font-size: 16px;
    font-weight: 600;
  }

  .primary-button {
    width: 100%;
    min-height: 36px;
    margin-top: 12px;
    border: 0;
    border-radius: 6px;
    cursor: pointer;
    color: var(--auth-primary-text);
    background: var(--auth-primary);
    box-shadow: none;
    font-weight: 600;
  }

  .primary-button:hover {
    color: var(--auth-primary-text);
    background: color-mix(in srgb, var(--auth-primary) 86%, var(--auth-text));
  }

  .primary-button:focus-visible,
  .secondary-button:focus-visible {
    outline: 2px solid var(--auth-primary);
    outline-offset: 2px;
  }

  .auth-links {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 14px;
  }

  .auth-links form { display: contents; }

  .secondary-button {
    margin: 0;
    padding: 0;
    border: 0;
    color: var(--auth-primary);
    background: transparent;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }

  .secondary-button:hover { color: var(--auth-text); }

  .alert {
    margin: 0;
    padding: 12px 14px;
    border: 1px solid color-mix(in srgb, var(--auth-danger) 35%, transparent);
    border-radius: 6px;
    color: var(--auth-danger);
    background: var(--auth-danger-background);
    font-size: 13px;
    line-height: 1.45;
  }

  .error-card { text-align: center; }

  .error-symbol {
    display: grid;
    place-items: center;
    width: 54px;
    height: 54px;
    margin: 0 auto 28px;
    border: 1px solid var(--auth-border);
    border-radius: 8px;
    color: var(--auth-danger);
    background: var(--auth-danger-background);
    font-size: 22px;
  }

  .error-card .card-copy {
    max-width: 320px;
    margin-right: auto;
    margin-left: auto;
  }

  .error-card a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 36px;
    border-radius: 6px;
    color: var(--auth-primary-text);
    background: var(--auth-primary);
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
  }

  .logout-card {
    text-align: center;
  }

  .logout-card .brand-lockup { display: inline-flex; }

  .card-topline,
  .card-footnote,
  .auth-intro,
  .auth-grid {
    display: none;
  }

  @media (max-width: 540px) {
    .auth-card { padding: 48px 16px; }
    .auth-links { align-items: flex-start; flex-direction: column; }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: .01ms !important;
    }
  }
`;

function getFormValue(form: Record<string, string | File>, name: string) {
  const value = form[name];
  return typeof value === 'string' ? value : '';
}

/**
 * Resolves where to send the browser once the user is signed in. Tries the
 * app-redirect mode first (?next=<absolute-url>, allow-listed by origin via
 * getTrustedOrigins) and falls back to the MCP OAuth resume mode. A request
 * matching neither is not a valid entry point to this page.
 */
function resolveResume(query: string): Resume | null {
  const params = new URLSearchParams(query);
  const next = params.get('next');
  if (next !== null) {
    const url = resolveAppRedirectUrl(next, getTrustedOrigins());
    return url ? { mode: 'app', url } : null;
  }

  const url = resolveOAuthResumeUrl(query, env.API_URL);
  return url ? { mode: 'oauth', url } : null;
}

function loginUrl(input: {
  email?: string;
  error?: string;
  resumeQuery: string;
  step: 'email' | 'otp';
}) {
  const url = new URL('/login', env.API_URL);
  const query = new URLSearchParams(input.resumeQuery);
  query.set('step', input.step);
  if (input.email) query.set('email', input.email);
  if (input.error) query.set('error', input.error);
  url.search = query.toString();
  return url.toString();
}

function PageFrame({
  children,
  title = 'Secure access | Hominem',
}: {
  children: unknown;
  title?: string;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <meta content="#fcfcfd" media="(prefers-color-scheme: light)" name="theme-color" />
        <meta content="#111113" media="(prefers-color-scheme: dark)" name="theme-color" />
        <title>{title}</title>
        <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `const otpInputs = () => Array.from(document.querySelectorAll('[data-otp-digit]'));
const syncOtp = (form) => {
  const hidden = form?.querySelector('[name="otp"]');
  if (hidden instanceof HTMLInputElement) {
    hidden.value = otpInputs().map((digit) => digit.value).join('');
  }
};
const fillOtp = (input, value) => {
  const digits = value.replace(/\\D/g, '');
  const inputs = otpInputs();
  const start = inputs.indexOf(input);
  if (!digits || start < 0) return;
  inputs.slice(start).forEach((digit, index) => {
    digit.value = digits[index] ?? '';
  });
  syncOtp(input.form);
  inputs[Math.min(start + digits.length, inputs.length - 1)]?.focus();
};
document.addEventListener('paste', (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.matches('[data-otp-digit]')) return;
  event.preventDefault();
  fillOtp(input, event.clipboardData?.getData('text') ?? '');
});
document.addEventListener('input', (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.matches('[data-otp-digit]')) return;
  fillOtp(input, input.value);
});`,
          }}
        />
      </head>
      <body>
        <div class="auth-page">
          <div aria-hidden="true" class="auth-grid" />
          {children}
        </div>
      </body>
    </html>
  );
}

function BrandLockup() {
  return (
    <div class="brand-lockup">
      <img alt="Hominem" class="brand-logo" src="/logo.hominem.500x500.webp" />
      <span>Hominem</span>
    </div>
  );
}

function LoginPage({ email, error, resumeQuery, step }: LoginPageProps) {
  const isOtpStep = step === 'otp';
  const changeEmailUrl = loginUrl({ resumeQuery, step: 'email' });

  return (
    <PageFrame>
      <main class="auth-layout">
        <section aria-labelledby="auth-title" class="auth-card">
          <div class="auth-content">
            <div class="auth-heading">
              <h2 id="auth-title">{isOtpStep ? 'Check your email' : 'Auth'}</h2>
              <p class="card-copy">
                {isOtpStep
                  ? `We sent a verification code to ${email}.`
                  : 'Enter your email to receive the one-time code.'}
              </p>
            </div>
            {error ? (
              <p aria-live="polite" class="alert" role="alert">
                {error}
              </p>
            ) : null}
            <form action={isOtpStep ? '/login/verify' : '/login/send'} method="post">
              <input name="resume" type="hidden" value={resumeQuery} />
              {isOtpStep ? (
                <>
                  <input name="email" type="hidden" value={email} />
                  <input id="otp" name="otp" type="hidden" />
                  <div class="otp-field" role="group" aria-label="One-time verification code">
                    {Array.from({ length: 6 }, (_, index) => (
                      <input
                        key={index}
                        aria-label={`Character ${index + 1} of 6`}
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                        autoFocus={index === 0}
                        class="otp-input"
                        data-otp-digit
                        inputMode="numeric"
                        maxLength={1}
                        pattern="[0-9]"
                        required
                        type="text"
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div class="field">
                  <label htmlFor="email">Email address</label>
                  <input
                    autoComplete="email"
                    autoFocus
                    id="email"
                    name="email"
                    required
                    type="email"
                    value={email}
                  />
                </div>
              )}
              <button class="primary-button" type="submit">
                {isOtpStep ? 'Verify' : 'Continue'}
              </button>
            </form>
            {isOtpStep ? (
              <div class="auth-links">
                <form action="/login/send" method="post">
                  <input name="resume" type="hidden" value={resumeQuery} />
                  <input name="email" type="hidden" value={email} />
                  <button class="secondary-button" type="submit">
                    Resend code
                  </button>
                </form>
                <a class="secondary-button" href={changeEmailUrl}>
                  Use a different email
                </a>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </PageFrame>
  );
}

function ConsentPage({ clientName, query, scopes, error }: ConsentPageProps) {
  const groupedScopes = scopes.reduce<Record<string, string[]>>((groups, scope) => {
    const [domain] = scope.split(':');
    (groups[domain ?? 'other'] ??= []).push(scope);
    return groups;
  }, {});

  return (
    <PageFrame title="Authorize access | Hominem">
      <main class="auth-layout">
        <section aria-labelledby="consent-title" class="auth-card">
          <div class="auth-content">
            <div class="auth-heading">
              <h2 id="consent-title">Authorize {clientName}</h2>
              <p class="card-copy">This client is requesting access to your Hominem data.</p>
            </div>
            {error ? (
              <p class="alert" role="alert">
                {error}
              </p>
            ) : null}
            <div class="field">
              <label>Requested permissions</label>
              {Object.entries(groupedScopes).map(([domain, domainScopes]) => (
                <div key={domain} class="card-copy">
                  <strong>{domain}</strong>
                  {(['read', 'write'] as const).map((access) => {
                    const matchingScopes = domainScopes.filter((scope) =>
                      scope.endsWith(`:${access}`),
                    );
                    if (matchingScopes.length === 0) return null;
                    return (
                      <div key={access}>
                        {access}:{' '}
                        {matchingScopes.map((scope) => scope.replace(`${domain}:`, '')).join(', ')}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <form action="/consent/decision" method="post">
              <input name="oauth_query" type="hidden" value={query} />
              <button class="primary-button" name="accept" type="submit" value="true">
                Approve
              </button>
              <button class="secondary-button" name="accept" type="submit" value="false">
                Deny
              </button>
            </form>
          </div>
        </section>
      </main>
    </PageFrame>
  );
}

function resolveConsentQuery(query: string) {
  const params = new URLSearchParams(query);
  const clientId = params.get('client_id');
  const redirectUri = params.get('redirect_uri');
  const signature = params.get('sig');
  const expiry = Number(params.get('exp'));
  if (!clientId || !redirectUri || !signature || !Number.isSafeInteger(expiry)) return null;
  if (expiry <= Math.floor(Date.now() / 1000)) return null;
  const scopes = (params.get('scope') ?? '').split(' ').filter((scope) => MCP_SCOPE_SET.has(scope));
  return { clientId, scopes, query };
}

const MCP_SCOPE_SET = new Set<string>(MCP_SCOPES);

function AuthErrorPage({ description, error, mode }: AuthErrorPageProps) {
  const accessLabel = mode === 'app' ? 'App access' : 'OAuth access';
  const returnCopy =
    mode === 'app'
      ? 'Return to the app you came from and try again.'
      : 'Return to your MCP client and try again.';

  return (
    <PageFrame>
      <main class="auth-layout">
        <section aria-labelledby="error-title" class="auth-card error-card">
          <BrandLockup />
          <div aria-hidden="true" class="error-symbol">
            !
          </div>
          <div class="card-topline">
            <span class="secure-label">{accessLabel}</span>
            <span class="step-label">ERROR</span>
          </div>
          <h2 id="error-title">Authorization stopped</h2>
          <p class="card-copy">
            {description ??
              (error ? `The request ended with ${error}.` : 'This request could not be completed.')}
          </p>
          <p class="card-copy">{returnCopy}</p>
        </section>
      </main>
    </PageFrame>
  );
}

function LogoutPage({ signedOut = false }: { signedOut?: boolean }) {
  return (
    <PageFrame title="Sign out | Hominem">
      <main class="auth-layout">
        <section aria-labelledby="logout-title" class="auth-card logout-card">
          <BrandLockup />
          <h2 id="logout-title">{signedOut ? 'Signed out' : 'Sign out?'}</h2>
          <p class="card-copy">
            {signedOut
              ? 'Your browser session has been cleared.'
              : 'This clears your Hominem browser session.'}
          </p>
          {signedOut ? (
            <p class="card-copy">Start a new sign-in from the app or client you came from.</p>
          ) : (
            <form action="/logout" method="post">
              <button class="primary-button" type="submit">
                Sign me out
              </button>
            </form>
          )}
        </section>
      </main>
    </PageFrame>
  );
}

function copySetCookieHeaders(headers: Headers) {
  const copied = new Headers(headers);
  const setCookies = headers.getSetCookie();
  if (setCookies.length > 0) {
    copied.delete('set-cookie');
    for (const setCookie of setCookies) copied.append('set-cookie', setCookie);
  }
  return copied;
}

async function callBetterAuth(input: {
  body: Record<string, string | boolean>;
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
  .get('/logo.hominem.500x500.webp', async () => {
    const logo = await readFile(logoPath);
    return new Response(logo, {
      headers: {
        'cache-control': 'public, max-age=86400',
        'content-type': 'image/webp',
      },
    });
  })
  .get('/login', async (c) => {
    const url = new URL(c.req.url);
    const resumeQuery = url.searchParams.toString();
    const resume = resolveResume(resumeQuery);
    if (!resume) {
      return c.html(
        <AuthErrorPage
          description="Open the sign-in link from the app or client you came from."
          error="invalid_request"
        />,
        400,
      );
    }

    const session = await betterAuthServer.api.getSession({ headers: c.req.raw.headers });
    if (session) return c.redirect(resume.url);

    const email = url.searchParams.get('email') ?? '';
    const step =
      url.searchParams.get('step') === 'otp' && emailSchema.safeParse(email).success
        ? 'otp'
        : 'email';
    return c.html(
      <LoginPage
        email={email}
        error={url.searchParams.get('error') ?? undefined}
        mode={resume.mode}
        resumeQuery={resumeQuery}
        step={step}
      />,
    );
  })
  .get('/consent', async (c) => {
    const query = new URL(c.req.url).searchParams.toString();
    const consent = resolveConsentQuery(query);
    if (!consent) return c.html(<AuthErrorPage error="invalid_request" />, 400);

    const session = await betterAuthServer.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.redirect(new URL(`/login?${query}`, env.API_URL).toString(), 303);

    const clientResponse = await betterAuthServer.handler(
      new Request(
        `${env.API_URL}/api/auth/oauth2/public-client?client_id=${encodeURIComponent(consent.clientId)}`,
        { headers: c.req.raw.headers },
      ),
    );
    const client = clientResponse.ok
      ? ((await clientResponse.json()) as { name?: string | null })
      : null;

    return c.html(
      <ConsentPage
        clientName={client?.name ?? consent.clientId}
        query={consent.query}
        scopes={consent.scopes}
      />,
    );
  })
  .get('/error', (c) =>
    c.html(
      <AuthErrorPage description={c.req.query('error_description')} error={c.req.query('error')} />,
    ),
  )
  .get('/logout', async (c) => {
    const session = await betterAuthServer.api.getSession({ headers: c.req.raw.headers });
    return c.html(<LogoutPage signedOut={!session} />);
  })
  .post('/logout', async (c) => {
    const response = await callBetterAuth({
      body: {},
      path: '/sign-out',
      request: c.req.raw,
    });
    const pageResponse = await c.html(<LogoutPage signedOut />);
    const headers = copySetCookieHeaders(response.headers);
    headers.set('content-type', pageResponse.headers.get('content-type') ?? 'text/html');
    return new Response(await pageResponse.text(), { status: 200, headers });
  })
  .post('/login/send', async (c) => {
    const form = await c.req.parseBody();
    const email = getFormValue(form, 'email');
    const resumeQuery = getFormValue(form, 'resume');

    if (!resolveResume(resumeQuery) || !emailSchema.safeParse(email).success) {
      return c.redirect(
        loginUrl({ error: 'Enter a valid email address.', resumeQuery, step: 'email' }),
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
          resumeQuery,
          step: 'email',
        }),
        303,
      );
    }

    return c.redirect(loginUrl({ email, resumeQuery, step: 'otp' }), 303);
  })
  .post('/consent/decision', async (c) => {
    const form = await c.req.parseBody();
    const query = getFormValue(form, 'oauth_query');
    const consent = resolveConsentQuery(query);
    if (!consent) return c.html(<AuthErrorPage error="invalid_request" />, 400);

    const accept = getFormValue(form, 'accept') === 'true';
    const response = await callBetterAuth({
      body: { accept, oauth_query: query },
      path: '/oauth2/consent',
      request: c.req.raw,
    });
    if (!response.ok) {
      return c.html(<AuthErrorPage error="access_denied" />, response.status as 400);
    }

    const body = (await response.json().catch(() => null)) as {
      redirect_uri?: string;
      redirect?: boolean;
      url?: string;
    } | null;
    const redirectUrl = body?.redirect_uri ?? (body?.redirect ? body.url : undefined);
    if (!redirectUrl) return c.html(<AuthErrorPage error="server_error" />, 500);
    return c.redirect(redirectUrl, 303);
  })
  .post('/login/verify', async (c) => {
    const form = await c.req.parseBody();
    const email = getFormValue(form, 'email');
    const resumeQuery = getFormValue(form, 'resume');
    const otp = getFormValue(form, 'otp');
    const resume = resolveResume(resumeQuery);

    if (!resume || !emailSchema.safeParse(email).success || !otpSchema.safeParse(otp).success) {
      return c.redirect(
        loginUrl({
          email,
          error: 'Enter the six-digit verification code.',
          resumeQuery,
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
          resumeQuery,
          step: 'otp',
        }),
        303,
      );
    }

    const headers = new Headers(response.headers);
    headers.set('location', resume.url);
    return new Response(null, { headers, status: 303 });
  });
