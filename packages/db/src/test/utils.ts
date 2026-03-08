// Kysely-compatible test utilities

export const isIntegrationDatabaseAvailable = async (): Promise<boolean> => {
  try {
    const { pool } = await import('../db')
    const result = await pool.query('SELECT 1')
    return result.rowCount === 1
  } catch {
    return false
  }
}

export const createDeterministicIdFactory = (prefix: string) => {
  let counter = 0
  return () => `${prefix}-${counter++}-${Math.random().toString(36).slice(2, 10)}`
}

export const ensureIntegrationUsers = async (): Promise<{
  ownerId: string
  otherUserId: string
}> => {
  const { db } = await import('../db')
  const ownerId = `test-owner-${Date.now()}`
  const otherUserId = `test-other-${Date.now()}`
  
  await db.insertInto('users').values({
    id: ownerId,
    email: `${ownerId}@test.com`,
    name: 'Test Owner',
  }).execute()
  
  await db.insertInto('users').values({
    id: otherUserId,
    email: `${otherUserId}@test.com`,
    name: 'Test Other',
  }).execute()
  
  return { ownerId, otherUserId }
}

export const createTestUser = async (overrides?: { id?: string; email?: string; name?: string }): Promise<string> => {
  const { db } = await import('../db')
  const id = overrides?.id || `test-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  
  await db.insertInto('users').values({
    id,
    email: overrides?.email || `${id}@test.com`,
    name: overrides?.name || 'Test User',
  }).execute()
  
  return id
}

export const cleanupTestData = async (): Promise<void> => {
  // Cleanup is handled by individual tests
}

export const setUserCleanup = (_cleanup: (userId: string) => Promise<void>): void => {
  // No-op for Kysely
}

// Mock utilities for unit tests
export const createDbMocks = () => {
  return {
    db: {},
    client: {},
    mockQueryResult: <T>(data: T[] | T | null): Promise<T[] | T | null> => Promise.resolve(data),
    mockMutationResult: (count = 1): Promise<{ rowCount: number; rows: unknown[] }> => 
      Promise.resolve({ rowCount: count, rows: [] }),
    tableQueries: {},
    mutations: {},
  }
}

export const globalDbMocks = createDbMocks()

export const createTestData = {
  user: (overrides?: Record<string, unknown>) => ({
    id: `test-user-${Date.now()}`,
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
}

export const mockDbOperations = {
  mockFindSuccess: <T>(_table: string, _method: string, _data: T): void => {},
  mockFindNotFound: (_table: string, _method: string): void => {},
  mockDbError: (_table: string, _method: string, _error?: Error): void => {},
  mockInsertSuccess: <T>(_data: T): void => {},
  mockUpdateSuccess: <T>(_data: T): void => {},
  mockDeleteSuccess: (_count?: number): void => {},
}
