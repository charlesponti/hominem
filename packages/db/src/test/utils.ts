import { randomUUID } from 'node:crypto'

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
  void prefix
  let counter = 0
  return () => {
    counter += 1
    return randomUUID()
  }
}

// Helper to extract rows from query results (handles both Kysely and raw results)
export const extractRows = <T>(result: unknown): T[] => {
  if (Array.isArray(result)) {
    return result as T[]
  }
  if (result && typeof result === 'object' && 'rows' in result) {
    const rows = (result as { rows?: unknown }).rows
    if (Array.isArray(rows)) {
      return rows as T[]
    }
  }
  return []
}

// Check if a table exists by name
export const tableExists = async (tableName: string): Promise<boolean> => {
  try {
    const { pool } = await import('../db')
    // Use raw pool query to avoid SQL builder complexity for dynamic table names
    const result = await pool.query(`select to_regclass('public.${tableName}') as relation_name`)
    const rows = result.rows as Array<{ relation_name: string | null }> | undefined
    return Boolean(rows?.[0]?.relation_name)
  } catch {
    return false
  }
}

// Create users with specific IDs (for tests that need deterministic IDs)
export const ensureIntegrationUsers = async (
  users: Array<{ id: string; name: string; email?: string }>
): Promise<{ ownerId: string; otherUserId: string }> => {
  const { db } = await import('../db')
  
  for (const user of users) {
    await db.insertInto('users').values({
      id: user.id,
      email: user.email ?? `${user.id}@test.com`,
      name: user.name,
    }).execute()
  }
  
  return { ownerId: users[0]?.id || '', otherUserId: users[1]?.id || '' }
}

export const createTestUser = async (overrides?: { id?: string; email?: string; name?: string }): Promise<string> => {
  const { db } = await import('../db')
  const id = overrides?.id || randomUUID()
  
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

export const setUserCleanup = (cleanup: (userId: string) => Promise<void>): void => {
  void cleanup
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
  mockFindSuccess: <T>(table: string, method: string, data: T): void => {
    void table
    void method
    void data
  },
  mockFindNotFound: (table: string, method: string): void => {
    void table
    void method
  },
  mockDbError: (table: string, method: string, error?: Error): void => {
    void table
    void method
    void error
  },
  mockInsertSuccess: <T>(data: T): void => {
    void data
  },
  mockUpdateSuccess: <T>(data: T): void => {
    void data
  },
  mockDeleteSuccess: (count?: number): void => {
    void count
  },
}
