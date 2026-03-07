// import our test-specific environment initializer before anything else
import './test-setup/env';
// Before any other imports, mock the env module so that zod validation
// doesn't run and complain about missing variables. This must happen early.
import { vi } from 'vitest';

vi.mock('./env', () => ({
  env: {
    APP_BASE_URL: 'https://example.com',
    REDIS_URL: 'redis://localhost:6379',
    DATABASE_URL: 'postgres://localhost/test',
    GOOGLE_API_KEY: 'test-key',
    PLAID_CLIENT_ID: '',
    PLAID_API_KEY: '',
    PLAID_ENV: 'sandbox',
    R2_ENDPOINT: 'https://example.com',
    R2_BUCKET_NAME: 'hominem-storage',
    R2_ACCESS_KEY_ID: 'fake',
    R2_SECRET_ACCESS_KEY: 'fake',
  },
}));

import type { Job } from 'bullmq';
// now import test helpers and the code under test using normal ESM imports
import { describe, it, expect, beforeEach } from 'vitest';

// The processor we're testing
import { processSyncJob, plaidClient } from './plaid-sync.processor';

// Mock the finance-services helpers that the processor uses. We only need a
// subset for our unit tests.
vi.mock('@hominem/finance-services', () => ({
  getPlaidItemByUserAndItemId: vi.fn(),
  updatePlaidItemError: vi.fn(),
  // Other helpers may be called by the implementation but we can provide no-op
  // stubs for them to keep the flow from blowing up when not under test.
  upsertAccount: vi.fn(),
  getUserAccounts: vi.fn().mockResolvedValue([]),
  getTransactionByPlaidId: vi.fn(),
  insertTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  updatePlaidItemCursor: vi.fn(),
  updatePlaidItemSyncStatus: vi.fn(),
  getAccountByPlaidId: vi.fn(),
}));

// We don't strictly need the Job type here; use any for simplicity

// We also patch the Plaid API client methods used by the processor. They live
// in the module's closure, so we'll import the module and mutate its
// `plaidClient` directly for simplicity.

type SyncJobData = Parameters<typeof processSyncJob>[0]['data'];

// Helper to create a minimal fake job object.
function makeJob(data: SyncJobData): Job<SyncJobData> {
  // only the fields accessed by processSyncJob are needed
  return {
    id: 'job-id',
    data,
    updateProgress: vi.fn().mockResolvedValue(undefined),
  } as unknown as Job<SyncJobData>;
}

describe('processSyncJob', () => {
  beforeEach(() => {
    console.log('VI KEYS', Object.keys(vi));
    console.log('VI MOCKED', typeof vi.mocked);
    vi.clearAllMocks();
  });

  it('throws when the plaid item is not found and does NOT attempt a DB update', async () => {
    const finance = await import('@hominem/finance-services');
    vi.mocked(finance.getPlaidItemByUserAndItemId).mockResolvedValue(null);

    const job = makeJob({
      userId: 'u1',
      accessToken: 'tok',
      itemId: 'item-abc',
      initialSync: false,
    });

    await expect(processSyncJob(job)).rejects.toThrow(/Plaid item item-abc not found/);
    expect(finance.updatePlaidItemError).not.toHaveBeenCalled();
  });

  it('when an exception occurs after the item lookup, updates the error using the UUID', async () => {
    const finance = await import('@hominem/finance-services');
    const fakeDbItem = { id: 'uuid-123' };
    vi.mocked(finance.getPlaidItemByUserAndItemId).mockResolvedValue(fakeDbItem);
    vi.mocked(finance.updatePlaidItemError).mockResolvedValue(true);

    // cause a failure in one of the later helpers to simulate an error
    vi.mocked(finance.upsertAccount).mockImplementation(() => {
      throw new Error('downstream failure');
    });

    // stub out the plaid client so accounts call returns one account and
    // transactionsSync returns an empty batch; this will exercise upsertAccount
    plaidClient.accountsGet = vi.fn().mockResolvedValue({
      data: {
        accounts: [
          {
            account_id: 'account-1',
            name: 'Test Account',
            type: 'depository',
            balances: { current: 0, available: null, limit: null, iso_currency_code: 'USD' },
          },
        ],
      },
    });
    plaidClient.transactionsSync = vi.fn().mockResolvedValue({
      data: { added: [], modified: [], removed: [], has_more: false },
    });

    const job = makeJob({
      userId: 'u1',
      accessToken: 'tok',
      itemId: 'item-xyz',
      initialSync: false,
    });

    await expect(processSyncJob(job)).rejects.toThrow('downstream failure');
    expect(finance.updatePlaidItemError).toHaveBeenCalledWith(
      fakeDbItem.id,
      expect.stringContaining('downstream failure'),
    );
  });
});
