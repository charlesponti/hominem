import { authenticate as googleAuthenticate } from '@google-cloud/local-auth'
import { logger } from '@ponti/utils/logger'
import type { Credentials, GoogleAuth, JWTInput, OAuth2Client } from 'google-auth-library'
import { google } from 'googleapis'
import { readFile, writeFile } from 'node:fs/promises'
import * as path from 'node:path'
import { env } from '../env'

type JSONClient = ReturnType<typeof google.auth.fromJSON>
type AuthClient = OAuth2Client | GoogleAuth<JSONClient> | null

export const TOKEN_PATH = path.join(env.CONFIG_PATH, 'token.json')
export const CREDENTIALS_PATH = path.join(env.CONFIG_PATH, 'google-credentials.json')
export const DEFAULT_SCOPES = [
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/calendar',
  'https://mail.google.com/',
]

type GoogleOAuthServiceOptions = {
  scopes: string[]
}

type StoredCredentials = {
  type: 'authorized_user'
  client_id: string
  client_secret: string
  refresh_token: string
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type FileCredentials = { installed: any; web: any }

export class GoogleOAuthService {
  private options: GoogleOAuthServiceOptions

  constructor(options: GoogleOAuthServiceOptions = { scopes: DEFAULT_SCOPES }) {
    this.options = options
  }

  // Load or request or authorization to call APIs
  async authorize(): Promise<GoogleAuth<JSONClient> | OAuth2Client> {
    const client = await this.getSavedAuth()

    if (client) {
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      return client as any as GoogleAuth<JSONClient>
    }

    // Request new credentials
    const newClient = await googleAuthenticate({
      scopes: this.options.scopes,
      keyfilePath: CREDENTIALS_PATH,
    })

    // Save new credentials
    await this.saveCredentials(newClient.credentials)

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    return newClient as any as OAuth2Client
  }

  async reauth(): Promise<AuthClient> {
    // Request new credentials
    const newClient = await googleAuthenticate({
      scopes: this.options.scopes,
      keyfilePath: CREDENTIALS_PATH,
    })

    // Save new credentials
    await this.saveCredentials(newClient.credentials)

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    return newClient as any as OAuth2Client
  }

  private async getCredentials(): Promise<FileCredentials> {
    try {
      const content = await readFile(CREDENTIALS_PATH)
      const keys = JSON.parse(content.toString()) as FileCredentials
      return keys
    } catch (err) {
      logger.error('Error loading client secret file:', err)
      throw err
    }
  }

  private async getSavedAuth(): Promise<JSONClient | null> {
    try {
      const content = await readFile(TOKEN_PATH)
      const credentials = JSON.parse(content.toString()) as StoredCredentials
      return google.auth.fromJSON(credentials as JWTInput)
    } catch (err) {
      logger.warn('No token file found. Requesting authorization...')
      return null
    }
  }

  // Create token file if it doesn't exist
  private async saveCredentials(credentials: Credentials): Promise<void> {
    try {
      const keys = await this.getCredentials()
      const key = keys.installed || keys.web
      const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: key.client_id,
        client_secret: key.client_secret,
        refresh_token: credentials.refresh_token,
      })
      await writeFile(TOKEN_PATH, payload)
    } catch (err) {
      logger.error('Error saving credentials:', err)
      throw err
    }
  }
}

const googleClientFactory = () => {
  let googleClient: GoogleOAuthService | null = null

  if (!googleClient) {
    googleClient = new GoogleOAuthService({
      scopes: DEFAULT_SCOPES,
    })
  }

  return googleClient
}

export const googleClient = googleClientFactory()
