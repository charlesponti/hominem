import { describe, expect, expectTypeOf, it } from 'vitest';

import { customFetch } from './core/api-client';
import { createFinanceApiClient, type FinanceClient } from './finance';

describe('createFinanceApiClient', () => {
  it('returns a client shaped like the finance router (not the full app)', () => {
    const client = createFinanceApiClient({ baseUrl: 'http://test.local' });

    expect(client.transactions).toBeDefined();
    expect(client.accounts).toBeDefined();
    expect(client.tags).toBeDefined();
  });
});

describe('customFetch (shared error-wrapping behavior)', () => {
  it('rejects with a status-carrying Error on a non-ok response', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('not found', { status: 404 });

    try {
      const wrappedFetch = customFetch({ baseUrl: 'http://test.local' });
      await expect(wrappedFetch('http://test.local/anything')).rejects.toMatchObject({
        status: 404,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('FinanceClient type', () => {
  it('has no non-finance branches (regression guard against widening back to the root AppType)', () => {
    expectTypeOf<FinanceClient>().not.toHaveProperty('career');
    expectTypeOf<FinanceClient>().not.toHaveProperty('chats');
    expectTypeOf<FinanceClient>().toHaveProperty('transactions');
    expectTypeOf<FinanceClient>().toHaveProperty('accounts');
  });
});
