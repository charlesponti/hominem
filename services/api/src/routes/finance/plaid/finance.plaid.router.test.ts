import { financeTestSeed } from '@hominem/finance-services';
import crypto from 'node:crypto';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import {
  assertErrorResponse,
  assertSuccessResponse,
  makeAuthenticatedRequest,
  useApiTestLifecycle,
} from '@/test/api-test-utils';

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

// Mock Plaid client
vi.mock('plaid', () => {
  class MockPlaidApi {
    linkTokenCreate = vi.fn();
    itemPublicTokenExchange = vi.fn();
  }
  return {
    Configuration: vi.fn(),
    PlaidEnvironments: {},
    Products: {},
    CountryCode: {},
    PlaidApi: MockPlaidApi,
  };
});

vi.mock('@/lib/plaid', () => ({
  plaidClient: {
    linkTokenCreate: vi.fn(),
    itemPublicTokenExchange: vi.fn(),
    itemRemove: vi.fn(),
    accountsGet: vi.fn(),
  },
  verifyPlaidWebhookSignature: vi.fn(),
  PLAID_COUNTRY_CODES: ['US'],
  PLAID_PRODUCTS: ['transactions'],
}));

interface PlaidApiResponse {
  success?: boolean;
  linkToken?: string;
  expiration?: string;
  message?: string;
  error?: string;
  details?: unknown;
  deletedData?: {
    accounts: number;
    transactions: string | number;
    institution: number;
  };
  received?: boolean;
}

describe('Plaid Router', () => {
  const { getServer } = useApiTestLifecycle();

  let testUserId: string;
  let testAccountId: string;
  let testInstitutionId: string;

  // Ensure each test has fresh, isolated data
  beforeAll(async () => {
    testUserId = crypto.randomUUID();
    testAccountId = crypto.randomUUID();
    testInstitutionId = crypto.randomUUID();

    // Seed fresh test data for this test (with plaid options)
    await financeTestSeed.seedFinanceTestData({
      userId: testUserId,
      accountId: testAccountId,
      institutionId: testInstitutionId,
      plaid: true,
    });
    vi.clearAllMocks();
  });

  // Clean up after each test to prevent data leakage
  afterAll(async () => {
    await financeTestSeed.cleanupFinanceTestData({
      userId: testUserId,
      accountId: testAccountId,
      institutionId: testInstitutionId,
    });
  });

  describe('POST /api/finance/plaid/create-link-token', () => {
    test('creates link token successfully', async () => {
      const { plaidClient } = await import('@/lib/plaid');

      vi.mocked(plaidClient.linkTokenCreate).mockResolvedValue({
        data: {
          link_token: 'test-link-token',
          expiration: '2025-05-26T00:00:00Z',
        },
      } as never);

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/finance/plaid/create-link-token',
        headers: {
          'x-user-id': testUserId,
        },
      });

      const body = (await assertSuccessResponse(response)) as PlaidApiResponse;
      expect(body.success).toBe(true);
      expect(body.linkToken).toBe('test-link-token');
      expect(body.expiration).toBe('2025-05-26T00:00:00Z');
    });

    test('handles plaid client error', async () => {
      const { plaidClient } = await import('@/lib/plaid');

      vi.mocked(plaidClient.linkTokenCreate).mockRejectedValue(new Error('Plaid error'));

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/finance/plaid/create-link-token',
        headers: {
          'x-user-id': testUserId,
        },
      });
      const body = await assertErrorResponse(response);
      expect(body.error).toBe('Internal Server Error');
    });
  });

  describe('POST /api/finance/plaid/exchange-token', () => {
    test.skip('exchanges token successfully for new institution', async () => {
      const { plaidClient } = await import('@/lib/plaid');

      vi.mocked(plaidClient.itemPublicTokenExchange).mockResolvedValue({
        data: {
          access_token: 'test-access-token',
          item_id: 'test-item-id',
        },
      } as never);

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
