import { Hono } from 'hono'
import { oauthTwitterCallbackRoutes } from './oauth.twitter.callback.js'
import { oauthTwitterDebugRoutes } from './oauth.twitter.debug.js'

export const oauthRoutes = new Hono()

const twitterRoutes = new Hono()

twitterRoutes.route('/callback', oauthTwitterCallbackRoutes)
twitterRoutes.route('/debug', oauthTwitterDebugRoutes)

oauthRoutes.route('/twitter', twitterRoutes)
