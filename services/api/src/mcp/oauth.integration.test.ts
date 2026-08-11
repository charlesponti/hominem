import { createHash, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { importServerWithEnv } from '../routes/test-helpers/auth';

const apiUrl = 'http://localhost:4040';
const redirectUri = `http://127.0.0.1:60693/callback/${randomUUID()}`;
const userEmail = 'mcp-oauth-integration@hominem.test';
const otp = '000000';

type CreateServer = (options?: { middleware?: unknown[] }) => {
  request: (input: string | URL, init?: RequestInit) => Promise<Response>;
};

function createCookieJar() {
  const cookies = new Map<string, string>();

  return {
    clear() {
      cookies.clear();
    },
    header() {
      return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
    },
    update(response: Response) {
      for (const setCookie of response.headers.getSetCookie()) {
        const [cookie] = setCookie.split(';', 1);
        const separator = cookie.indexOf('=');
        if (separator > 0) {
          cookies.set(cookie.slice(0, separator), cookie.slice(separator + 1));
        }
      }
    },
  };
}

function formBody(values: Record<string, string>) {
  return new URLSearchParams(values).toString();
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

describe('MCP OAuth integration', () => {
  let app: ReturnType<CreateServer>;
  const cookies = createCookieJar();

  beforeAll(async () => {
    const createServer = (await importServerWithEnv({
      NODE_ENV: 'test',
      AUTH_E2E_ENABLED: 'true',
      AUTH_E2E_SECRET: 'otp-secret',
    })) as CreateServer;
    app = createServer();
  });

  afterAll(() => {
    cookies.clear();
  });

  it('completes discovery, API-hosted OTP login, PKCE, MCP access, and refresh', async () => {
    const protectedResourceResponse = await app.request(
      `${apiUrl}/.well-known/oauth-protected-resource/api/mcp`,
    );
    expect(protectedResourceResponse.status).toBe(200);
    await expect(protectedResourceResponse.json()).resolves.toMatchObject({
      resource: `${apiUrl}/api/mcp`,
      scopes_supported: expect.arrayContaining(['career:read']),
    });

    const authorizationServerResponse = await app.request(
      `${apiUrl}/.well-known/oauth-authorization-server`,
    );
    const authorizationServer = await readJson<{
      authorization_endpoint: string;
      token_endpoint: string;
      scopes_supported: string[];
    }>(authorizationServerResponse);
    expect(authorizationServer.scopes_supported).toContain('career:read');

    const registrationResponse = await app.request(`${apiUrl}/api/auth/mcp/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Hominem MCP OAuth integration test',
        redirect_uris: [redirectUri],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
      }),
    });
    expect(registrationResponse.status).toBe(201);
    const registration = await readJson<{ client_id: string }>(registrationResponse);
    expect(registration.client_id).toBeTruthy();

    // Create the test user through the same Better Auth-backed test helper used by mobile e2e.
    const e2eLoginResponse = await app.request(`${apiUrl}/api/auth/mobile/e2e/login`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-e2e-auth-secret': 'otp-secret',
      },
      body: JSON.stringify({ email: userEmail, name: 'MCP OAuth Integration User' }),
    });
    expect(e2eLoginResponse.status).toBe(200);
    cookies.update(e2eLoginResponse);
    cookies.clear();

    const codeVerifier = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
    const state = randomUUID();
    const authorizationQuery = formBody({
      response_type: 'code',
      client_id: registration.client_id,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      redirect_uri: redirectUri,
      scope: 'openid profile email offline_access career:read',
      resource: `${apiUrl}/api/mcp`,
    });

    const initialAuthorizationResponse = await app.request(
      `${authorizationServer.authorization_endpoint}?${authorizationQuery}`,
    );
    expect(initialAuthorizationResponse.status).toBe(302);
    cookies.update(initialAuthorizationResponse);
    const loginLocation = initialAuthorizationResponse.headers.get('location');
    expect(loginLocation).toContain('/login?');

    const loginPageResponse = await app.request(new URL(loginLocation!, apiUrl), {
      headers: { cookie: cookies.header() },
    });
    expect(loginPageResponse.status).toBe(200);
    await expect(loginPageResponse.text()).resolves.toContain('Enter your email to continue.');

    const sendOtpResponse = await app.request(`${apiUrl}/login/send`, {
      method: 'POST',
      headers: {
        cookie: cookies.header(),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: formBody({ email: userEmail, resume: authorizationQuery }),
    });
    expect(sendOtpResponse.status).toBe(303);
    cookies.update(sendOtpResponse);

    const verifyOtpResponse = await app.request(`${apiUrl}/login/verify`, {
      method: 'POST',
      headers: {
        cookie: cookies.header(),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: formBody({ email: userEmail, resume: authorizationQuery, otp }),
    });
    expect(verifyOtpResponse.status).toBe(303);
    cookies.update(verifyOtpResponse);
    const resumeLocation = verifyOtpResponse.headers.get('location');
    expect(resumeLocation).toContain('/api/auth/mcp/authorize?');

    const authorizationCompleteResponse = await app.request(resumeLocation!, {
      headers: { cookie: cookies.header() },
    });
    expect(authorizationCompleteResponse.status).toBe(302);
    const callbackLocation = new URL(authorizationCompleteResponse.headers.get('location')!);
    expect(callbackLocation.origin + callbackLocation.pathname).toBe(redirectUri);
    expect(callbackLocation.searchParams.get('state')).toBe(state);
    const authorizationCode = callbackLocation.searchParams.get('code');
    expect(authorizationCode).toBeTruthy();

    const tokenResponse = await app.request(authorizationServer.token_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formBody({
        grant_type: 'authorization_code',
        code: authorizationCode!,
        redirect_uri: redirectUri,
        client_id: registration.client_id,
        code_verifier: codeVerifier,
      }),
    });
    expect(tokenResponse.status).toBe(200);
    const token = await readJson<{
      access_token: string;
      refresh_token: string;
      scope: string;
      token_type: string;
    }>(tokenResponse);
    expect(token.token_type.toLowerCase()).toBe('bearer');
    expect(token.scope.split(' ')).toEqual(expect.arrayContaining(['career:read']));

    async function mcpRequest(accessToken: string, body: Record<string, unknown>) {
      return app.request(`${apiUrl}/api/mcp`, {
        method: 'POST',
        headers: {
          accept: 'application/json, text/event-stream',
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    }

    const initializeResponse = await mcpRequest(token.access_token, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'oauth-integration-test', version: '1.0.0' },
      },
    });
    expect(initializeResponse.status).toBe(200);
    await expect(initializeResponse.json()).resolves.toMatchObject({
      result: { serverInfo: { name: 'Hominem MCP' } },
    });

    const toolsResponse = await mcpRequest(token.access_token, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    });
    expect(toolsResponse.status).toBe(200);
    await expect(toolsResponse.json()).resolves.toMatchObject({
      result: {
        tools: expect.arrayContaining([
          expect.objectContaining({ name: 'career_profile' }),
          expect.objectContaining({ name: 'career_engagements' }),
        ]),
      },
    });

    const refreshResponse = await app.request(authorizationServer.token_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: formBody({
        grant_type: 'refresh_token',
        refresh_token: token.refresh_token,
        client_id: registration.client_id,
      }),
    });
    expect(refreshResponse.status).toBe(200);
    const refreshedToken = await readJson<{ access_token: string; scope: string }>(refreshResponse);
    expect(refreshedToken.access_token).toBeTruthy();
    expect(refreshedToken.scope.split(' ')).toEqual(expect.arrayContaining(['career:read']));

    const refreshedToolResponse = await mcpRequest(refreshedToken.access_token, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'career_engagements', arguments: { limit: 1 } },
    });
    expect(refreshedToolResponse.status).toBe(200);
    const refreshedTool = await readJson<{
      result?: { isError?: boolean; structuredContent?: { engagements?: unknown[] } };
    }>(refreshedToolResponse);
    expect(refreshedTool.result?.isError).not.toBe(true);
    expect(refreshedTool.result?.structuredContent).toHaveProperty('engagements');
  }, 30000);
});
