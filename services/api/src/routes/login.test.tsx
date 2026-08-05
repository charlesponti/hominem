import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  handler: vi.fn(),
}));

vi.mock('../auth/better-auth', () => ({
  betterAuthServer: {
    api: { getSession: mocks.getSession },
    handler: mocks.handler,
  },
  getTrustedOrigins: () => ['https://labs.ponti.io'],
}));

vi.mock('../env', () => ({
  env: {
    API_URL: 'http://localhost:4040',
  },
}));

import { loginRoutes } from './login';

const oauthQuery = new URLSearchParams({
  client_id: 'codex',
  redirect_uri: 'http://localhost:61531/callback',
  response_type: 'code',
  state: 'state-123',
}).toString();

function createApp() {
  return new Hono().route('/', loginRoutes);
}

describe('API login route', () => {
  beforeEach(() => {
    mocks.getSession.mockReset();
    mocks.handler.mockReset();
    mocks.getSession.mockResolvedValue(null);
  });

  it('renders the API-hosted OTP form for an OAuth authorization request', async () => {
    const response = await createApp().request(`http://localhost/login?${oauthQuery}`);

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain('Enter your email to continue.');
    expect(mocks.getSession).toHaveBeenCalledOnce();
  });

  it('rejects a login request without a valid OAuth authorization query', async () => {
    const response = await createApp().request('http://localhost/login');

    expect(response.status).toBe(400);
    await expect(response.text()).resolves.toContain(
      'Open the sign-in link from the app or client you came from.',
    );
  });

  it('renders the OTP form for an allow-listed app redirect request', async () => {
    const next = encodeURIComponent('https://labs.ponti.io/games/realitea');
    const response = await createApp().request(`http://localhost/login?next=${next}`);

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain('Enter your email to continue.');
  });

  it('rejects an app redirect request to a non-allow-listed origin', async () => {
    const next = encodeURIComponent('https://evil.example/steal');
    const response = await createApp().request(`http://localhost/login?next=${next}`);

    expect(response.status).toBe(400);
  });

  it('serves the Hominem logo used by the auth card', async () => {
    const response = await createApp().request('http://localhost/logo.hominem.500x500.webp');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it('sends the OTP through Better Auth and advances to verification', async () => {
    mocks.handler.mockResolvedValue(new Response(null, { status: 200 }));
    const response = await createApp().request('http://localhost/login/send', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ email: 'mcp@example.com', resume: oauthQuery }).toString(),
    });

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toContain('step=otp');
    const request = mocks.handler.mock.calls[0]?.[0] as Request;
    expect(request.url).toContain('/api/auth/email-otp/send-verification-otp');
    await expect(request.json()).resolves.toEqual({ email: 'mcp@example.com', type: 'sign-in' });
  });

  it('keeps Better Auth session cookies while resuming OAuth authorization', async () => {
    mocks.handler.mockResolvedValue(
      new Response(null, {
        headers: {
          location: 'http://127.0.0.1:60693/callback/complete',
          'set-cookie': 'better-auth.session_token=session-token; Path=/; HttpOnly',
        },
        status: 302,
      }),
    );
    const response = await createApp().request('http://localhost/login/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        email: 'mcp@example.com',
        resume: oauthQuery,
        otp: '123456',
      }).toString(),
    });

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toContain('/api/auth/mcp/authorize?');
    expect(response.headers.get('set-cookie')).toContain('better-auth.session_token=session-token');
    const request = mocks.handler.mock.calls[0]?.[0] as Request;
    expect(request.url).toContain('/api/auth/sign-in/email-otp');
  });

  it('renders a signed-out state when no browser session exists', async () => {
    const response = await createApp().request('http://localhost/logout');

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain('Signed out');
  });

  it('clears the Better Auth session and renders the logout confirmation', async () => {
    mocks.handler.mockResolvedValue(
      new Response(null, {
        headers: {
          'set-cookie': 'better-auth.session_token=; Max-Age=0; Path=/; HttpOnly',
        },
        status: 200,
      }),
    );

    const response = await createApp().request('http://localhost/logout', { method: 'POST' });

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    await expect(response.text()).resolves.toContain('Signed out');
    const request = mocks.handler.mock.calls[0]?.[0] as Request;
    expect(request.url).toContain('/api/auth/sign-out');
  });
});
