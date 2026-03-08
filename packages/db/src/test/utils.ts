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

// Create users with specific IDs (for tests that need deterministic IDs)
export const ensureIntegrationUsers = async (
  users: Array<{ id: string; name: string }>
): Promise<{ ownerId: string; otherUserId: string }> => {
  const { db } = await import('../db')
  
  for (const user of users) {
    await db.insertInto('users').values({
      id: user.id,
      email: `${user.id}@test.com`,
      name: user.name,
    }).execute()
  }
  
  return { ownerId: users[0]?.id || '', otherUserId: users[1]?.id || '' }
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

export const cleanupTestData = async (userIds: string[]): Promise<void> => {
  if (userIds.length === 0) return
  
  const { db } = await import('../db')
  
  // Delete notes for users
  await db.deleteFrom('notes')
    .where('user_id', 'in', userIds)
    .execute()
  
  // Delete users
  await db.deleteFrom('users')
    .where('id', 'in', userIds)
    .execute()
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
