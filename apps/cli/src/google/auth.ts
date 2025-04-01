import { logger } from '@/logger'
import { authenticate as googleAuthenticate } from '@google-cloud/local-auth'
import type { Credentials, GoogleAuth, JWTInput, OAuth2Client } from 'google-auth-library'
import { google } from 'googleapis'
import fs from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import * as path from 'node:path'
import { env } from '../env'

type JSONClient = ReturnType<typeof google.auth.fromJSON>
type AuthClient = OAuth2Client | GoogleAuth<JSONClient> | null

export const TOKEN_PATH = path.join(env.CONFIG_PATH, 'token.json')
export const CREDENTIALS_PATH = path.join(env.CONFIG_PATH, 'google-credentials.json')
export const CLI_GOOGLE_TOKEN_PATH = path.join(os.homedir(), '.hominem', 'google-token.json')
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

  // Load authorization to call APIs using Clerk-provided tokens
  async authorize(): Promise<GoogleAuth<JSONClient> | OAuth2Client> {
    const client = await this.getClerkGoogleAuth()

    if (client) {
      return client
    }

    // If we don't have Clerk tokens, inform the user they need to authenticate
    logger.error('No Google authentication tokens found!')
    logger.info('Please authenticate using the web app:')
    logger.info('1. Connect your Google account in the web app settings')
    logger.info('2. Run `hominem api auth` to save your tokens for CLI use')
    throw new Error('Google authentication tokens not found')
  }

  // Force reauthentication by requesting new tokens
  async reauth(): Promise<AuthClient> {
    logger.info('To reauthenticate with Google:')
    logger.info('1. Go to your web app account settings')
    logger.info('2. Disconnect and reconnect your Google account')
    logger.info('3. Run `hominem api auth` to fetch new tokens')

    // Remove existing tokens to force re-auth
    if (fs.existsSync(CLI_GOOGLE_TOKEN_PATH)) {
      fs.unlinkSync(CLI_GOOGLE_TOKEN_PATH)
    }

    throw new Error('Please reconnect your Google account in the web app')
  }

  // Get authentication client using tokens from Clerk
  private async getClerkGoogleAuth(): Promise<OAuth2Client | null> {
    try {
      if (!fs.existsSync(CLI_GOOGLE_TOKEN_PATH)) {
        logger.warn('No Google tokens found')
        return null
      }

      const content = await readFile(CLI_GOOGLE_TOKEN_PATH)
      const tokens = JSON.parse(content.toString())

      if (!tokens.access_token) {
        logger.warn('Invalid Google token format - missing access token')
        return null
      }

      // Create an OAuth2 client with the tokens
      const oauth2Client = new google.auth.OAuth2()
      oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expires_at ? new Date(tokens.expires_at).getTime() : undefined,
      })

      // Set up token refresh handler
      oauth2Client.on('tokens', (tokens) => {
        logger.info('Google token refreshed')

        // Update the stored tokens with refreshed access token
        this.updateStoredTokens(tokens)
      })

      return oauth2Client
    } catch (err) {
      logger.error('Error getting Google auth from Clerk tokens:', err)
      return null
    }
  }

  // Update stored tokens with refreshed ones
  private async updateStoredTokens(newTokens: Credentials): Promise<void> {
    try {
      // Only update if we have the token file
      if (!fs.existsSync(CLI_GOOGLE_TOKEN_PATH)) {
        return
      }

      // Read current tokens
      const content = await readFile(CLI_GOOGLE_TOKEN_PATH)
      const currentTokens = JSON.parse(content.toString())

      // Merge with new tokens
      const updatedTokens = {
        ...currentTokens,
        access_token: newTokens.access_token || currentTokens.access_token,
        expires_at: newTokens.expiry_date
          ? new Date(newTokens.expiry_date).toISOString()
          : currentTokens.expires_at,
      }

      // Save updated tokens
      await writeFile(CLI_GOOGLE_TOKEN_PATH, JSON.stringify(updatedTokens, null, 2))
    } catch (err) {
      logger.error('Error updating stored Google tokens:', err)
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
