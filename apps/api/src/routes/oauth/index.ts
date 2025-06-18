import { Hono } from 'hono'
import { oauthTwitterAccountsRoutes } from '../oauth.twitter.accounts.js'
import { oauthTwitterAuthorizeRoutes } from '../oauth.twitter.authorize.js'
import { oauthTwitterCallbackRoutes } from '../oauth.twitter.callback.js'
import { oauthTwitterDebugRoutes } from '../oauth.twitter.debug.js'
import { oauthTwitterDisconnectRoutes } from '../oauth.twitter.disconnect.js'
import { oauthTwitterPostRoutes } from '../oauth.twitter.post.js'
import { oauthTwitterSyncRoutes } from '../oauth.twitter.sync.js'

export const oauthRoutes = new Hono()

const twitterRoutes = new Hono()

twitterRoutes.route('/authorize', oauthTwitterAuthorizeRoutes)
twitterRoutes.route('/callback', oauthTwitterCallbackRoutes)
twitterRoutes.route('/accounts', oauthTwitterAccountsRoutes)
twitterRoutes.route('/disconnect', oauthTwitterDisconnectRoutes)
twitterRoutes.route('/post', oauthTwitterPostRoutes)
twitterRoutes.route('/sync', oauthTwitterSyncRoutes)
twitterRoutes.route('/debug', oauthTwitterDebugRoutes)

oauthRoutes.route('/twitter', twitterRoutes)
