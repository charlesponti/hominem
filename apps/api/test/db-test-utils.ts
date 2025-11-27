import { db } from '@hominem/data'
import { eq } from 'drizzle-orm'
import { bookmark, users } from '@hominem/data/schema'
import { vi } from 'vitest'
import { createTestUser as createTestUserShared } from '@hominem/utils/test-fixtures'

// Track created test users for cleanup
const createdTestUsers: string[] = []

/**
 * Database mock factory for different table operations
 */
export const createDbMocks = () => {
  const mockQueryResult = <T>(data: T[] | T | null = null) => {
    if (Array.isArray(data)) {
      return Promise.resolve(data)
    }
    return Promise.resolve(data)
  }

  const mockMutationResult = (count = 1) => {
    return Promise.resolve({ rowCount: count, rows: [] })
  }

  // Table-specific query mocks
  const tableQueries = {
    users: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    financialInstitutions: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    plaidItems: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    financeAccounts: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    transactions: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    subscriptions: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    places: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  }

  // Mutation mocks
  const mutations = {
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  }

  const db = {
    query: tableQueries,
    ...mutations,
  }

  const client = {
    end: vi.fn(() => Promise.resolve()),
    connect: vi.fn(() => Promise.resolve()),
  }

  return {
    db,
    client,
    mockQueryResult,
    mockMutationResult,
    tableQueries,
    mutations,
  }
}

/**
 * Global database mocks - use this with top-level vi.mock
 */
export const globalDbMocks = createDbMocks()

/**
 * Test data factory for common database entities
 */
export const createTestData = {
  user: (overrides = {}) => ({
    id: 'user-test-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  financialInstitution: (overrides = {}) => ({
    id: 'fi-test-id',
    userId: 'user-test-id',
    name: 'Test Bank',
    logo: 'logo.png',
    primaryColor: '#000000',
    plaidInstitutionId: 'ins_test',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  plaidItem: (overrides = {}) => ({
    id: 'plaid-item-test-id',
    userId: 'user-test-id',
    institutionId: 'fi-test-id',
    itemId: 'item_test_id',
    accessToken: 'access-test-token',
    status: 'active' as const,
    error: null,
    consentExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    transactionsCursor: null,
    lastSyncedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  financeAccount: (overrides = {}) => ({
    id: 'fa-test-id',
    userId: 'user-test-id',
    plaidItemId: 'plaid-item-test-id',
    institutionId: 'fi-test-id',
    name: 'Test Account',
    officialName: 'Test Account Official Name',
    type: 'depository' as const,
    subtype: 'checking' as const,
    mask: '0000',
    balance: '1000.00', // Using string for numeric type
    interestRate: null,
    minimumPayment: null,
    isoCurrencyCode: 'USD',
    plaidAccountId: 'plaid-acc-test-id',
    limit: null,
    meta: null,
    lastUpdated: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
  // Added plaidAccount factory for Plaid API response mocking
  plaidAccount: (overrides = {}) => ({
    account_id: 'plaid-acc-test-id',
    name: 'Plaid Test Account',
    official_name: 'Plaid Test Account Official Name',
    type: 'depository' as const,
    subtype: 'checking' as const,
    mask: '1111',
    balances: {
      current: 1200.0,
      available: 1150.0,
      iso_currency_code: 'USD',
      limit: null,
      unofficial_currency_code: null,
    },
    persistent_account_id: 'persistent-plaid-acc-id',
    verification_status: 'automatically_verified',
    ...overrides,
  }),
  transaction: (overrides = {}) => ({
    id: 'test-transaction-id',
    plaidTransactionId: 'test-plaid-transaction-id',
    accountId: 'test-account-id',
    userId: 'test-user-id',
    amount: 25.5,
    date: new Date(),
    name: 'Test Transaction',
    merchantName: 'Test Merchant',
    category: ['Food and Drink', 'Restaurants'],
    subcategory: 'Restaurants',
    pending: false,
    isoCurrencyCode: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  place: (overrides = {}) => ({
    id: 'test-place-id',
    googleMapsId: 'test-google-id',
    name: 'Test Place',
    address: '123 Test St, Test City, TS 12345',
    latitude: 40.7128,
    longitude: -74.006,
    types: ['restaurant'],
    imageUrl: 'https://example.com/image.jpg',
    photos: ['https://example.com/photo1.jpg'],
    userId: 'test-user-id',
    location: [40.7128, -74.006],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
}

// Define table names type separately to avoid circular reference
type TableName =
  | 'users'
  | 'financialInstitutions'
  | 'plaidItems'
  | 'financeAccounts'
  | 'transactions'
  | 'subscriptions'
  | 'places'

/**
 * Common database operation patterns for tests
 * These work with the globalDbMocks instance
 */
export const mockDbOperations = {
  /**
   * Mock a successful find operation
   */
  mockFindSuccess: <T>(table: TableName, method: string, data: T) => {
    const tableMock = globalDbMocks.tableQueries[table]
    if (tableMock?.[method as keyof typeof tableMock]) {
      vi.mocked(tableMock[method as keyof typeof tableMock]).mockResolvedValue(data)
    }
  },

  /**
   * Mock a not found result
   */
  mockFindNotFound: (table: TableName, method: string) => {
    const tableMock = globalDbMocks.tableQueries[table]
    if (tableMock?.[method as keyof typeof tableMock]) {
      vi.mocked(tableMock[method as keyof typeof tableMock]).mockResolvedValue(null)
    }
  },

  /**
   * Mock a database error
   */
  mockDbError: (table: TableName, method: string, error = new Error('Database error')) => {
    const tableMock = globalDbMocks.tableQueries[table]
    if (tableMock?.[method as keyof typeof tableMock]) {
      vi.mocked(tableMock[method as keyof typeof tableMock]).mockRejectedValue(error)
    }
  },

  /**
   * Mock successful insert operation
   */
  mockInsertSuccess: <T>(data: T) => {
    vi.mocked(globalDbMocks.mutations.insert).mockReturnValue({
      values: vi.fn().mockResolvedValue(data),
    } as never)
  },

  /**
   * Mock successful update operation
   */
  mockUpdateSuccess: <T>(data: T) => {
    vi.mocked(globalDbMocks.mutations.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(data),
      }),
    } as never)
  },

  /**
   * Mock successful delete operation
   */
  mockDeleteSuccess: (count = 1) => {
    vi.mocked(globalDbMocks.mutations.delete).mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowCount: count }),
    } as never)
  },
}

/**
 * Creates a test user in the database and returns the user ID
 */
export const createTestUser = async (overrides = {}): Promise<string> => {
  const user = await createTestUserShared(overrides)
  createdTestUsers.push(user.id)
  return user.id
}

/**
 * Cleans up test data from the database
 */
export const cleanupTestData = async (): Promise<void> => {
  // Clean up test data
  for (const userId of createdTestUsers) {
    await db.delete(bookmark).where(eq(bookmark.userId, userId))
    await db.delete(users).where(eq(users.id, userId))
  }

  // Clear the tracking array
  createdTestUsers.length = 0
}
