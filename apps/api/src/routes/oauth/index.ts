import { Hono } from 'hono'
import { oauthTwitterAuthorizeRoutes } from './oauth.twitter.authorize.js'
import { oauthTwitterCallbackRoutes } from './oauth.twitter.callback.js'
import { oauthTwitterDebugRoutes } from './oauth.twitter.debug.js'

export const oauthRoutes = new Hono()

const twitterRoutes = new Hono()

twitterRoutes.route('/authorize', oauthTwitterAuthorizeRoutes)
twitterRoutes.route('/callback', oauthTwitterCallbackRoutes)
twitterRoutes.route('/debug', oauthTwitterDebugRoutes)

// NOTE: Twitter accounts, disconnect, post and sync routes have been moved to tRPC:
// - trpc.twitter.accounts (was /api/oauth/twitter/accounts)
// - trpc.twitter.disconnect (was /api/oauth/twitter/disconnect)
// - trpc.twitter.post (was /api/oauth/twitter/post)
// - trpc.twitter.sync (was /api/oauth/twitter/sync)

oauthRoutes.route('/twitter', twitterRoutes)
