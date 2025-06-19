import { Hono } from 'hono'
import { oauthTwitterAccountsRoutes } from '../oauth.twitter.accounts.js'
import { oauthTwitterAuthorizeRoutes } from '../oauth.twitter.authorize.js'
import { oauthTwitterCallbackRoutes } from '../oauth.twitter.callback.js'
import { oauthTwitterDebugRoutes } from '../oauth.twitter.debug.js'
import { oauthTwitterDisconnectRoutes } from '../oauth.twitter.disconnect.js'

export const oauthRoutes = new Hono()

const twitterRoutes = new Hono()

twitterRoutes.route('/authorize', oauthTwitterAuthorizeRoutes)
twitterRoutes.route('/callback', oauthTwitterCallbackRoutes)
twitterRoutes.route('/accounts', oauthTwitterAccountsRoutes)
twitterRoutes.route('/disconnect', oauthTwitterDisconnectRoutes)
twitterRoutes.route('/debug', oauthTwitterDebugRoutes)

// NOTE: Twitter post and sync routes have been moved to:
// - /api/content/twitter/post (was /api/oauth/twitter/post)
// - /api/content/twitter/sync (was /api/oauth/twitter/sync)

oauthRoutes.route('/twitter', twitterRoutes)
