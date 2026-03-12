import {
  buildAuthCallbackErrorRedirect,
  resolveSafeAuthRedirect,
} from '@hominem/auth/server';
import { getSetCookieHeaders } from '@hominem/utils/headers';
import { redirect, type ActionFunctionArgs } from 'react-router';

import type {
  AuthEntryRouteConfig,
  AuthEntryServerRouteConfig,
  AuthLogoutRouteConfig,
  AuthPasskeyCallbackRouteConfig,
  AuthVerifyRouteConfig,
  AuthVerifyServerRouteConfig,
  GetServerAuth,
} from './web-auth-routes';

export function withAuthApiBaseUrl<T extends AuthEntryRouteConfig | AuthVerifyRouteConfig>(
  config: T,
  getApiBaseUrl: () => string,
) {
  return {
    ...config,
    getApiBaseUrl,
  };
}

interface VerifySuccessPayload {
  user: { id: string; email: string; name?: string | null };
}

interface PasskeyCallbackPayload {
  next?: string;
}

interface EmailOtpErrorPayload {
  message?: string;
}

interface FormDataReader {
  get(name: string): FormDataEntryValue | null;
}

function hasFormDataGet(value: object): value is FormDataReader {
  return 'get' in value;
}

function appendResponseCookies(headers: Headers, responseHeaders: Headers) {
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
}

export function createAuthEntryLoader(config: AuthEntryRouteConfig, getServerAuth: GetServerAuth) {
  return async function loader({ request }: { request: Request }) {
    const { user, headers } = await getServerAuth(request);
    if (user) {
      const requestUrl = new URL(request.url);
      return redirect(
        resolveSafeAuthRedirect(
          requestUrl.searchParams.get('next'),
          config.defaultRedirect,
          [...config.allowedRedirectPrefixes],
        ),
        { headers },
      );
    }
    return null;
  };
}

export function createAuthEntryAction(config: AuthEntryServerRouteConfig) {
  return async function action({ request }: ActionFunctionArgs) {
    const formData = await request.formData();
    if (!hasFormDataGet(formData)) {
      return { error: 'Invalid form submission' };
    }
    const email = String(formData.get('email') ?? '')
      .trim()
      .toLowerCase();
    const next = String(formData.get('next') ?? config.defaultRedirect);

    if (!email) {
      return { error: 'Email is required' };
    }

    try {
      const response = await fetch(new URL('/api/auth/email-otp/send', config.getApiBaseUrl()), {
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
  };
}

export function createAuthVerifyLoader(
  config: AuthVerifyRouteConfig,
  getServerAuth: GetServerAuth,
) {
  return async function loader({ request }: { request: Request }) {
    const { user, headers } = await getServerAuth(request);
    if (user) {
      const requestUrl = new URL(request.url);
      return redirect(
        resolveSafeAuthRedirect(
          requestUrl.searchParams.get('next'),
          config.defaultRedirect,
          [...config.allowedRedirectPrefixes],
        ),
        { headers },
      );
    }

    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return redirect('/auth');
    }

    return { email };
  };
}

export function createAuthVerifyAction(config: AuthVerifyServerRouteConfig) {
  return async function action({ request }: { request: Request }) {
    const formData = await request.formData();
    if (!hasFormDataGet(formData)) {
      return { error: 'Invalid form submission' };
    }
    const email = String(formData.get('email') ?? '')
      .trim()
      .toLowerCase();
    const otp = String(formData.get('otp') ?? '').replace(/\D/g, '');
    const next = resolveSafeAuthRedirect(
      String(formData.get('next') ?? config.defaultRedirect),
      config.defaultRedirect,
      [...config.allowedRedirectPrefixes],
    );

    if (!email || !otp) {
      return { error: 'Email and verification code are required.' };
    }

    const response = await fetch(new URL('/api/auth/email-otp/verify', config.getApiBaseUrl()), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });

    if (!response.ok) {
      return { error: 'Verification failed. Please check your code and try again.' };
    }

    const result = (await response.json()) as VerifySuccessPayload;
    if (!result.user?.id) {
      return { error: 'Verification failed. Missing auth token from server.' };
    }

    const headers = new Headers();
    appendResponseCookies(headers, response.headers);

    if (!headers.get('set-cookie')) {
      return { error: 'Verification failed. Session cookie was not set.' };
    }

    return redirect(next, { headers });
  };
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
      const response = await fetch(new URL('/api/auth/logout', config.getApiBaseUrl()), {
        method: 'POST',
        headers: upstreamHeaders,
      });
      appendResponseCookies(headers, response.headers);
    } catch {
      void headers;
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

    const next = resolveSafeAuthRedirect(payload.next, config.defaultRedirect, [
      ...config.allowedRedirectPrefixes,
    ]);

    return redirect(next);
  }

  return { action };
}
