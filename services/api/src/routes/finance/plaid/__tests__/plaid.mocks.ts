import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

/**
 * MSW handlers for Plaid API
 * Mocks sandbox.plaid.com endpoints
 */

const PLAID_BASE_URL = 'https://sandbox.plaid.com'

// Handler for linkTokenCreate endpoint
export const plaidLinkTokenCreateHandler = http.post(`${PLAID_BASE_URL}/link/token/create`, () => {
  return HttpResponse.json({
    link_token: 'link-sandbox-123456789',
    expiration: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    request_id: 'req-123456789',
  })
})

// Handler for itemPublicTokenExchange endpoint
export const plaidItemPublicTokenExchangeHandler = http.post(
  `${PLAID_BASE_URL}/item/public_token/exchange`,
  () => {
    return HttpResponse.json({
      access_token: 'access-sandbox-123456789',
      item_id: 'item-123456789',
      request_id: 'req-123456789',
    })
  },
)

// Handler for accountsGet endpoint
export const plaidAccountsGetHandler = http.post(`${PLAID_BASE_URL}/accounts/get`, () => {
  return HttpResponse.json({
    accounts: [
      {
        account_id: 'account-123456789',
        balances: {
          available: 1000.0,
          current: 1000.0,
          iso_currency_code: 'USD',
          limit: null,
          unofficial_currency_code: null,
        },
        mask: '1234',
        name: 'Test Checking Account',
        official_name: 'Test Checking Account',
        subtype: 'checking',
        type: 'depository',
      },
    ],
    item: {
      available_products: [],
      billed_products: [],
      error: null,
      institution_id: 'ins_123456789',
      item_id: 'item-123456789',
      products: [],
      request_id: 'req-123456789',
      webhook: null,
    },
    request_id: 'req-123456789',
  })
})

// Handler for itemRemove endpoint
export const plaidItemRemoveHandler = http.post(`${PLAID_BASE_URL}/item/remove`, () => {
  return HttpResponse.json({
    removed: true,
    request_id: 'req-123456789',
  })
})

/**
 * Error handlers for testing error scenarios
 */
export const plaidErrorHandlers = {
  linkTokenCreateError: http.post(`${PLAID_BASE_URL}/link/token/create`, () => {
    return HttpResponse.json(
      {
        error_type: 'INVALID_REQUEST',
        error_code: 'INVALID_REQUEST',
        error_message: 'Invalid request',
        display_message: 'Invalid request',
      },
      { status: 400 },
    )
  }),

  itemPublicTokenExchangeError: http.post(
    `${PLAID_BASE_URL}/item/public_token/exchange`,
    () => {
      return HttpResponse.json(
        {
          error_type: 'INVALID_REQUEST',
          error_code: 'INVALID_REQUEST',
          error_message: 'Invalid request',
          display_message: 'Invalid request',
        },
        { status: 400 },
      )
    },
  ),
}

/**
 * Setup MSW server with default handlers
 */
export const plaidMswServer = setupServer(
  plaidLinkTokenCreateHandler,
  plaidItemPublicTokenExchangeHandler,
  plaidAccountsGetHandler,
  plaidItemRemoveHandler,
)
