import { createHash, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createBetterAuthServer } from '../auth/better-auth';
import { createServer } from '../server';
import * as resendMock from '../testkit/resend.mock';
import { createTestEnv } from '../testkit/server';

const apiUrl = 'http://localhost:4040';
const redirectUri = `http://127.0.0.1:60693/callback/${randomUUID()}`;
const userEmail = 'mcp-oauth-integration@hominem.test';

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
  return await response.json();
}

async function readMcpJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (
    !response.headers.get('content-type')?.includes('text/event-stream') &&
    !text.startsWith('event:')
  ) {
    return JSON.parse(text) as Record<string, unknown>;
  }
  const data = text
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .at(-1)
    ?.slice(6);
  return JSON.parse(data ?? '{}') as Record<string, unknown>;
}

describe('MCP OAuth integration', () => {
  let app: ReturnType<typeof createServer>;
  const cookies = createCookieJar();
  // Mocks Resend (an external vendor) at its outbound HTTP boundary, so the
  // real Better Auth OTP flow runs end-to-end and this test reads back the
  // real, randomly generated OTP a user would have received by email.
  let stopResendMock: () => void;

  beforeAll(async () => {
    const testEnv = createTestEnv({
      // Pin this instead of inheriting the real env.API_URL — a local .env
      // pointed at a portless URL (see docs) would otherwise silently
      // desync this from the `apiUrl` constant this file asserts against.
      API_URL: apiUrl,
    });
    stopResendMock = resendMock.installResendMock();
    const auth = createBetterAuthServer(testEnv);
    app = createServer({ env: testEnv, auth });
    // Route only requests aimed at this test's own API back into the local
    // app; anything else (e.g. the Better Auth OTP flow's outbound call to
    // Resend) must keep going through the real global fetch so MSW's
    // interception of it still applies.
    const realFetch = globalThis.fetch;
    vi.stubGlobal('fetch', (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (url.startsWith(apiUrl)) return app.request(new Request(input, init));
      return realFetch(input, init);
    });
  });

  afterAll(() => {
    cookies.clear();
    vi.unstubAllGlobals();
    stopResendMock();
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
      registration_endpoint: string;
      scopes_supported: string[];
    }>(authorizationServerResponse);
    expect(authorizationServer.scopes_supported).toContain('career:read');

    const registrationResponse = await app.request(authorizationServer.registration_endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Hominem MCP OAuth integration test',
        redirect_uris: [redirectUri],
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        application_type: 'native',
        scope: 'career:read',
        resources: [`${apiUrl}/api/mcp`],
      }),
    });
    expect(registrationResponse.status).toBe(201);
    const registration = await readJson<{ client_id: string }>(registrationResponse);
    expect(registration.client_id).toBeTruthy();

    // Pre-create the test user by completing a real OTP sign-in through
    // Better Auth's own endpoints (Resend is mocked at the network boundary,
    // see beforeAll). The resulting session isn't needed — the authorization
    // flow below establishes its own via the hosted login — so it's discarded.
    const precreateSendResponse = await app.request(
      `${apiUrl}/api/auth/email-otp/send-verification-otp`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: userEmail, type: 'sign-in' }),
      },
    );
    expect(precreateSendResponse.status).toBe(200);

    const precreateOtp = resendMock.getScriptedEmail(userEmail)?.otp;
    expect(precreateOtp).toBeTruthy();

    const precreateSignInResponse = await app.request(`${apiUrl}/api/auth/sign-in/email-otp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        otp: precreateOtp,
        name: 'MCP OAuth Integration User',
      }),
    });
    expect(precreateSignInResponse.status).toBe(200);
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
    await expect(loginPageResponse.text()).resolves.toContain(
      'a one-time code — no password to remember',
    );

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

    const otp = resendMock.getScriptedEmail(userEmail)?.otp;
    expect(otp).toBeTruthy();

    const verifyOtpResponse = await app.request(`${apiUrl}/login/verify`, {
      method: 'POST',
      headers: {
        cookie: cookies.header(),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: formBody({ email: userEmail, resume: authorizationQuery, otp: otp! }),
    });
    expect(verifyOtpResponse.status).toBe(303);
    cookies.update(verifyOtpResponse);
    const resumeLocation = verifyOtpResponse.headers.get('location');
    expect(resumeLocation).toContain('/api/auth/oauth2/authorize?');

    const consentRedirectResponse = await app.request(resumeLocation!, {
      headers: { cookie: cookies.header() },
    });
    expect(consentRedirectResponse.status).toBe(302);
    const consentPageUrl = new URL(consentRedirectResponse.headers.get('location')!);
    const consentLocation = await app.request(consentPageUrl, {
      headers: { cookie: cookies.header() },
    });
    expect(consentLocation.status).toBe(200);
    await expect(consentLocation.text()).resolves.toContain('Authorize');
    const consentDecisionResponse = await app.request(`${apiUrl}/consent/decision`, {
      method: 'POST',
      headers: {
        cookie: cookies.header(),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: formBody({ oauth_query: consentPageUrl.searchParams.toString(), accept: 'true' }),
    });
    expect(consentDecisionResponse.status).toBe(303);
    const callbackLocation = new URL(consentDecisionResponse.headers.get('location')!);
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
        protocolVersion: '2026-07-28',
        capabilities: {},
        clientInfo: { name: 'oauth-integration-test', version: '1.0.0' },
      },
    });
    expect(initializeResponse.status).toBe(200);
    await expect(readMcpJson(initializeResponse)).resolves.toMatchObject({
      result: { serverInfo: { name: 'Hominem MCP' } },
    });

    const toolsResponse = await mcpRequest(token.access_token, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {},
    });
    expect(toolsResponse.status).toBe(200);
    await expect(readMcpJson(toolsResponse)).resolves.toMatchObject({
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
    const refreshedTool = (await readMcpJson(refreshedToolResponse)) as {
      result?: { isError?: boolean; structuredContent?: { engagements?: unknown[] } };
    };
    expect(refreshedTool.result?.isError).not.toBe(true);
    expect(refreshedTool.result?.structuredContent).toHaveProperty('engagements');
  }, 30000);
});
