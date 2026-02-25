import axios from 'axios';
import chalk from 'chalk';
import { consola } from 'consola';
import getPort from 'get-port';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { URL } from 'node:url';
import open from 'open';
import ora from 'ora';

import { env } from '../env';
import { clearTokens, loadTokens, saveTokens, type StoredTokens } from './secure-store';

const LEGACY_CONFIG = path.join(os.homedir(), '.hominem', 'config.json');
const LEGACY_GOOGLE = path.join(os.homedir(), '.hominem', 'google-token.json');
const DEFAULT_AUTH_BASE = env.API_URL ?? 'http://localhost:3000';

interface AuthOptions {
  authBaseUrl: string;
  scopes?: string[];
  headless?: boolean;
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
  try {
    const content = await fs.readFile(LEGACY_CONFIG, 'utf-8');
    const json = JSON.parse(content) as {
      token?: string;
      refreshToken?: string;
      timestamp?: string;
    };
    if (!json.token) return;

    const tokens: StoredTokens = {
      accessToken: json.token,
      provider: 'better-auth',
    };
    if (json.refreshToken) tokens.refreshToken = json.refreshToken;
    if (json.timestamp) {
      tokens.expiresAt = new Date(
        new Date(json.timestamp).getTime() + 55 * 60 * 1000,
      ).toISOString();
    }

    await saveTokens(tokens);

    await fs.rm(LEGACY_CONFIG, { force: true });
    await fs.rm(LEGACY_GOOGLE, { force: true });
    consola.info(chalk.green('Migrated CLI auth tokens to secure storage'));
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
  fallback?: Partial<StoredTokens>,
): StoredTokens {
  const stored: StoredTokens = {
    accessToken: tokenResponse.access_token,
    provider: tokenResponse.provider ?? fallback?.provider ?? 'better-auth',
    issuedAt: new Date().toISOString(),
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
  await migrateLegacyConfig();
  return loadTokens();
}

export async function logout(): Promise<void> {
  await clearTokens();
  consola.info(chalk.green('Logged out and cleared stored tokens'));
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
  const spinner = ora('Starting browser login').start();

  const port = await getPort();
  const redirectUri = `http://127.0.0.1:${port}/callback`;
  const state = crypto.randomBytes(16).toString('hex');
  const { verifier, challenge } = createPkcePair();

  if (options.headless) {
    spinner.info('Using device-code login (headless mode)');
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
    spinner.fail(chalk.red('Failed to initialize CLI authorization flow'));
    throw error;
  }

  const server = http.createServer(async (req, res) => {
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

      const tokens = buildStoredTokensFromResponse(tokenResponse, {
        ...(options.scopes ? { scopes: options.scopes } : {}),
      });

      await saveTokens(tokens);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Login successful</h1>You can close this window.');
      spinner.succeed(chalk.green('Authenticated via browser'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to exchange auth code'));
      consola.error(error);
      res.writeHead(500).end('Authentication failed');
    } finally {
      server.close();
    }
  });

  server.listen(port, '127.0.0.1', () => {
    spinner.text = 'Waiting for browser authentication';
    consola.info(`Opening browser to ${authUrl}`);
    void open(authUrl);
  });

  server.on('error', (err) => {
    spinner.fail(chalk.red('Could not start local redirect server'));
    consola.error(err);
    process.exit(1);
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
  consola.info(chalk.cyan(`User code: ${device.user_code}`));
  if (verifyUrl) {
    consola.info(`Open: ${verifyUrl}`);
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

      const tokens = buildStoredTokensFromResponse(data, {
        provider: 'better-auth',
        ...(options.scopes ? { scopes: options.scopes } : {}),
      });
      await saveTokens(tokens);
      consola.info(chalk.green('Authenticated via device flow'));
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

export async function getAccessToken(forceRefresh = false): Promise<string | null> {
  const stored = await getStoredTokens();
  if (!stored?.accessToken) return null;

  const expiresSoon = stored.expiresAt
    ? Date.now() > new Date(stored.expiresAt).getTime() - 5 * 60 * 1000
    : false;

  if (!forceRefresh && !expiresSoon) return stored.accessToken;

  if (!stored.refreshToken) return stored.accessToken;

  try {
    const url = new URL('/api/auth/token', DEFAULT_AUTH_BASE);
    const res = await axios.post(url.toString(), {
      grant_type: 'refresh_token',
      refresh_token: stored.refreshToken,
    });
    const data = res.data as TokenResponse;

    const tokens = buildStoredTokensFromResponse(data, stored);

    await saveTokens(tokens);

    return data.access_token;
  } catch (_err) {
    return stored.accessToken;
  }
}

export async function requireAccessToken() {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('No auth token available. Please run `hominem auth login`.');
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
