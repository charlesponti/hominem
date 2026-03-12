import {
  buildAuthCallbackErrorRedirect,
  getAuthCookieDomain,
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
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  user: { id: string; email: string; name?: string | null };
}

interface PasskeyCallbackPayload {
  accessToken: string;
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

function getPayloadAccessToken(payload: VerifySuccessPayload | PasskeyCallbackPayload) {
  if ('access_token' in payload) {
    return payload.accessToken ?? payload.access_token;
  }

  return payload.accessToken;
}

function getPayloadRefreshToken(payload: VerifySuccessPayload | PasskeyCallbackPayload) {
  if ('refresh_token' in payload) {
    return payload.refreshToken ?? payload.refresh_token ?? null;
  }

  return null;
}

function getPayloadExpiresIn(payload: VerifySuccessPayload | PasskeyCallbackPayload) {
  if ('expires_in' in payload) {
    return payload.expiresIn ?? payload.expires_in;
  }

  return null;
}

async function appendTokenCookies(
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
  const accessToken = getPayloadAccessToken(payload);
  const expiresIn = getPayloadExpiresIn(payload);
  const maxAge = typeof expiresIn === 'number' ? `; Max-Age=${expiresIn}` : '';

  if (!accessToken) {
    return;
  }

  headers.append(
    'set-cookie',
    `hominem_access_token=${encodeURIComponent(accessToken)}; Path=/; HttpOnly; SameSite=Lax${maxAge}${domainAttribute}`,
  );

  const refreshToken = getPayloadRefreshToken(payload);
  if (refreshToken) {
    headers.append(
      'set-cookie',
      `hominem_refresh_token=${encodeURIComponent(refreshToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${domainAttribute}`,
    );
  }
}

export function createAuthEntryLoader(config: AuthEntryRouteConfig, getServerAuth: GetServerAuth) {
  return async function loader({ request }: { request: Request }) {
    const { user, headers } = await getServerAuth(request);
    if (user) {
      return redirect(config.defaultRedirect, { headers });
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
      return redirect(config.defaultRedirect, { headers });
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
    if (!(result.accessToken ?? result.access_token)) {
      return { error: 'Verification failed. Missing auth token from server.' };
    }

    const headers = new Headers();
    await appendTokenCookies(headers, response.headers, result);

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

    const next = resolveSafeAuthRedirect(payload.next, config.defaultRedirect, [
      ...config.allowedRedirectPrefixes,
    ]);

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
    await appendTokenCookies(headers, new Headers(), payload);

    return redirect(next, { headers });
  }

  return { action };
}
