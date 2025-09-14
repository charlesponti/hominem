import { Hono } from 'hono'
import { oauthTwitterCallbackRoutes } from './oauth.twitter.callback.js'

export const oauthRoutes = new Hono()

const twitterRoutes = new Hono()

twitterRoutes.route('/callback', oauthTwitterCallbackRoutes)

oauthRoutes.route('/twitter', twitterRoutes)
