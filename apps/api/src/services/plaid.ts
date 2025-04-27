import { Configuration, CountryCode, PlaidApi, PlaidEnvironments, Products } from 'plaid'

// Get the Plaid environment from env variables, default to sandbox
const PLAID_ENV = (process.env.PLAID_ENV || 'sandbox').toLowerCase()

// Set up the Plaid client configuration
const plaidConfig = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
      'Plaid-Version': '2020-09-14',
    },
  },
})

// Initialize the Plaid API client
export const plaidClient = new PlaidApi(plaidConfig)

// Constants for Plaid configuration
export const PLAID_WEBHOOK_URL =
  process.env.PLAID_WEBHOOK_URL || 'https://api.hominem.app/plaid/transactions/webhook'
export const PLAID_REDIRECT_URI = process.env.PLAID_REDIRECT_URI || null
export const PLAID_COUNTRY_CODES = [CountryCode.Us]
export const PLAID_PRODUCTS = [Products.Transactions]
