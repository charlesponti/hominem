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

const pageStyles = `
  :root {
    color-scheme: dark;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #0c1014;
    color: #f3f0e8;
    font-synthesis: none;
    text-rendering: optimizeLegibility;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    min-width: 320px;
    min-height: 100vh;
    background: #0c1014;
  }

  button, input { font: inherit; }

  .auth-page {
    isolation: isolate;
    min-height: 100vh;
    overflow: hidden;
    position: relative;
    display: grid;
    place-items: center;
    padding: 32px 20px;
  }

  .auth-page::before {
    content: "";
    position: absolute;
    z-index: -2;
    width: min(680px, 90vw);
    aspect-ratio: 1;
    top: -28%;
    left: -18%;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(244, 20, 143, .16), transparent 64%);
    filter: blur(12px);
    animation: drift 14s ease-in-out infinite alternate;
  }

  .auth-page::after {
    content: "";
    position: absolute;
    z-index: -2;
    width: min(620px, 90vw);
    aspect-ratio: 1;
    right: -22%;
    bottom: -35%;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(88, 120, 255, .13), transparent 65%);
    filter: blur(18px);
    animation: drift 18s ease-in-out infinite alternate-reverse;
  }

  .auth-grid {
    position: absolute;
    inset: 0;
    z-index: -1;
    opacity: .25;
    background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent);
  }

  .auth-layout {
    width: min(100%, 1040px);
    display: grid;
    grid-template-columns: minmax(0, .92fr) minmax(380px, 460px);
    align-items: center;
    gap: clamp(44px, 8vw, 120px);
    animation: enter .7s cubic-bezier(.22, 1, .36, 1) both;
  }

  .auth-intro { padding: 20px 0; }

  .brand-lockup {
    display: inline-flex;
    align-items: center;
    gap: 11px;
    color: #f3f0e8;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: .04em;
  }

  .brand-mark {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    border: 1px solid rgba(244, 20, 143, .75);
    border-radius: 9px;
    color: #0c1014;
    background: #f4148f;
    box-shadow: 0 0 28px rgba(244, 20, 143, .18);
    font-size: 17px;
    font-weight: 900;
    transform: rotate(-8deg);
  }

  .eyebrow {
    margin: clamp(54px, 10vh, 112px) 0 18px;
    color: #f4148f;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .16em;
    text-transform: uppercase;
  }

  .auth-intro h1 {
    max-width: 520px;
    margin: 0;
    color: #f3f0e8;
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(42px, 6vw, 74px);
    font-weight: 400;
    letter-spacing: -.055em;
    line-height: .96;
  }

  .intro-copy {
    max-width: 390px;
    margin: 28px 0 0;
    color: #8f9ba7;
    font-size: 16px;
    line-height: 1.65;
  }

  .signal {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 42px;
    color: #7e8993;
    font-size: 12px;
    letter-spacing: .02em;
  }

  .signal-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #f4148f;
    box-shadow: 0 0 0 5px rgba(244, 20, 143, .08), 0 0 18px rgba(244, 20, 143, .65);
    animation: pulse 2.4s ease-in-out infinite;
  }

  .auth-card {
    position: relative;
    overflow: hidden;
    padding: clamp(28px, 5vw, 46px);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 28px;
    color: #20231f;
    background: #f3f0e8;
    box-shadow: 0 30px 100px rgba(0,0,0,.32), 0 2px 0 rgba(255,255,255,.14) inset;
  }

  .auth-card::before {
    content: "";
    position: absolute;
    width: 230px;
    height: 230px;
    top: -130px;
    right: -80px;
    border-radius: 50%;
    background: #f4148f;
    opacity: .5;
    filter: blur(1px);
  }

  .card-topline {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 46px;
    color: #687168;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .12em;
    text-transform: uppercase;
  }

  .secure-label { display: inline-flex; align-items: center; gap: 7px; }
  .secure-label::before { display: none; }
  .step-label { color: #9aa199; }

  .auth-card h2 {
    position: relative;
    margin: 0;
    color: #20231f;
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(31px, 4vw, 43px);
    font-weight: 400;
    letter-spacing: -.05em;
    line-height: 1;
  }

  .card-copy {
    position: relative;
    margin: 14px 0 30px;
    color: #697168;
    font-size: 14px;
    line-height: 1.55;
  }

  .card-copy strong { color: #20231f; font-weight: 650; }

  .alert {
    position: relative;
    margin: 0 0 20px;
    padding: 12px 14px;
    border: 1px solid rgba(174, 62, 49, .25);
    border-radius: 12px;
    color: #8e3329;
    background: #fff0ed;
    font-size: 13px;
    line-height: 1.45;
  }

  .field { position: relative; display: grid; gap: 9px; }
  .field label { color: #4d574e; font-size: 12px; font-weight: 750; letter-spacing: .02em; }
  .field input {
    width: 100%;
    min-height: 54px;
    padding: 0 16px;
    border: 1px solid #d2d6cc;
    border-radius: 12px;
    outline: none;
    color: #20231f;
    background: rgba(255,255,255,.7);
    transition: border-color .2s, box-shadow .2s, background .2s;
  }
  .field input:hover { border-color: #aab2a7; }
  .field input:focus { border-color: #d4147c; background: #fff; box-shadow: 0 0 0 4px rgba(244, 20, 143, .24); }
  .otp-input { font-size: 25px; font-weight: 700; letter-spacing: .28em; text-align: center; }

  .primary-button {
    width: 100%;
    min-height: 54px;
    margin-top: 18px;
    border: 0;
    border-radius: 12px;
    cursor: pointer;
    color: #17200f;
    background: #f4148f;
    box-shadow: 0 8px 18px rgba(196, 14, 113, .16);
    font-size: 14px;
    font-weight: 800;
    transition: transform .2s, box-shadow .2s, background .2s;
  }
  .primary-button:hover { background: #ff48ad; box-shadow: 0 12px 26px rgba(196, 14, 113, .24); transform: translateY(-2px); }
  .primary-button:active { transform: translateY(0); }
  .primary-button:focus-visible, .secondary-button:focus-visible { outline: 3px solid #d4147c; outline-offset: 3px; }

  .secondary-button {
    display: block;
    margin: 20px auto 0;
    padding: 4px 8px;
    border: 0;
    cursor: pointer;
    color: #697168;
    background: transparent;
    font-size: 12px;
    font-weight: 700;
  }
  .secondary-button:hover { color: #20231f; }

  .card-footnote {
    position: relative;
    margin: 28px 0 0;
    color: #92998f;
    font-size: 11px;
    line-height: 1.5;
    text-align: center;
  }

  .error-card { text-align: center; }
  .error-symbol { position: relative; display: grid; place-items: center; width: 54px; height: 54px; margin: 0 auto 28px; border: 1px solid #d2d6cc; border-radius: 16px; color: #8e3329; background: #fff0ed; font-size: 22px; }
  .error-card .card-copy { max-width: 320px; margin-right: auto; margin-left: auto; }
.error-card a { display: inline-flex; align-items: center; justify-content: center; min-height: 50px; width: 100%; border-radius: 12px; color: #fff; background: #f4148f; font-size: 14px; font-weight: 800; text-decoration: none; }
  .logout-card { text-align: center; }
  .logout-card .brand-mark { margin: 0 auto 28px; }

  @keyframes enter { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes drift { from { transform: translate3d(-2%, -2%, 0) scale(1); } to { transform: translate3d(5%, 4%, 0) scale(1.08); } }
  @keyframes pulse { 50% { opacity: .45; transform: scale(.75); } }

  @media (max-width: 780px) {
    .auth-page { padding: 24px 16px; }
    .auth-layout { grid-template-columns: 1fr; gap: 28px; max-width: 500px; }
    .auth-intro { padding: 0; }
    .eyebrow { margin: 42px 0 14px; }
    .auth-intro h1 { font-size: clamp(42px, 13vw, 64px); }
    .intro-copy { margin-top: 18px; font-size: 14px; }
    .signal { margin-top: 24px; }
    .auth-card { border-radius: 22px; }
    .card-topline { margin-bottom: 34px; }
  }

  @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: .01ms !important; }
   }

   /* Career auth surface: quiet neutral card, semantic app tokens, no brand accent. */
   :root {
     color-scheme: light;
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
   .auth-page { background: var(--auth-background); color: var(--auth-text); padding: 64px 16px; }
   .auth-layout { width: min(100%, 512px); }
   .auth-card {
     padding: 64px 48px;
     border: 1px solid var(--auth-border);
     border-radius: 8px;
     color: var(--auth-text);
     background: var(--auth-card);
     box-shadow: 0 10px 25px rgba(0, 0, 0, .08);
   }
   .auth-content { width: 100%; max-width: 384px; margin: 0 auto; display: flex; flex-direction: column; gap: 80px; text-align: center; }
   .auth-heading { display: flex; flex-direction: column; gap: 8px; text-align: left; }
   .auth-heading h2 { margin: 0; }
   .auth-card::before { display: none; }
   .auth-page::before, .auth-page::after, .auth-grid { display: none; }
   .auth-intro { display: none; }
   .auth-card .brand-lockup { margin-bottom: 32px; color: var(--auth-text); }
   .brand-logo { width: 32px; height: 32px; border-radius: 8px; object-fit: cover; filter: grayscale(1); }
   .card-topline { margin-bottom: 16px; color: var(--auth-muted); font-weight: 500; letter-spacing: .04em; }
   .step-label { color: var(--auth-tertiary); }
   .auth-card h2 { color: var(--auth-text); font-family: Inter, ui-sans-serif, system-ui, sans-serif; font-size: 30px; font-weight: 600; letter-spacing: -.04em; }
   .card-copy { margin: 0; color: var(--auth-muted); }
   .card-copy strong { color: var(--auth-text); }
   .field { gap: 6px; text-align: left; }
   .field label { color: var(--auth-text); font-weight: 500; }
   .field input {
     min-height: 36px;
     border: 1px solid var(--auth-border);
     border-radius: 6px;
     color: var(--auth-text);
     background: var(--auth-panel);
   }
   .field input:hover { border-color: var(--auth-muted); }
   .field input:focus { border-color: var(--auth-primary); background: var(--auth-card); box-shadow: 0 0 0 2px color-mix(in srgb, var(--auth-primary) 20%, transparent); }
   .otp-field { display: flex; align-items: center; justify-content: center; gap: 8px; }
   .otp-input { width: 40px; height: 48px; min-height: 48px; padding: 0; text-align: center; font-size: 16px; font-weight: 600; }
   .primary-button {
     min-height: 36px;
     margin-top: 12px;
     border-radius: 6px;
     color: var(--auth-primary-text);
     background: var(--auth-primary);
     box-shadow: none;
     font-weight: 600;
   }
   .primary-button:hover { background: color-mix(in srgb, var(--auth-primary) 86%, var(--auth-text)); box-shadow: none; transform: none; }
   .primary-button:focus-visible, .secondary-button:focus-visible { outline: 2px solid var(--auth-primary); outline-offset: 2px; }
   .auth-links { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 14px; }
   .auth-links form { display: contents; }
   .secondary-button { margin: 0; padding: 0; color: var(--auth-primary); font-size: 14px; font-weight: 500; }
   .secondary-button:hover { color: var(--auth-text); }
   .alert { border-color: color-mix(in srgb, var(--auth-danger) 35%, transparent); border-radius: 6px; color: var(--auth-danger); background: var(--auth-danger-background); }
   .error-symbol { border-color: var(--auth-border); border-radius: 8px; color: var(--auth-danger); background: var(--auth-danger-background); }
   .error-card a { border-radius: 6px; color: var(--auth-primary-text); background: var(--auth-primary); }
   .card-footnote { color: var(--auth-tertiary); }
   .logout-card .brand-mark { width: 42px; height: 42px; margin: 0 auto 28px; border: 0; border-radius: 12px; object-fit: cover; transform: none; }
   @media (max-width: 540px) {
     .auth-card { padding: 48px 16px; }
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
