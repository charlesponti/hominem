import { Hono } from 'hono'
import { randomUUID } from 'node:crypto'
import { env } from '../lib/env.js'
import { TWITTER_SCOPES } from '../lib/twitter-tokens.js'
import { requireAuth } from '../middleware/auth.js'
import { generateCodeChallenge, generateCodeVerifier, pkceStore } from './oauth.twitter.utils.js'

// Twitter OAuth configuration
const TWITTER_CLIENT_ID = env.TWITTER_CLIENT_ID
const TWITTER_REDIRECT_URI = `${env.API_URL}/api/oauth/twitter/callback`

export const oauthTwitterAuthorizeRoutes = new Hono()

// Get Twitter OAuth authorization URL
oauthTwitterAuthorizeRoutes.get('/', requireAuth, async (c) => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Not authorized' }, 401)
  }

  try {
    // Generate state parameter for CSRF protection
    const state = randomUUID()

    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = generateCodeChallenge(codeVerifier)

    // Store state in session or cache (for production, use Redis)
    // For now, we'll include userId in state and verify on callback
    const stateWithUser = `${state}.${userId}`

    // Store PKCE verifier for later use in callback
    pkceStore.set(stateWithUser, codeVerifier)

    const authUrl = new URL('https://x.com/i/oauth2/authorize')
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', TWITTER_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', TWITTER_REDIRECT_URI)
    authUrl.searchParams.set('scope', TWITTER_SCOPES)
    authUrl.searchParams.set('state', stateWithUser)
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')

    return c.json({
      success: true,
      authUrl: authUrl.toString(),
    })
  } catch (error) {
    console.error('Failed to generate Twitter OAuth URL:', error)
    return c.json({ error: 'Failed to generate authorization URL' }, 500)
  }
})
