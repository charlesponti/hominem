import { cleanupFinanceTestData, seedFinanceTestData } from '@hominem/db/test/utils';
import crypto from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import {
  assertErrorResponse,
  assertSuccessResponse,
  makeAuthenticatedRequest,
  useApiTestLifecycle,
} from '@/test/api-test-utils';

// MSW Plaid API handlers
const PLAID_BASE_URL = 'https://sandbox.plaid.com';

const plaidDefaultHandlers = [
  http.post(`${PLAID_BASE_URL}/link/token/create`, () => {
    return HttpResponse.json({
      link_token: 'link-sandbox-123456789',
      expiration: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      request_id: 'req-123456789',
    });
  }),

  http.post(`${PLAID_BASE_URL}/item/public_token/exchange`, () => {
    return HttpResponse.json({
      access_token: 'access-sandbox-123456789',
      item_id: 'item-123456789',
      request_id: 'req-123456789',
    });
  }),

  http.post(`${PLAID_BASE_URL}/accounts/get`, () => {
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
        institution_id: 'ins-123456789',
        item_id: 'item-123456789',
        products: [],
        request_id: 'req-123456789',
        webhook: null,
      },
      request_id: 'req-123456789',
    });
  }),

  http.post(`${PLAID_BASE_URL}/item/remove`, () => {
    return HttpResponse.json({
      removed: true,
      request_id: 'req-123456789',
    });
  }),
];

const plaidMswServer = setupServer(...plaidDefaultHandlers);

const plaidErrorHandlers = {
  linkTokenCreateError: http.post(`${PLAID_BASE_URL}/link/token/create`, () => {
    return HttpResponse.json(
      {
        error_type: 'INVALID_REQUEST',
        error_code: 'INVALID_REQUEST',
        error_message: 'Invalid request',
        display_message: 'Invalid request',
      },
      { status: 400 },
    );
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
      );
    },
  ),
};

// Mock BullMQ Queue
const { mockQueueAdd, mockQueueClose } = vi.hoisted(() => {
  const mockQueueAdd = vi.fn();
  const mockQueueClose = vi.fn(() => Promise.resolve());
  return { mockQueueAdd, mockQueueClose };
});

vi.mock('bullmq', () => {
  class MockQueue {
    add = mockQueueAdd;
    close = mockQueueClose;
  }
  return {
    Queue: MockQueue,
  };
});

// Mock Plaid - we'll handle requests through MSW
vi.mock('plaid', () => {
  class Configuration {}
  class PlaidApi {
    constructor() {}
  }
  return {
    Configuration,
    PlaidApi,
    PlaidEnvironments: { Sandbox: 'https://sandbox.plaid.com' },
    Products: { TRANSACTIONS: 'transactions' },
    CountryCode: { US: 'US' },
  };
});

vi.mock('@/src/lib/plaid', () => ({
  verifyPlaidWebhookSignature: vi.fn(),
  PLAID_COUNTRY_CODES: ['US'],
  PLAID_PRODUCTS: ['transactions'],
}));

interface PlaidApiResponse {
  linkToken?: string;
  expiration?: string;
  requestId?: string;
  message?: string;
  error?: string;
  details?: unknown;
}

describe('Plaid Router', () => {
  const { getServer } = useApiTestLifecycle();

  let testUserId: string;
  let testAccountId: string;
  let testInstitutionId: string;

  // Setup MSW server
  beforeAll(() => {
    plaidMswServer.listen({ onUnhandledRequest: 'error' });
  });

  afterAll(() => {
    plaidMswServer.close();
  });

  beforeEach(() => {
    plaidMswServer.resetHandlers();
  });

  // Ensure each test has fresh, isolated data
  beforeAll(async () => {
    testUserId = crypto.randomUUID();
    testAccountId = crypto.randomUUID();
    testInstitutionId = crypto.randomUUID();

    // Seed fresh test data for this test (with plaid options)
    await seedFinanceTestData({
      userId: testUserId,
      accountId: testAccountId,
      institutionId: testInstitutionId,
      plaid: true,
    });
    vi.clearAllMocks();
  });

  // Clean up after each test to prevent data leakage
  afterAll(async () => {
    await cleanupFinanceTestData({
      userId: testUserId,
      accountId: testAccountId,
      institutionId: testInstitutionId,
    });
  });

  describe('POST /api/finance/plaid/create-link-token', () => {
    test('creates link token successfully', async () => {
      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/finance/plaid/create-link-token',
        headers: {
          'x-user-id': testUserId,
        },
      });

      const body = (await assertSuccessResponse(response)) as PlaidApiResponse;
      expect(body.linkToken).toBeDefined();
      expect(body.expiration).toBeDefined();
      expect(body.requestId).toBeDefined();
    });

    test('handles plaid client error', async () => {
      // Override handler to return error
      plaidMswServer.use(plaidErrorHandlers.linkTokenCreateError);

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/finance/plaid/create-link-token',
        headers: {
          'x-user-id': testUserId,
        },
      });
      // When Plaid returns 400, the API should handle it and return an error response
      const body = await assertErrorResponse(response);
      expect(body).toBeDefined();
    });
  });

  describe('POST /api/finance/plaid/exchange-token', () => {
    test('exchanges token successfully for new institution', async () => {
      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/finance/plaid/exchange-token',
        payload: {
          publicToken: 'test-public-token',
          institutionId: 'test-institution-id',
          institutionName: 'Test Bank',
        },
        headers: {
          'x-user-id': testUserId,
        },
      });

      await assertSuccessResponse(response);
    });

    test('validates required fields', async () => {
      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/finance/plaid/exchange-token',
        payload: {
          // Missing required fields
        },
        headers: {
          'x-user-id': testUserId,
        },
      });

      await assertErrorResponse(response, 400);
    });
  });
});
