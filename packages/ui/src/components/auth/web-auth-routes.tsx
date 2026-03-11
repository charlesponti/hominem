import { readAuthErrorMessage } from '@hominem/auth';
import {
  buildAuthCallbackErrorRedirect,
  getAuthCookieDomain,
  resolveSafeAuthRedirect,
} from '@hominem/auth/server';
import { getSetCookieHeaders } from '@hominem/utils/headers';
import {
  redirect,
  useActionData,
  useLoaderData,
  useLocation,
  type ActionFunctionArgs,
} from 'react-router';

import { usePasskeyAuth } from '../../hooks/use-passkey-auth';
import { AuthScaffold } from './auth-scaffold';
import { EmailEntryForm } from './email-entry-form';
import { OtpVerificationForm } from './otp-verification-form';

interface AuthUser {
  id: string;
  email: string;
  name?: string | null | undefined;
}

interface AuthLoaderResult {
  headers: Headers;
  user: AuthUser | null;
}

interface VerifySuccessPayload {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: { id: string; email: string; name?: string | null };
}

interface PasskeyCallbackPayload {
  accessToken: string;
  next?: string;
}

interface EmailOtpErrorPayload {
  message?: string;
}

type GetServerAuth = (request: Request) => Promise<AuthLoaderResult>;

interface SharedAuthRouteConfig {
  apiBaseUrl: string;
  defaultRedirect: string;
  getServerAuth: GetServerAuth;
}

interface AuthEntryRouteConfig extends SharedAuthRouteConfig {
  title: string;
  description: string;
}

interface AuthVerifyRouteConfig extends SharedAuthRouteConfig {
  allowedRedirectPrefixes: readonly string[];
}

interface AuthLogoutRouteConfig {
  apiBaseUrl: string;
}

interface AuthPasskeyCallbackRouteConfig {
  allowedRedirectPrefixes: readonly string[];
  defaultRedirect: string;
}

function appendTokenCookies(
  headers: Headers,
  responseHeaders: Headers,
  payload: VerifySuccessPayload | PasskeyCallbackPayload,
) {
  const setCookieValues = getSetCookieHeaders(responseHeaders);
  if (setCookieValues.length > 0) {
    for (const value of setCookieValues) {
      headers.append('set-cookie', value);
    }
  } else {
    const setCookie = responseHeaders.get('set-cookie');
    if (setCookie) {
      headers.append('set-cookie', setCookie);
    }
  }

  const cookieDomain = getAuthCookieDomain();
  const domainAttribute = cookieDomain ? `; Domain=${cookieDomain}` : '';
  const maxAge =
    'expiresIn' in payload && typeof payload.expiresIn === 'number'
      ? `; Max-Age=${payload.expiresIn}`
      : '';

  headers.append(
    'set-cookie',
    `hominem_access_token=${encodeURIComponent(payload.accessToken)}; Path=/; HttpOnly; SameSite=Lax${maxAge}${domainAttribute}`,
  );

  if ('refreshToken' in payload && payload.refreshToken) {
    headers.append(
      'set-cookie',
      `hominem_refresh_token=${encodeURIComponent(payload.refreshToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${domainAttribute}`,
    );
  }
}

export function createAuthEntryRoute(config: AuthEntryRouteConfig) {
  async function loader({ request }: { request: Request }) {
    const { user, headers } = await config.getServerAuth(request);
    if (user) {
      return redirect(config.defaultRedirect, { headers });
    }
    return null;
  }

  async function action({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const next = String(formData.get('next') ?? config.defaultRedirect);

    if (!email) {
      return { error: 'Email is required' };
    }

    try {
      const response = await fetch(new URL('/api/auth/email-otp/send', config.apiBaseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'sign-in' }),
      });

      if (!response.ok) {
        const error = (await response.json()) as EmailOtpErrorPayload;
        return { error: error.message || 'Failed to send verification code' };
      }

      return redirect(
        `/auth/verify?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`,
      );
    } catch {
      return { error: 'Failed to send verification code' };
    }
  }

  function Component() {
    const actionData = useActionData<typeof action>();
    const location = useLocation();
    const {
      authenticate,
      isLoading: isPasskeyLoading,
      error: passkeyError,
      isSupported: isPasskeySupported,
    } = usePasskeyAuth({ redirectTo: config.defaultRedirect });
    const callbackError = readAuthErrorMessage(new URLSearchParams(location.search));
    const resolvedError = actionData?.error ?? callbackError ?? passkeyError ?? undefined;

    const handlePasskeyAuth = async () => {
      await authenticate();
    };

    const emailEntryProps = {
      action: '/auth',
      ...(resolvedError ? { error: resolvedError } : {}),
      ...(isPasskeySupported ? { onPasskeyClick: handlePasskeyAuth } : {}),
      ...(isPasskeyLoading ? { loadingMessage: 'Authenticating with passkey...' } : {}),
    };

    return (
      <AuthScaffold title={config.title} description={config.description}>
        <EmailEntryForm {...emailEntryProps} />
      </AuthScaffold>
    );
  }

  return { action, Component, loader };
}

export function createAuthVerifyRoute(config: AuthVerifyRouteConfig) {
  async function loader({ request }: { request: Request }) {
    const { user, headers } = await config.getServerAuth(request);
    if (user) {
      return redirect(config.defaultRedirect, { headers });
    }

    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return redirect('/auth');
    }

    return { email };
  }

  async function action({ request }: { request: Request }) {
    const formData = await request.formData();
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const otp = String(formData.get('otp') ?? '').replace(/\D/g, '');
    const next = resolveSafeAuthRedirect(
      String(formData.get('next') ?? config.defaultRedirect),
      config.defaultRedirect,
      [...config.allowedRedirectPrefixes],
    );

    if (!email || !otp) {
      return { error: 'Email and verification code are required.' };
    }

    const response = await fetch(new URL('/api/auth/email-otp/verify', config.apiBaseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });

    if (!response.ok) {
      return { error: 'Verification failed. Please check your code and try again.' };
    }

    const result = (await response.json()) as VerifySuccessPayload;
    if (!result.accessToken) {
      return { error: 'Verification failed. Missing auth token from server.' };
    }

    const headers = new Headers();
    appendTokenCookies(headers, response.headers, result);

    return redirect(next, { headers });
  }

  function Component() {
    const { email } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();
    const location = useLocation();

    return (
      <AuthScaffold title="Enter code" description="We sent a code to your email">
        <OtpVerificationForm
          action={`/auth/verify${location.search}`}
          email={email}
          defaultNext={config.defaultRedirect}
          error={actionData?.error ?? undefined}
          onChangeEmail={() => {
            window.location.href = '/auth';
          }}
        />
      </AuthScaffold>
    );
  }

  return { action, Component, loader };
}

export function createAuthLogoutRoute(config: AuthLogoutRouteConfig) {
  async function action({ request }: { request: Request }) {
    const headers = new Headers();
    const upstreamHeaders = new Headers();
    const cookieHeader = request.headers.get('cookie');

    if (cookieHeader) {
      upstreamHeaders.set('cookie', cookieHeader);
    }

    try {
      const response = await fetch(new URL('/api/auth/logout', config.apiBaseUrl), {
        method: 'POST',
        headers: upstreamHeaders,
      });
      for (const value of getSetCookieHeaders(response.headers)) {
        headers.append('set-cookie', value);
      }
    } catch {
      const cookieDomain = getAuthCookieDomain();
      const domainAttribute = cookieDomain ? `; Domain=${cookieDomain}` : '';
      headers.append(
        'set-cookie',
        `hominem_access_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${domainAttribute}`,
      );
      headers.append(
        'set-cookie',
        `hominem_refresh_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${domainAttribute}`,
      );
    }

    return redirect('/auth', { headers });
  }

  async function loader() {
    return redirect('/auth');
  }

  return { action, loader };
}

export function createAuthPasskeyCallbackRoute(config: AuthPasskeyCallbackRouteConfig) {
  async function action({ request }: { request: Request }) {
    let payload: PasskeyCallbackPayload;
    try {
      payload = (await request.json()) as PasskeyCallbackPayload;
    } catch {
      return redirect(
        buildAuthCallbackErrorRedirect({
          next: null,
          fallback: config.defaultRedirect,
          allowedPrefixes: [...config.allowedRedirectPrefixes],
          description: 'Passkey sign-in failed. Please try again.',
        }),
      );
    }

    const next = resolveSafeAuthRedirect(
      payload.next,
      config.defaultRedirect,
      [...config.allowedRedirectPrefixes],
    );

    if (!payload.accessToken) {
      return redirect(
        buildAuthCallbackErrorRedirect({
          next: payload.next,
          fallback: config.defaultRedirect,
          allowedPrefixes: [...config.allowedRedirectPrefixes],
          description: 'Passkey sign-in failed. Please try again.',
        }),
      );
    }

    const headers = new Headers();
    appendTokenCookies(headers, new Headers(), payload);

    return redirect(next, { headers });
  }

  return { action };
}
