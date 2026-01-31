import crypto from 'node:crypto';
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
export const PLAID_REDIRECT_URI = null;

/**
 * Verify webhook signature from Plaid
 * @see https://plaid.com/docs/api/webhook-verification/
 */
export function verifyPlaidWebhookSignature(
  headers: Record<string, string | string[] | undefined>,
  body: string,
): boolean {
  // Skip verification if no webhook secret is provided
  if (!env.PLAID_WEBHOOK_SECRET) {
    console.warn('PLAID_WEBHOOK_SECRET not set, skipping webhook signature verification');
    return true;
  }

  try {
    const signatureHeader = headers['plaid-webhook-signature'];

    if (!signatureHeader || Array.isArray(signatureHeader)) {
      console.warn('Invalid Plaid webhook signature header');
      return false;
    }

    // Split the signature header into its components
    const components = signatureHeader.split(',');
    const signatureMap: Record<string, string> = {};

    for (const component of components) {
      const [key, value] = component.split('=');
      if (key && value) {
        signatureMap[key.trim()] = value.trim();
      }
    }

    const receivedSignature = signatureMap.t;
    const givenSignature = signatureMap.v1;

    if (!(receivedSignature && givenSignature)) {
      console.warn('Missing required signature components');
      return false;
    }

    // Verify the signature
    const expectedSignature = crypto
      .createHmac('sha256', env.PLAID_WEBHOOK_SECRET)
      .update(`${receivedSignature}.${body}`)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(givenSignature), Buffer.from(expectedSignature));
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}
