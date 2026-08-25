import { emailSchema, loginUrl, type ResumeMode } from './helpers';

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

type PageFrameProps = {
  children: unknown;
  title?: string;
};

export function PageFrame({ children, title = 'Secure access | Hominem' }: PageFrameProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <meta content="#fcfcfd" media="(prefers-color-scheme: light)" name="theme-color" />
        <meta content="#111113" media="(prefers-color-scheme: dark)" name="theme-color" />
        <title>{title}</title>
        <link href="/login.css" rel="stylesheet" />
        <script defer src="/login.js" />
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

export function BrandLockup() {
  return (
    <div class="brand-lockup">
      <img alt="Hominem" class="brand-logo" src="/logo.hominem.500x500.webp" />
      <span>Hominem</span>
    </div>
  );
}

function AnimatedProgressButton({
  children,
  complete,
  message,
  progress,
}: {
  children: unknown;
  complete: boolean;
  message: string;
  progress: number;
}) {
  return (
    <div
      class="progress-button"
      data-complete={String(complete)}
      data-progress-button
      style={`--progress: ${Math.max(0, Math.min(1, progress)) * 100}`}
    >
      <svg
        aria-hidden="true"
        class="progress-button__border"
        preserveAspectRatio="none"
        viewBox="0 0 100 44"
      >
        <rect class="progress-button__track" height="42" rx="6" width="98" x="1" y="1" />
        <rect
          class="progress-button__progress"
          pathLength="100"
          height="42"
          rx="6"
          width="98"
          x="1"
          y="1"
        />
      </svg>
      <span class="progress-button__helper">
        <span
          aria-hidden="true"
          class="progress-button__arrow"
          data-progress-arrow
          hidden={progress === 0}
        >
          ↑
        </span>
        <span data-progress-message>{message}</span>
      </span>
      <div class="progress-button__action">{children}</div>
    </div>
  );
}

export function LoginPage({
  email,
  error,
  resumeQuery,
  step,
}: LoginPageProps & Omit<PageFrameProps, 'children' | 'title'>) {
  const isOtpStep = step === 'otp';
  const changeEmailUrl = loginUrl({ resumeQuery, step: 'email' });
  const progress = isOtpStep ? (email.length > 0 ? 1 : 0) : email.length > 0 ? 0 : 0;

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
              <AnimatedProgressButton
                complete={isOtpStep ? false : emailSchema.safeParse(email).success}
                message={isOtpStep ? 'Enter your 6-digit code' : 'Enter your email'}
                progress={progress}
              >
                <button class="primary-button" type="submit">
                  {isOtpStep ? 'Verify' : 'Continue'}
                </button>
              </AnimatedProgressButton>
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

export function ConsentPage({
  clientName,
  query,
  scopes,
  error,
}: ConsentPageProps & Omit<PageFrameProps, 'children' | 'title'>) {
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

export function AuthErrorPage({
  description,
  error,
  mode,
}: AuthErrorPageProps & Omit<PageFrameProps, 'children' | 'title'>) {
  const isAppMode = mode === 'app' || mode === 'oauth';
  const accessLabel = isAppMode ? 'App access' : 'OAuth access';
  const returnCopy = isAppMode
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
            <p class="secure-label">{accessLabel}</p>
          </div>
          <h2 id="error-title">Authorization stopped</h2>
          <p class="card-copy">
            {description ?? (error ? `The request ended with ${error}.` : null) ?? returnCopy}
          </p>
        </section>
      </main>
    </PageFrame>
  );
}

export function LogoutPage({
  signedOut = false,
}: { signedOut?: boolean } & Omit<PageFrameProps, 'children' | 'title'>) {
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
