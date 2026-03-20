import { getSetCookieHeaders } from '@hominem/utils/headers';
import { vi } from 'vitest';

export interface AppRequester {
  request: (input: string | URL | Request, init?: RequestInit) => Response | Promise<Response>;
}

interface OtpResponse {
  otp: string;
}

type ApiEnv = typeof import('../../env').env;

let authTestSequence = 0;

export function createAuthTestEmail(prefix: string) {
  authTestSequence += 1;
  const workerId = process.env.VITEST_WORKER_ID ?? '0';
  return `${prefix}-${workerId}-${authTestSequence}@hominem.test`;
}

export async function importServer() {
  const module = await import('../../server');
  return module.createServer;
}

export async function importServerWithEnv(envOverrides: Partial<ApiEnv>) {
  vi.resetModules();
  vi.doMock('../../env', async () => {
    const actual = await vi.importActual<typeof import('../../env')>('../../env');
    return {
      ...actual,
      env: new Proxy(actual.env, {
        get(target, prop, receiver) {
          if (
            typeof prop === 'string' &&
            Object.prototype.hasOwnProperty.call(envOverrides, prop)
          ) {
            return envOverrides[prop as keyof ApiEnv];
          }

          return Reflect.get(target, prop, receiver);
        },
      }),
    };
  });

  try {
    const module = await import('../../server');
    return module.createServer;
  } finally {
    vi.doUnmock('../../env');
  }
}

export async function requestOtp(app: AppRequester, email: string) {
  return app.request('http://localhost/api/auth/email-otp/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      type: 'sign-in',
    }),
  });
}

export async function fetchOtp(app: AppRequester, email: string) {
  const response = await app.request(
    `http://localhost/api/auth/test/otp/latest?email=${encodeURIComponent(email)}&type=sign-in`,
    {
      method: 'GET',
      headers: {
        'x-e2e-auth-secret': 'otp-secret',
      },
    },
  );

  if (response.status !== 200) {
    throw new Error(`Expected OTP fetch to succeed for ${email}, got ${response.status}`);
  }

  const payload = (await response.json()) as OtpResponse;
  if (!payload.otp) {
    throw new Error(`Expected OTP payload for ${email}`);
  }

  return payload;
}

export function toCookieHeader(setCookieValues: string[]) {
  return setCookieValues
    .map((value) => value.split(';')[0]?.trim())
    .filter((value): value is string => Boolean(value && value.length > 0))
    .join('; ');
}

export async function signInWithEmailOtp(app: AppRequester, email: string) {
  const otpRequest = await requestOtp(app, email);
  if (otpRequest.status !== 200) {
    throw new Error(`Expected OTP request to succeed for ${email}, got ${otpRequest.status}`);
  }
  const otp = await fetchOtp(app, email);
  const response = await app.request('http://localhost/api/auth/email-otp/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email,
      otp: otp.otp,
    }),
  });

  if (response.status !== 200) {
    throw new Error(`Expected OTP verification to succeed for ${email}, got ${response.status}`);
  }

  return {
    response,
    cookieHeader: toCookieHeader(getSetCookieHeaders(response.headers)),
    otp,
  };
}

export function requestJson(input: {
  app: AppRequester;
  path: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}) {
  return input.app.request(`http://localhost${input.path}`, {
    method: input.method ?? 'GET',
    ...(input.headers ? { headers: input.headers } : {}),
    ...(input.body
      ? {
          body: JSON.stringify(input.body),
          headers: {
            'content-type': 'application/json',
            ...input.headers,
          },
        }
      : {}),
  });
}
