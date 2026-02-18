/* eslint-disable @typescript-eslint/no-explicit-any */
import { cleanupFinanceTestData, seedFinanceTestData } from '@hominem/db/test/utils';
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

// Mock Plaid - with mock methods for testing
vi.mock('plaid', () => {
  const mockLinkTokenCreate = vi.fn(async () => ({
    data: {
      link_token: 'link-sandbox-123456789',
      expiration: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      request_id: 'req-123456789',
    },
  }));

  const mockItemPublicTokenExchange = vi.fn(async () => ({
    data: {
      access_token: 'access-sandbox-123456789',
      item_id: 'item-123456789',
      request_id: 'req-123456789',
    },
  }));

  class Configuration {}
  class PlaidApi {
    linkTokenCreate = mockLinkTokenCreate;
    itemPublicTokenExchange = mockItemPublicTokenExchange;
  }
  return {
    Configuration,
    PlaidApi,
    PlaidEnvironments: { Sandbox: 'https://sandbox.plaid.com' },
    Products: { Transactions: 'transactions' },
    CountryCode: { Us: 'US' },
    mockLinkTokenCreate,
    mockItemPublicTokenExchange,
  };
});

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
      // Get the mocked functions from the plaid module
      const plaid = await import('plaid');
      const mockLinkTokenCreate = vi.mocked((plaid as any).mockLinkTokenCreate);
      mockLinkTokenCreate.mockRejectedValueOnce(new Error('Plaid API Error'));

      const response = await makeAuthenticatedRequest(getServer(), {
        method: 'POST',
        url: '/api/finance/plaid/create-link-token',
        headers: {
          'x-user-id': testUserId,
        },
      });
      // When Plaid throws an error, the API should handle it and return an error response
      const body = await assertErrorResponse(response, 500);
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
