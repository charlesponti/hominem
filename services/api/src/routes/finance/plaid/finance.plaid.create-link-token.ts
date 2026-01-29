import { success, error } from '@hominem/services';
import { Hono } from 'hono';

import type { AppEnv } from '../../../server';

import { env } from '../../../env';
import { PLAID_COUNTRY_CODES, PLAID_PRODUCTS, plaidClient } from '../../../lib/plaid';

export const financePlaidCreateLinkTokenRoutes = new Hono<AppEnv>();

// Create a new Plaid link token
financePlaidCreateLinkTokenRoutes.post('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(error('UNAUTHORIZED', 'Not authorized'), 401);
  }

  try {
    const createTokenResponse = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Hominem Finance',
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: 'en',
      webhook: `${env.API_URL}/api/finance/plaid/webhook`,
    });

    return c.json(
      success({
        linkToken: createTokenResponse.data.link_token,
        expiration: createTokenResponse.data.expiration,
      }),
      200,
    );
  } catch (err) {
    console.error(`Failed to create Plaid link token: ${err}`);
    return c.json(error('INTERNAL_ERROR', 'Internal Server Error'), 500);
  }
});
