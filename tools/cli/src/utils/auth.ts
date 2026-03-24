import chalk from 'chalk';
import { consola } from 'consola';
import fs from 'node:fs/promises';
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

const DEFAULT_AUTH_BASE = 'http://localhost:4040';

interface FetchError extends Error {
  response?: {
    status: number;
    data: unknown;
  };
}

function isFetchError(error: unknown): error is FetchError {
  return error instanceof Error && 'response' in error;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const result = await postJsonWithHeaders<T>(url, body);
  return result.data;
}

async function postJsonWithHeaders<T>(
  url: string,
  body: unknown,
): Promise<{ data: T; headers: Headers }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as FetchError;
    error.response = {
      status: response.status,
      data: await response.json().catch(() => null),
    };
    throw error;
  }

  return {
    data: (await response.json()) as T,
    headers: response.headers,
  };
}

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
  access_token?: string;
  expires_in?: number;
  expires_at?: string;
  scope?: string;
  provider?: 'better-auth';
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

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri?: string;
  verification_uri_complete?: string;
  expires_in?: number;
  interval?: number;
}

async function migrateLegacyConfig(): Promise<void> {
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
  } catch {
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
  const accessToken = tokenResponse.access_token ?? fallback?.accessToken;
  if (!accessToken) {
    throw new AuthError({
      code: 'AUTH_LOGIN_FAILED',
      category: 'auth',
      message: 'No Better Auth bearer token was returned by the device flow',
    });
  }

  const stored: StoredTokens = {
    tokenVersion: 2,
    accessToken,
    provider: tokenResponse.provider ?? fallback?.provider ?? 'better-auth',
    issuedAt: new Date().toISOString(),
    issuerBaseUrl: normalizeBaseUrl(issuerBaseUrl),
  };

  const expiresAt = toExpiresAtIso(tokenResponse, fallback?.expiresAt);
  if (expiresAt) stored.expiresAt = expiresAt;

  const scopes = tokenResponse.scope ? tokenResponse.scope.split(' ') : fallback?.scopes;
  if (scopes?.length) stored.scopes = scopes;

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
    consola.info(
      chalk.green('Cleared local device-flow credentials. Remote sessions were not revoked.'),
    );
  }
}

export async function interactiveLogin(options: AuthOptions) {
  const spinner =
    options.outputMode === 'interactive' ? ora('Starting browser login').start() : null;

  if (options.headless) {
    if (spinner) {
      spinner.info('Using device-code login (headless mode)');
    }
    await deviceCodeLogin(options);
    return;
  }

  if (spinner) {
    spinner.info('Using browser-assisted device-code login');
  }
  await deviceCodeLogin(options);
}

export async function deviceCodeLogin(_options: AuthOptions) {
  const options = _options;
  const clientId = 'hominem-cli';
  const scope = options.scopes && options.scopes.length > 0 ? options.scopes.join(' ') : 'cli:read';
  const loginDeadline = Date.now() + options.timeoutMs;

  const codeUrl = new URL('/api/auth/device/code', options.authBaseUrl);
  const device = await postJson<DeviceCodeResponse>(codeUrl.toString(), {
    client_id: clientId,
    scope,
  });

  if (!device.device_code || !device.user_code) {
    throw new Error('Device code endpoint returned invalid payload');
  }

  const verifyUrl = device.verification_uri_complete ?? device.verification_uri;
  emitInfo(options.outputMode, chalk.cyan(`User code: ${device.user_code}`));
  if (verifyUrl) {
    emitInfo(options.outputMode, `Open: ${verifyUrl}`);
    if (!options.headless) {
      try {
        await open(verifyUrl);
      } catch (error) {
        throw new AuthError({
          code: 'AUTH_LOGIN_FAILED',
          category: 'auth',
          message:
            error instanceof Error ? error.message : 'Failed to open device verification URL',
          hint: `Open ${verifyUrl} manually`,
        });
      }
    }
  }

  const intervalSec = Math.max(2, device.interval ?? 5);
  const expiresAt = Date.now() + (device.expires_in ?? 600) * 1000;
  const pollDeadline = Math.min(expiresAt, loginDeadline);
  const tokenUrl = new URL('/api/auth/device/token', options.authBaseUrl);

  while (Date.now() < pollDeadline) {
    const waitMs = Math.min(intervalSec * 1000, Math.max(0, pollDeadline - Date.now()));
    await new Promise((resolve) => setTimeout(resolve, waitMs));

    try {
      const { data, headers } = await postJsonWithHeaders<TokenResponse>(tokenUrl.toString(), {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: device.device_code,
        client_id: clientId,
      });
      const accessToken = headers.get('set-auth-token') ?? data.access_token;

      if (!accessToken) {
        throw new AuthError({
          code: 'AUTH_LOGIN_FAILED',
          category: 'auth',
          message: 'Device token exchange did not return a Better Auth bearer token',
        });
      }

      const tokens = buildStoredTokensFromResponse(
        {
          ...data,
          access_token: accessToken,
          scope: data.scope ?? scope,
        },
        options.authBaseUrl,
        {
          provider: 'better-auth',
          scopes: scope.split(' ').filter(Boolean),
        },
      );
      await saveTokens(tokens);
      emitInfo(options.outputMode, chalk.green('Authenticated via device flow'));
      return;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      if (!isFetchError(error) || !error.response?.data) {
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
  expectedIssuerBaseUrl?: string;
}): Promise<string | null> {
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

  return stored.accessToken;
}

export async function hasValidStoredSession(expectedIssuerBaseUrl?: string): Promise<boolean> {
  const stored = await getStoredTokens();
  if (!stored?.accessToken || !stored.issuerBaseUrl) {
    return false;
  }

  const issuerBaseUrl = expectedIssuerBaseUrl
    ? normalizeBaseUrl(expectedIssuerBaseUrl)
    : normalizeBaseUrl(stored.issuerBaseUrl);

  if (normalizeBaseUrl(stored.issuerBaseUrl) !== issuerBaseUrl) {
    return false;
  }

  try {
    const response = await fetch(new URL('/api/auth/session', issuerBaseUrl).toString(), {
      method: 'GET',
      headers: {
        authorization: `Bearer ${stored.accessToken}`,
      },
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as { isAuthenticated?: boolean };
    return payload.isAuthenticated === true;
  } catch {
    return false;
  }
}


