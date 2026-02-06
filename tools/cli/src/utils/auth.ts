import axios from 'axios'
import chalk from 'chalk'
import { consola } from 'consola'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { URL } from 'node:url'
import getPort from 'get-port'
import open from 'open'
import ora from 'ora'

import { clearTokens, loadTokens, saveTokens, type StoredTokens } from './secure-store'
import { env } from '../env'

const LEGACY_CONFIG = path.join(os.homedir(), '.hominem', 'config.json')
const LEGACY_GOOGLE = path.join(os.homedir(), '.hominem', 'google-token.json')
const DEFAULT_AUTH_BASE = env.API_URL ?? 'http://localhost:3000'

interface AuthOptions {
  authBaseUrl: string
  provider?: 'supabase' | 'workos' | 'unknown'
  scopes?: string[]
  headless?: boolean
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  expires_at?: string
  scope?: string
  provider?: 'supabase' | 'workos' | 'unknown'
}

export async function migrateLegacyConfig(): Promise<void> {
  try {
    const content = await fs.readFile(LEGACY_CONFIG, 'utf-8')
    const json = JSON.parse(content) as { token?: string; refreshToken?: string; timestamp?: string }
    if (!json.token) return

    const tokens: StoredTokens = {
      accessToken: json.token,
      provider: 'supabase',
    }
    if (json.refreshToken) tokens.refreshToken = json.refreshToken
    if (json.timestamp) {
      tokens.expiresAt = new Date(new Date(json.timestamp).getTime() + 55 * 60 * 1000).toISOString()
    }

    await saveTokens(tokens)

    await fs.rm(LEGACY_CONFIG, { force: true })
    await fs.rm(LEGACY_GOOGLE, { force: true })
    consola.info(chalk.green('Migrated CLI auth tokens to secure storage'))
  } catch (_err) {
    // ignore missing or malformed legacy config
  }
}

export async function getStoredTokens(): Promise<StoredTokens | null> {
  await migrateLegacyConfig()
  return loadTokens()
}

export async function logout(): Promise<void> {
  await clearTokens()
  consola.info(chalk.green('Logged out and cleared stored tokens'))
}

function createPkcePair() {
  const verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

function buildAuthUrl(base: string, redirectUri: string, state: string, challenge: string, scopes?: string[]) {
  const url = new URL('/auth/cli', base)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  if (scopes?.length) url.searchParams.set('scope', scopes.join(' '))
  url.searchParams.set('from', 'cli')
  return url.toString()
}

async function exchangeCodeForTokens({
  baseUrl,
  code,
  codeVerifier,
  redirectUri,
}: {
  baseUrl: string
  code: string
  codeVerifier: string
  redirectUri: string
}): Promise<TokenResponse> {
  const url = new URL('/api/auth/token', baseUrl)
  const res = await axios.post(url.toString(), {
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
  })
  return res.data as TokenResponse
}

export async function interactiveLogin(options: AuthOptions) {
  const spinner = ora('Starting browser login').start()

  const port = await getPort()
  const redirectUri = `http://127.0.0.1:${port}/callback`
  const state = crypto.randomBytes(16).toString('hex')
  const { verifier, challenge } = createPkcePair()

  const authUrl = buildAuthUrl(options.authBaseUrl, redirectUri, state, challenge, options.scopes)

  const server = http.createServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(400).end('Bad Request')
      return
    }

    const requestUrl = new URL(req.url, redirectUri)
    if (requestUrl.pathname !== '/callback') {
      res.writeHead(404).end('Not found')
      return
    }

    const returnedState = requestUrl.searchParams.get('state')
    const code = requestUrl.searchParams.get('code')

    if (!code || returnedState !== state) {
      res.writeHead(400).end('Invalid request')
      return
    }

    try {
      const tokenResponse = await exchangeCodeForTokens({
        baseUrl: options.authBaseUrl,
        code,
        codeVerifier: verifier,
        redirectUri,
      })

      const expiresAt = tokenResponse.expires_at
        ? tokenResponse.expires_at
        : tokenResponse.expires_in
          ? new Date(Date.now() + (tokenResponse.expires_in - 300) * 1000).toISOString()
          : undefined

      const tokens: StoredTokens = {
        accessToken: tokenResponse.access_token,
        provider: tokenResponse.provider ?? options.provider ?? 'unknown',
      }
      if (expiresAt) tokens.expiresAt = expiresAt
      if (tokenResponse.refresh_token) tokens.refreshToken = tokenResponse.refresh_token
      const scopes = tokenResponse.scope ? tokenResponse.scope.split(' ') : options.scopes
      if (scopes?.length) tokens.scopes = scopes

      await saveTokens(tokens)

      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end('<h1>Login successful</h1>You can close this window.')
      spinner.succeed(chalk.green('Authenticated via browser'))
    } catch (error) {
      spinner.fail(chalk.red('Failed to exchange auth code'))
      consola.error(error)
      res.writeHead(500).end('Authentication failed')
    } finally {
      server.close()
    }
  })

  server.listen(port, '127.0.0.1', () => {
    spinner.text = 'Waiting for browser authentication'
    consola.info(`Opening browser to ${authUrl}`)
    void open(authUrl)
  })

  server.on('error', (err) => {
    spinner.fail(chalk.red('Could not start local redirect server'))
    consola.error(err)
    process.exit(1)
  })
}

export async function deviceCodeLogin(_options: AuthOptions) {
  consola.warn(
    chalk.yellow(
      'Device-code login is not supported by Supabase. Use browser-based login (default flow).',
    ),
  )
}

export async function getAccessToken(forceRefresh = false): Promise<string | null> {
  const stored = await getStoredTokens()
  if (!stored?.accessToken) return null

  const expiresSoon = stored.expiresAt
    ? Date.now() > new Date(stored.expiresAt).getTime() - 5 * 60 * 1000
    : false

  if (!forceRefresh && !expiresSoon) return stored.accessToken

  if (!stored.refreshToken) return stored.accessToken

  try {
    const url = new URL('/api/auth/refresh-token', DEFAULT_AUTH_BASE)
    const res = await axios.post(url.toString(), {
      refresh_token: stored.refreshToken,
    })
    const data = res.data as TokenResponse

    const expiresAt = data.expires_at
      ? data.expires_at
      : data.expires_in
        ? new Date(Date.now() + (data.expires_in - 300) * 1000).toISOString()
        : stored.expiresAt

    const tokens: StoredTokens = {
      accessToken: data.access_token,
      provider: data.provider ?? stored.provider ?? 'unknown',
    }
    if (expiresAt) tokens.expiresAt = expiresAt
    if (data.refresh_token ?? stored.refreshToken) {
      tokens.refreshToken = data.refresh_token ?? stored.refreshToken
    }
    const scopes = data.scope ? data.scope.split(' ') : stored.scopes
    if (scopes?.length) tokens.scopes = scopes

    await saveTokens(tokens)

    return data.access_token
  } catch (_err) {
    return stored.accessToken
  }
}

export async function requireAccessToken() {
  const token = await getAccessToken()
  if (!token) {
    throw new Error('No auth token available. Please run `hominem auth login`.')
  }
  return token
}

export async function getAuthToken() {
  return requireAccessToken()
}

// Helper function to create an authenticated axios client
export async function getAuthenticatedClient(host = 'localhost', port = '4445') {
  const token = await requireAccessToken()

  const client = axios.create({
    baseURL: `http://${host}:${port}`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  return client
}
