import { Hono } from 'hono'
import { financePlaidCreateLinkTokenRoutes } from './finance.plaid.create-link-token.js'
import { financePlaidDisconnectRoutes } from './finance.plaid.disconnect.js'
import { financePlaidExchangeTokenRoutes } from './finance.plaid.exchange-token.js'
import { financePlaidSyncRoutes } from './finance.plaid.sync.js'
import { financePlaidWebhookRoutes } from './finance.plaid.webhook.js'

export const plaidRoutes = new Hono()

plaidRoutes.route('/create-link-token', financePlaidCreateLinkTokenRoutes)
plaidRoutes.route('/exchange-token', financePlaidExchangeTokenRoutes)
plaidRoutes.route('/sync', financePlaidSyncRoutes)
plaidRoutes.route('/connections', financePlaidDisconnectRoutes)
plaidRoutes.route('/webhook', financePlaidWebhookRoutes)
