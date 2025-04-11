import type { User as ClerkUser, OauthAccessToken } from '@clerk/fastify'
import { logger } from '@ponti/utils/logger'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { OAuth2Client } from 'google-auth-library'
import { google } from 'googleapis'
import assert from 'node:assert'
import { client } from 'src/middleware/auth'
import { tokenManager } from './token-manager'

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env

assert(GOOGLE_CLIENT_ID, 'Missing Google client ID')
assert(GOOGLE_CLIENT_SECRET, 'Missing Google client secret')
assert(GOOGLE_REDIRECT_URI, 'Missing Google redirect URI')

class GoogleService {
  private oauth2Client: OAuth2Client

  constructor() {
    this.oauth2Client = new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    )
  }

  async getUserGoogleTokens(clerkUser: ClerkUser) {
    let googleTokens: OauthAccessToken[] = []
    const userId = clerkUser.id

    const googleAccount = clerkUser.externalAccounts.find(
      (account) => account.provider === 'oauth_google'
    )

    try {
      if (googleAccount) {
        const response = await client.users.getUserOauthAccessToken(userId, 'google')
        googleTokens = response.data
        if (!googleTokens.length) {
          throw new Error('No Google token found')
        }
      }
      return googleTokens
    } catch (error) {
      console.error(`Error fetching Google tokens for ${userId}:`, error)
      throw new Error('Failed to retrieve Google tokens')
    }
  }

  /**
   * Generate authentication URL for user consent
   */
  generateAuthUrl(scopes: string[]): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      // Force approval prompt to get a refresh token
      prompt: 'consent',
    })
  }

  /**
   * Get tokens after user authorization
   * @param code Authorization code from Google
   */
  async getTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code)
    this.oauth2Client.setCredentials(tokens)
    return tokens
  }

  /**
   * Set up OAuth client with user's tokens
   */
  async getAuthorizedClientForUser(userId: string): Promise<OAuth2Client> {
    const tokens = await tokenManager.getTokens(userId)

    if (!tokens) {
      throw new Error('No Google tokens found for user')
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)

    client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expires_at ? new Date(tokens.expires_at).getTime() : undefined,
    })

    // Set up token refresh handler
    client.on('tokens', async (newTokens) => {
      logger.info('Google token refreshed automatically')
      await tokenManager.updateTokens(userId, newTokens)
    })

    return client
  }

  /**
   * Create Google Maps service
   */
  getMapsService() {
    return google.places({ version: 'v1', auth: this.oauth2Client })
  }

  /**
   * Create Google Calendar service for a specific user
   */
  async getCalendarServiceForUser(userId: string) {
    const authClient = await this.getAuthorizedClientForUser(userId)
    return google.calendar({ version: 'v3', auth: authClient })
  }

  /**
   * Create Gmail service for a specific user
   */
  async getGmailServiceForUser(userId: string) {
    const authClient = await this.getAuthorizedClientForUser(userId)
    return google.gmail({ version: 'v1', auth: authClient })
  }

  /**
   * Create Google Drive service for a specific user
   */
  async getDriveServiceForUser(userId: string) {
    const authClient = await this.getAuthorizedClientForUser(userId)
    return google.drive({ version: 'v3', auth: authClient })
  }

  /**
   * Create Google Sheets service for a specific user
   */
  async getSheetsServiceForUser(userId: string) {
    const authClient = await this.getAuthorizedClientForUser(userId)
    return google.sheets({ version: 'v4', auth: authClient })
  }

  /**
   * Get spreadsheet data
   * @param userId User ID making the request
   * @param spreadsheetId The ID of the spreadsheet to retrieve data from
   * @param range The A1 notation of the values to retrieve
   */
  async getSpreadsheetData(userId: string, spreadsheetId: string, range: string) {
    const sheets = await this.getSheetsServiceForUser(userId)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    })

    return response.data.values
  }

  /**
   * List all sheets in a spreadsheet
   * @param userId User ID making the request
   * @param spreadsheetId The ID of the spreadsheet to get sheets from
   */
  async listSpreadsheetSheets(userId: string, spreadsheetId: string) {
    const sheets = await this.getSheetsServiceForUser(userId)
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    })
    return response.data.sheets?.map((sheet) => sheet.properties?.title)
  }

  /**
   * List all spreadsheets in the user's Google Drive
   * @param userId User ID making the request
   */
  async listAllSpreadsheets(userId: string) {
    const drive = await this.getDriveServiceForUser(userId)
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      fields: 'files(id, name)',
    })

    return response.data.files
  }

  /**
   * Refresh access token if expired
   * @param userId User ID
   */
  async refreshAccessToken(userId: string) {
    const client = await this.getAuthorizedClientForUser(userId)
    const { credentials } = await client.refreshAccessToken()
    await tokenManager.updateTokens(userId, credentials)
    return credentials
  }

  /**
   * Check if user is authenticated with Google
   * @param userId User ID
   */
  async isUserAuthenticated(userId: string): Promise<boolean> {
    try {
      const tokens = await tokenManager.getTokens(userId)
      return !!tokens
    } catch (error) {
      logger.error('Error checking user authentication:', error)
      return false
    }
  }

  /**
   * Register Google-related routes in Fastify
   */
  registerRoutes(fastify: FastifyInstance) {
    // Authentication route
    fastify.get('/auth', async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/gmail',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets',
      ]

      const authUrl = this.generateAuthUrl(scopes)
      reply.redirect(authUrl)
    })

    // Callback route after user authorization
    fastify.get('/auth/callback', async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      const { code } = request.query as { code: string }

      try {
        const tokens = await this.getTokens(code)
        if (!tokens.access_token || !tokens.refresh_token) {
          throw new Error('Missing access or refresh token')
        }

        await tokenManager.storeTokens(request.userId, {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : undefined,
        })

        return reply.redirect('/settings/integrations?googleAuth=success')
      } catch (error) {
        logger.error('Authentication failed:', error)
        return reply.redirect('/settings/integrations?googleAuth=error')
      }
    })

    // Status check route
    fastify.get('/auth/status', async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      try {
        const isAuthenticated = await this.isUserAuthenticated(request.userId)
        return { authenticated: isAuthenticated }
      } catch (error) {
        logger.error('Error checking authentication status:', error)
        return reply.status(500).send({ error: 'Failed to check authentication status' })
      }
    })

    // Logout route
    fastify.post('/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.userId) {
        return reply.status(401).send({ error: 'Unauthorized' })
      }

      try {
        await tokenManager.deleteTokens(request.userId)
        return { success: true }
      } catch (error) {
        logger.error('Error logging out:', error)
        return reply.status(500).send({ error: 'Failed to logout from Google' })
      }
    })
  }
}

const googleService = new GoogleService()

export default googleService
