import axios from 'axios';
import chalk from 'chalk';
import { consola } from 'consola';
import getPort from 'get-port';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import { URL } from 'node:url';
import open from 'open';
import ora from 'ora';

import { getHominemHomeDir } from './paths';
import {
  clearTokens,
  loadTokens,
  saveTokens,
  SecureStoreError,
  type StoredTokens,
} from './secure-store';

const DEFAULT_AUTH_BASE = 'http://localhost:3000';

function getLegacyConfigPath(): string {
  return `${getHominemHomeDir()}/config.json`;
}

function getLegacyGooglePath(): string {
  return `${getHominemHomeDir()}/google-token.json`;
}

interface AuthOptions {
  authBaseUrl: string;
  scopes?: string[];
  headless?: boolean;
  outputMode: 'machine' | 'interactive';
  timeoutMs: number;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: string;
  scope?: string;
  provider?: 'better-auth';
  session_id?: string;
  refresh_family_id?: string;
}

export class AuthError extends Error {
  code:
    | 'AUTH_LOGIN_TIMEOUT'
    | 'AUTH_LOGIN_FAILED'
    | 'AUTH_REFRESH_FAILED'
    | 'AUTH_ISSUER_MISSING'
    | 'AUTH_ISSUER_MISMATCH'
    | 'AUTH_INVALID'
    | 'AUTH_REQUIRED'
    | 'AUTH_DEPENDENCY_UNAVAILABLE'
    | 'AUTH_SECURE_STORE_FAILED';
  category: 'auth' | 'dependency';
  hint?: string;

  constructor(params: {
    code:
      | 'AUTH_LOGIN_TIMEOUT'
      | 'AUTH_LOGIN_FAILED'
      | 'AUTH_REFRESH_FAILED'
      | 'AUTH_ISSUER_MISSING'
      | 'AUTH_ISSUER_MISMATCH'
      | 'AUTH_INVALID'
      | 'AUTH_REQUIRED'
      | 'AUTH_DEPENDENCY_UNAVAILABLE'
      | 'AUTH_SECURE_STORE_FAILED';
    category: 'auth' | 'dependency';
    message: string;
    hint?: string;
  }) {
    super(params.message);
    this.name = 'AuthError';
    this.code = params.code;
    this.category = params.category;
    this.hint = params.hint;
  }
}

function normalizeBaseUrl(input: string): string {
  const parsed = new URL(input);
  return parsed.origin;
}

function emitInfo(outputMode: 'machine' | 'interactive', message: string) {
  if (outputMode === 'machine') {
    return;
  }
  consola.info(message);
}

function emitError(outputMode: 'machine' | 'interactive', error: Error) {
  if (outputMode === 'machine') {
    return;
  }
  consola.error(error);
}

interface CliAuthorizeResponse {
  authorization_url: string;
}

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri?: string;
  verification_uri_complete?: string;
  expires_in?: number;
  interval?: number;
}

export async function migrateLegacyConfig(): Promise<void> {
  const legacyConfig = getLegacyConfigPath();
  const legacyGoogle = getLegacyGooglePath();
  try {
    const content = await fs.readFile(legacyConfig, 'utf-8');
    const json = JSON.parse(content) as {
      token?: string;
      refreshToken?: string;
      timestamp?: string;
    };
    if (!json.token) return;

    const tokens: StoredTokens = {
      tokenVersion: 2,
      accessToken: json.token,
      provider: 'better-auth',
      issuerBaseUrl: normalizeBaseUrl(DEFAULT_AUTH_BASE),
    };
    if (json.refreshToken) tokens.refreshToken = json.refreshToken;
    if (json.timestamp) {
      tokens.expiresAt = new Date(
        new Date(json.timestamp).getTime() + 55 * 60 * 1000,
      ).toISOString();
    }

    await saveTokens(tokens);

    await fs.rm(legacyConfig, { force: true });
    await fs.rm(legacyGoogle, { force: true });
  } catch (_err) {
    // ignore missing or malformed legacy config
  }
}

function toExpiresAtIso(tokenResponse: TokenResponse, fallback?: string) {
  if (tokenResponse.expires_at) {
    return tokenResponse.expires_at;
  }
  if (tokenResponse.expires_in) {
    return new Date(Date.now() + Math.max(0, tokenResponse.expires_in - 300) * 1000).toISOString();
  }
  return fallback;
}

function buildStoredTokensFromResponse(
  tokenResponse: TokenResponse,
  issuerBaseUrl: string,
  fallback?: Partial<StoredTokens>,
): StoredTokens {
  const stored: StoredTokens = {
    tokenVersion: 2,
    accessToken: tokenResponse.access_token,
    provider: tokenResponse.provider ?? fallback?.provider ?? 'better-auth',
    issuedAt: new Date().toISOString(),
    issuerBaseUrl: normalizeBaseUrl(issuerBaseUrl),
  };

  const expiresAt = toExpiresAtIso(tokenResponse, fallback?.expiresAt);
  if (expiresAt) stored.expiresAt = expiresAt;

  const refreshToken = tokenResponse.refresh_token ?? fallback?.refreshToken;
  if (refreshToken) stored.refreshToken = refreshToken;

  const scopes = tokenResponse.scope ? tokenResponse.scope.split(' ') : fallback?.scopes;
  if (scopes?.length) stored.scopes = scopes;

  const sessionId = tokenResponse.session_id ?? fallback?.sessionId;
  if (sessionId) stored.sessionId = sessionId;

  const refreshFamilyId = tokenResponse.refresh_family_id ?? fallback?.refreshFamilyId;
  if (refreshFamilyId) stored.refreshFamilyId = refreshFamilyId;

  return stored;
}

export async function getStoredTokens(): Promise<StoredTokens | null> {
  try {
    await migrateLegacyConfig();
    return await loadTokens();
  } catch (error) {
    if (error instanceof SecureStoreError) {
      throw new AuthError({
        code: 'AUTH_SECURE_STORE_FAILED',
        category: 'auth',
        message: error.message,
        hint: 'Run `hominem auth login` to reinitialize credentials',
      });
    }
    throw error;
  }
}

export async function logout(options?: { outputMode?: 'machine' | 'interactive' }): Promise<void> {
  try {
    await clearTokens();
  } catch (error) {
    if (error instanceof SecureStoreError) {
      throw new AuthError({
        code: 'AUTH_SECURE_STORE_FAILED',
        category: 'auth',
        message: error.message,
        hint: 'Run `hominem auth login` to reinitialize credentials',
      });
    }
    throw error;
  }
  if ((options?.outputMode ?? 'interactive') === 'interactive') {
    consola.info(chalk.green('Logged out and cleared stored tokens'));
  }
}

function createPkcePair() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

function buildAuthorizePayload(
  redirectUri: string,
  state: string,
  challenge: string,
  scopes?: string[],
) {
  return {
    redirect_uri: redirectUri,
    code_challenge: challenge,
    state,
    ...(scopes?.length ? { scope: scopes.join(' ') } : {}),
  };
}

async function requestCliAuthorizationUrl({
  baseUrl,
  redirectUri,
  state,
  codeChallenge,
  scopes,
}: {
  baseUrl: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scopes?: string[];
}) {
  const url = new URL('/api/auth/cli/authorize', baseUrl);
  const payload = buildAuthorizePayload(redirectUri, state, codeChallenge, scopes);
  const res = await axios.post(url.toString(), payload);
  const data = res.data as CliAuthorizeResponse;
  if (!data.authorization_url) {
    throw new Error('CLI authorize endpoint did not return an authorization URL');
  }
  return data.authorization_url;
}

async function exchangeCodeForTokens({
  baseUrl,
  code,
  codeVerifier,
  redirectUri,
}: {
  baseUrl: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  const url = new URL('/api/auth/cli/exchange', baseUrl);
  const res = await axios.post(url.toString(), {
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
  });
  return res.data as TokenResponse;
}

export async function interactiveLogin(options: AuthOptions) {
  const spinner =
    options.outputMode === 'interactive' ? ora('Starting browser login').start() : null;

  const port = await getPort();
  const redirectUri = `http://127.0.0.1:${port}/callback`;
  const state = crypto.randomBytes(16).toString('hex');
  const { verifier, challenge } = createPkcePair();
  const issuerBaseUrl = normalizeBaseUrl(options.authBaseUrl);

  if (options.headless) {
    if (spinner) {
      spinner.info('Using device-code login (headless mode)');
    }
    await deviceCodeLogin(options);
    return;
  }

  let authUrl: string;
  try {
    authUrl = await requestCliAuthorizationUrl({
      baseUrl: options.authBaseUrl,
      redirectUri,
      state,
      codeChallenge: challenge,
      ...(options.scopes ? { scopes: options.scopes } : {}),
    });
  } catch (error) {
    if (spinner) {
      spinner.fail(chalk.red('Failed to initialize CLI authorization flow'));
    }
    throw error;
  }

  await new Promise<void>((resolve, reject) => {
    let finished = false;
    let server: http.Server;
    const timeout = setTimeout(() => {
      if (finished) {
        return;
      }
      finished = true;
      if (spinner) {
        spinner.fail(chalk.red('Authentication timed out'));
      }
      server.close();
      reject(
        new AuthError({
          code: 'AUTH_LOGIN_TIMEOUT',
          category: 'auth',
          message: `Authentication timed out after ${options.timeoutMs}ms`,
          hint: 'Run `hominem auth login` again',
        }),
      );
    }, options.timeoutMs);

    const complete = (error?: Error) => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timeout);
      server.close();
      if (error) {
        reject(error);
        return;
      }
      resolve();
    };

    server = http.createServer(async (req, res) => {
      if (!req.url) {
        res.writeHead(400).end('Bad Request');
        return;
      }

      const requestUrl = new URL(req.url, redirectUri);
      if (requestUrl.pathname !== '/callback') {
        res.writeHead(404).end('Not found');
        return;
      }

      const returnedState = requestUrl.searchParams.get('state');
      const code = requestUrl.searchParams.get('code');

      if (!code || returnedState !== state) {
        res.writeHead(400).end('Invalid request');
        return;
      }

      try {
        const tokenResponse = await exchangeCodeForTokens({
          baseUrl: options.authBaseUrl,
          code,
          codeVerifier: verifier,
          redirectUri,
        });

        const tokens = buildStoredTokensFromResponse(tokenResponse, issuerBaseUrl, {
          ...(options.scopes ? { scopes: options.scopes } : {}),
        });

        await saveTokens(tokens);

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Login successful</h1>You can close this window.');
        if (spinner) {
          spinner.succeed(chalk.green('Authenticated via browser'));
        }
        complete();
      } catch (error) {
        if (spinner) {
          spinner.fail(chalk.red('Failed to exchange auth code'));
        }
        if (error instanceof Error) {
          emitError(options.outputMode, error);
        }
        res.writeHead(500).end('Authentication failed');
        complete(
          new AuthError({
            code: 'AUTH_LOGIN_FAILED',
            category: 'auth',
            message: error instanceof Error ? error.message : 'Authentication flow failed',
          }),
        );
      }
    });

    server.listen(port, '127.0.0.1', () => {
      if (spinner) {
        spinner.text = 'Waiting for browser authentication';
      }
      emitInfo(options.outputMode, `Opening browser to ${authUrl}`);
      void open(authUrl);
    });

    server.on('error', (error) => {
      if (spinner) {
        spinner.fail(chalk.red('Could not start local redirect server'));
      }
      emitError(options.outputMode, error);
      complete(
        new AuthError({
          code: 'AUTH_LOGIN_FAILED',
          category: 'dependency',
          message: error.message,
        }),
      );
    });
  });
}

export async function deviceCodeLogin(_options: AuthOptions) {
  const options = _options;
  const clientId = 'hominem-cli';
  const scope = options.scopes?.join(' ') ?? 'cli:read';

  const codeUrl = new URL('/api/auth/device/code', options.authBaseUrl);
  const codeResponse = await axios.post(codeUrl.toString(), {
    client_id: clientId,
    scope,
  });
  const device = codeResponse.data as DeviceCodeResponse;

  if (!device.device_code || !device.user_code) {
    throw new Error('Device code endpoint returned invalid payload');
  }

  const verifyUrl = device.verification_uri_complete ?? device.verification_uri;
  emitInfo(options.outputMode, chalk.cyan(`User code: ${device.user_code}`));
  if (verifyUrl) {
    emitInfo(options.outputMode, `Open: ${verifyUrl}`);
    if (!options.headless) {
      await open(verifyUrl).catch(() => undefined);
    }
  }

  const intervalSec = Math.max(2, device.interval ?? 5);
  const expiresAt = Date.now() + (device.expires_in ?? 600) * 1000;
  const tokenUrl = new URL('/api/auth/device/token', options.authBaseUrl);

  while (Date.now() < expiresAt) {
    await new Promise((resolve) => setTimeout(resolve, intervalSec * 1000));

    try {
      const tokenResponse = await axios.post(tokenUrl.toString(), {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: device.device_code,
        client_id: clientId,
      });
      const data = tokenResponse.data as TokenResponse;

      const tokens = buildStoredTokensFromResponse(data, options.authBaseUrl, {
        provider: 'better-auth',
        ...(options.scopes ? { scopes: options.scopes } : {}),
      });
      await saveTokens(tokens);
      emitInfo(options.outputMode, chalk.green('Authenticated via device flow'));
      return;
    } catch (error) {
      if (!axios.isAxiosError(error) || !error.response?.data) {
        throw error;
      }
      const payload = error.response.data as { error?: string };
      if (payload.error === 'authorization_pending' || payload.error === 'slow_down') {
        continue;
      }
      if (payload.error === 'expired_token') {
        throw new Error('Device code expired before authorization completed');
      }
      throw new Error(payload.error ?? 'Device token polling failed');
    }
  }

  throw new Error('Device authorization timed out');
}

export async function getAccessToken(params?: {
  forceRefresh?: boolean;
  expectedIssuerBaseUrl?: string;
}): Promise<string | null> {
  const forceRefresh = params?.forceRefresh ?? false;
  const expectedIssuerBaseUrl = params?.expectedIssuerBaseUrl;
  const stored = await getStoredTokens();
  if (!stored?.accessToken) {
    return null;
  }
  if (!stored.issuerBaseUrl) {
    throw new AuthError({
      code: 'AUTH_ISSUER_MISSING',
      category: 'auth',
      message: 'Stored auth issuer is missing',
      hint: 'Run `hominem auth login`',
    });
  }

  if (
    expectedIssuerBaseUrl &&
    normalizeBaseUrl(expectedIssuerBaseUrl) !== normalizeBaseUrl(stored.issuerBaseUrl)
  ) {
    throw new AuthError({
      code: 'AUTH_ISSUER_MISMATCH',
      category: 'auth',
      message: `Token issuer ${normalizeBaseUrl(stored.issuerBaseUrl)} does not match requested base ${normalizeBaseUrl(expectedIssuerBaseUrl)}`,
      hint: 'Run `hominem auth login --base-url <target>`',
    });
  }

  const expiresSoon = stored.expiresAt
    ? Date.now() > new Date(stored.expiresAt).getTime() - 5 * 60 * 1000
    : false;

  if (!forceRefresh && !expiresSoon) return stored.accessToken;

  if (!stored.refreshToken) {
    throw new AuthError({
      code: 'AUTH_INVALID',
      category: 'auth',
      message: 'Auth token expired and no refresh token is available',
      hint: 'Run `hominem auth login`',
    });
  }

  try {
    const url = new URL('/api/auth/token', normalizeBaseUrl(stored.issuerBaseUrl));
    const res = await axios.post(url.toString(), {
      grant_type: 'refresh_token',
      refresh_token: stored.refreshToken,
    });
    const data = res.data as TokenResponse;

    const tokens = buildStoredTokensFromResponse(
      data,
      normalizeBaseUrl(stored.issuerBaseUrl),
      stored,
    );

    await saveTokens(tokens);

    return data.access_token;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        throw new AuthError({
          code: 'AUTH_INVALID',
          category: 'auth',
          message: 'Stored credentials are invalid',
          hint: 'Run `hominem auth login`',
        });
      }
    }
    throw new AuthError({
      code: 'AUTH_DEPENDENCY_UNAVAILABLE',
      category: 'dependency',
      message: error instanceof Error ? error.message : 'Auth refresh dependency unavailable',
    });
  }
}

export async function requireAccessToken() {
  const token = await getAccessToken();
  if (!token) {
    throw new AuthError({
      code: 'AUTH_REQUIRED',
      category: 'auth',
      message: 'No auth token available',
      hint: 'Run `hominem auth login`',
    });
  }
  return token;
}

export async function getAuthToken() {
  return requireAccessToken();
}

// Helper function to create an authenticated axios client
export async function getAuthenticatedClient(host = 'localhost', port = '4445') {
  const token = await requireAccessToken();

  const client = axios.create({
    baseURL: `http://${host}:${port}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return client;
}
