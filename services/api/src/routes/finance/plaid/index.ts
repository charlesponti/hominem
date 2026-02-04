import { Hono } from 'hono';

import type { AppEnv } from '../../../server';

import { financePlaidCreateLinkTokenRoutes } from './finance.plaid.create-link-token';
import { financePlaidDisconnectRoutes } from './finance.plaid.disconnect';
import { financePlaidExchangeTokenRoutes } from './finance.plaid.exchange-token';
import { financePlaidSyncRoutes } from './finance.plaid.sync';
import { financePlaidWebhookRoutes } from './finance.plaid.webhook';

export const plaidRoutes = new Hono<AppEnv>();

plaidRoutes.route('/create-link-token', financePlaidCreateLinkTokenRoutes);
plaidRoutes.route('/exchange-token', financePlaidExchangeTokenRoutes);
plaidRoutes.route('/sync', financePlaidSyncRoutes);
plaidRoutes.route('/connections', financePlaidDisconnectRoutes);
plaidRoutes.route('/webhook', financePlaidWebhookRoutes);
