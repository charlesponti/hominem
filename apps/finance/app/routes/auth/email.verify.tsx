import { Form, redirect, useSearchParams } from 'react-router';

import { serverEnv } from '~/lib/env';

interface ActionData {
  error?: string;
}

interface VerifyPayload {
  email: string;
  otp: string;
  name: string;
}

interface VerifySuccessPayload {
  token?: string;
  user?: {
    id?: string;
  };
}

interface SessionPayload {
  accessToken?: string | null;
}

function parseCookiePair(setCookieValue: string) {
  const [pair] = setCookieValue.split(';');
  return pair?.trim() ?? '';
}

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  if (!email) {
    return redirect('/auth/email');
  }
  return null;
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const verifyInput: VerifyPayload = {
    email: String(formData.get('email') ?? ''),
    otp: String(formData.get('otp') ?? ''),
    name: String(formData.get('name') ?? 'Finance User'),
  };

  if (!verifyInput.email || !verifyInput.otp) {
    return { error: 'Email and verification code are required.' };
  }

  const response = await fetch(`${serverEnv.VITE_PUBLIC_API_URL}/api/auth/email-otp/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(verifyInput),
  });

  if (!response.ok) {
    return { error: 'Verification failed. Please check your code and try again.' };
  }

  const verifyResult = (await response.json()) as VerifySuccessPayload;
  if (!verifyResult.token) {
    return { error: 'Verification failed. Missing auth token from server.' };
  }

  const headers = new Headers();
  const setCookieValues: string[] = [];
  const getSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  if (typeof getSetCookie === 'function') {
    for (const value of getSetCookie.call(response.headers)) {
      setCookieValues.push(value);
      headers.append('set-cookie', value);
    }
  } else {
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      setCookieValues.push(setCookie);
      headers.append('set-cookie', setCookie);
    }
  }

  let accessToken: string | null = null;
  const upstreamCookieHeader = setCookieValues.map(parseCookiePair).filter(Boolean).join('; ');
  if (upstreamCookieHeader) {
    const sessionResponse = await fetch(`${serverEnv.VITE_PUBLIC_API_URL}/api/auth/session`, {
      method: 'GET',
      headers: {
        cookie: upstreamCookieHeader,
      },
    });
    if (sessionResponse.ok) {
      const sessionPayload = (await sessionResponse.json()) as SessionPayload;
      if (sessionPayload.accessToken) {
        accessToken = sessionPayload.accessToken;
      }
    }
  }

  if (!accessToken && verifyResult.user?.id) {
    const devTokenResponse = await fetch(`${serverEnv.VITE_PUBLIC_API_URL}/api/auth/dev/issue-token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: verifyResult.user.id }),
    });
    if (devTokenResponse.ok) {
      const devTokenPayload = (await devTokenResponse.json()) as { accessToken?: string };
      if (devTokenPayload.accessToken) {
        accessToken = devTokenPayload.accessToken;
      }
    }
  }

  if (!accessToken && verifyResult.token) {
    accessToken = verifyResult.token;
  }

  if (!accessToken) {
    return { error: 'Verification failed. Session token was not issued.' };
  }

  headers.append(
    'set-cookie',
    `hominem_access_token=${encodeURIComponent(accessToken)}; Path=/; HttpOnly; SameSite=Lax`,
  );

  return redirect('/finance', { headers });
}

export default function EmailVerifyPage({
  actionData,
}: {
  actionData?: ActionData;
}) {
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0a',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '30px', fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
            Verify Email Code
          </h2>
          <p style={{ color: '#9ca3af' }}>Enter the verification code sent to your email.</p>
        </div>

        <Form method="post" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input type="hidden" name="email" value={email} />

          <div>
            <label
              htmlFor="otp"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#d1d5db',
                marginBottom: '4px',
              }}
            >
              Verification code
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              required
              autoComplete="one-time-code"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #374151',
                backgroundColor: '#1f2937',
                color: '#fff',
                outline: 'none',
              }}
              placeholder="123456"
            />
          </div>

          <div>
            <label
              htmlFor="name"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#d1d5db',
                marginBottom: '4px',
              }}
            >
              Display name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue="Finance User"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #374151',
                backgroundColor: '#1f2937',
                color: '#fff',
                outline: 'none',
              }}
            />
          </div>

          {actionData?.error && (
            <div style={{ fontSize: '14px', color: '#ef4444' }}>{actionData.error}</div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#3b82f6',
              color: '#fff',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Verify and Sign In
          </button>
        </Form>
      </div>
    </div>
  );
}
