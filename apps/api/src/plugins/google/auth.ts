import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import type { FastifyInstance } from 'fastify'
import assert from 'node:assert'

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

  /**
   * Generate authentication URL for user consent
   */
  generateAuthUrl(scopes: string[]): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
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
   * Create Google Maps service
   */
  getMapsService() {
    return google.places('v1')
  }

  /**
   * Create Google Calendar service
   */
  getCalendarService() {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    return google.calendar({ version: 'v3', auth: this.oauth2Client as any })
  }

  /**
   * Create Gmail service
   */
  getGmailService() {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    return google.gmail({ version: 'v1', auth: this.oauth2Client as any })
  }

  /**
   * Create Google Drive service
   */
  getDriveService() {
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    return google.drive({ version: 'v3', auth: this.oauth2Client as any })
  }

  /**
   * Refresh access token if expired
   */
  async refreshAccessToken() {
    const { credentials } = await this.oauth2Client.refreshAccessToken()
    this.oauth2Client.setCredentials(credentials)
    return credentials
  }

  /**
   * Register Google-related routes in Fastify
   */
  registerRoutes(fastify: FastifyInstance) {
    // Authentication route
    fastify.get('/auth/google', async (request, reply) => {
      const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/drive',
      ]

      const authUrl = this.generateAuthUrl(scopes)
      reply.redirect(authUrl)
    })

    // Callback route after user authorization
    fastify.get('/auth/google/callback', async (request, reply) => {
      const { code } = request.query as { code: string }

      try {
        const tokens = await this.getTokens(code)
        // TODO Store tokens securely (e.g., in database)
        reply.send({
          message: 'Authentication successful',
          tokens,
        })
      } catch (error) {
        reply.status(500).send({ error: 'Authentication failed' })
      }
    })
  }
}

const googleService = new GoogleService()

export default googleService
