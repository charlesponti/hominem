import { db } from '@hominem/utils/db'
import {
  financeAccounts,
  financialInstitutions,
  transactions,
  type FinanceTransaction,
  type FinancialInstitution,
} from '@hominem/utils/schema'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  assertSuccessResponse,
  makeAuthenticatedRequest,
  useApiTestLifecycle,
} from '../../../test/api-test-utils.js'

const { getServer } = useApiTestLifecycle()

// Example seed data (must match Drizzle schema)
const mockInstitution = {
  id: 'inst-1',
  name: 'Test Bank',
  logo: null,
  url: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}
const mockAccount = {
  id: 'acc-1',
  userId: 'test-user-id',
  name: 'Checking',
  type: 'checking',
  balance: '1000',
  mask: null,
  subtype: null,
  institutionId: mockInstitution.id,
  plaidItemId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as const
const mockTransaction = {
  id: 'txn-1',
  userId: 'test-user-id',
  accountId: mockAccount.id,
  amount: '100',
  description: 'Test',
  category: 'Food',
  date: new Date(),
  type: 'expense',
  status: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  merchant: null,
  parentCategory: null,
  source: null,
  isRecurring: null,
  isTransfer: null,
  isPending: null,
  isManual: null,
  isDeleted: null,
  plaidTransactionId: null,
} as const

beforeAll(async () => {
  await db.delete(transactions)
  await db.delete(financeAccounts)
  await db.delete(financialInstitutions)
})

beforeEach(async () => {
  await db.delete(transactions)
  await db.delete(financeAccounts)
  await db.delete(financialInstitutions)
  await db.insert(financialInstitutions).values(mockInstitution)
  await db.insert(financeAccounts).values(mockAccount)
  await db.insert(transactions).values(mockTransaction)
})

afterAll(async () => {
  await db.delete(transactions)
  await db.delete(financeAccounts)
  await db.delete(financialInstitutions)
})

describe.skip('Finance Router', () => {
  it('GET /api/finance/institutions returns institutions', async () => {
    const response = await makeAuthenticatedRequest(getServer(), {
      method: 'GET',
      url: '/api/finance/institutions',
    })
    const body = assertSuccessResponse<FinancialInstitution[]>(response)
    expect(Array.isArray(body)).toBe(true)
    expect(body[0]?.id).toBe(mockInstitution.id)
  })

  it('GET /api/finance/transactions returns transactions', async () => {
    const response = await makeAuthenticatedRequest(getServer(), {
      method: 'GET',
      url: '/api/finance/transactions',
    })
    const body = assertSuccessResponse<FinanceTransaction[]>(response)
    expect(Array.isArray(body)).toBe(true)
    expect(body[0].id).toBe(mockTransaction.id)
  })

  it('POST /api/finance/transactions creates a transaction', async () => {
    const newTransaction = {
      amount: 55,
      description: 'Groceries',
      accountId: mockAccount.id,
      category: 'Food',
      date: new Date(),
      type: 'expense',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const response = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/transactions',
      payload: newTransaction,
    })
    const body = assertSuccessResponse<FinanceTransaction>(response)
    expect(body.amount).toBe(55)
    expect(body.description).toBe('Groceries')
  })

  it('PUT /api/finance/transactions/:id updates a transaction', async () => {
    const response = await makeAuthenticatedRequest(getServer(), {
      method: 'PUT',
      url: `/api/finance/transactions/${mockTransaction.id}`,
      payload: { amount: 200 },
    })
    const body = assertSuccessResponse<FinanceTransaction>(response)
    expect(body.amount).toBe(200)
  })

  it('DELETE /api/finance/transactions/:id deletes a transaction', async () => {
    const response = await makeAuthenticatedRequest(getServer(), {
      method: 'DELETE',
      url: `/api/finance/transactions/${mockTransaction.id}`,
    })
    const body = assertSuccessResponse<{ success: true }>(response)
    expect(body.success).toBe(true)
  })

  it('DELETE /api/finance deletes all finance data', async () => {
    const response = await makeAuthenticatedRequest(getServer(), {
      method: 'DELETE',
      url: '/api/finance',
    })
    const body = assertSuccessResponse<{ success: true }>(response)
    expect(body.success).toBe(true)
  })

  it('GET /api/finance/categories returns categories', async () => {
    const response = await makeAuthenticatedRequest(getServer(), {
      method: 'GET',
      url: '/api/finance/categories',
    })
    const body = assertSuccessResponse(response)
    expect(Array.isArray(body)).toBe(true)
    expect(body).toContain('Food')
  })
})
