import { Configuration, CountryCode, PlaidApi, PlaidEnvironments, Products } from 'plaid';

import { env } from './env';

const configuration = new Configuration({
  ...(PlaidEnvironments[env.PLAID_ENV] && { basePath: PlaidEnvironments[env.PLAID_ENV] }),
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': env.PLAID_CLIENT_ID,
      'PLAID-SECRET': env.PLAID_API_KEY,
      'Content-Type': 'application/json',
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

export const PLAID_PRODUCTS: Products[] = [Products.Transactions];
export const PLAID_COUNTRY_CODES: CountryCode[] = [CountryCode.Us];
