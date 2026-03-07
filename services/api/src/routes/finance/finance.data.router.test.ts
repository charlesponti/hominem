import crypto from 'node:crypto'

import { db, sql } from '@hominem/db'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import {
  assertErrorResponse,
  makeAuthenticatedRequest,
  useApiTestLifecycle,
} from '@/test/api-test-utils'
import {
  cleanupFinanceUserData,
  createFinanceAccountFixture,
  createFinanceUserPair,
} from '@/test/finance-test-harness'

describe('Finance Data/Runway Router', () => {
  const { getServer } = useApiTestLifecycle()

  let ownerId: string
  let otherUserId: string
  let ownerAccountId: string
  let otherAccountId: string

  beforeAll(async () => {
    const pair = await createFinanceUserPair()
    ownerId = pair.ownerId
    otherUserId = pair.otherUserId
    ownerAccountId = crypto.randomUUID()
    otherAccountId = crypto.randomUUID()

    await createFinanceAccountFixture({
      id: ownerAccountId,
      userId: ownerId,
      name: 'Owner Account',
      balance: '1200.00',
    })
    await createFinanceAccountFixture({
      id: otherAccountId,
      userId: otherUserId,
      name: 'Other Account',
      balance: '800.00',
    })

    await db.execute(sql`
      insert into finance_transactions (id, user_id, account_id, amount, transaction_type, description, date)
      values
        (${crypto.randomUUID()}, ${ownerId}, ${ownerAccountId}, ${-25}, ${'expense'}, ${'Owner Tx'}, ${'2026-03-01'}),
        (${crypto.randomUUID()}, ${otherUserId}, ${otherAccountId}, ${-45}, ${'expense'}, ${'Other Tx'}, ${'2026-03-01'})
    `)
  })

  afterAll(async () => {
    await cleanupFinanceUserData({
      userIds: [ownerId, otherUserId],
      accountIds: [ownerAccountId, otherAccountId],
    })
  })

  test('returns export payload for authenticated user only', async () => {
    const response = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/export/all',
      headers: {
        'x-user-id': ownerId,
      },
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      accounts: Array<{ userId: string }>
      transactions: Array<{ userId: string }>
    }
    expect(body.accounts.length).toBeGreaterThanOrEqual(1)
    expect(body.transactions.length).toBeGreaterThanOrEqual(1)
    expect(body.accounts.every((account) => account.userId === ownerId)).toBe(true)
    expect(body.transactions.every((transaction) => transaction.userId === ownerId)).toBe(true)
  })

  test('delete-all removes only authenticated user data', async () => {
    const response = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/data/delete-all',
      payload: {
        confirm: true,
      },
      headers: {
        'x-user-id': ownerId,
      },
    })

    expect(response.status).toBe(200)

    const ownerExportResponse = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/export/all',
      headers: {
        'x-user-id': ownerId,
      },
    })
    expect(ownerExportResponse.status).toBe(200)
    const ownerExport = (await ownerExportResponse.json()) as {
      accounts: Array<{ id: string }>
      transactions: Array<{ id: string }>
    }
    expect(ownerExport.accounts).toHaveLength(0)
    expect(ownerExport.transactions).toHaveLength(0)

    const otherExportResponse = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/export/all',
      headers: {
        'x-user-id': otherUserId,
      },
    })
    expect(otherExportResponse.status).toBe(200)
    const otherExport = (await otherExportResponse.json()) as {
      accounts: Array<{ id: string }>
      transactions: Array<{ id: string }>
    }
    expect(otherExport.accounts.length).toBeGreaterThanOrEqual(1)
    expect(otherExport.transactions.length).toBeGreaterThanOrEqual(1)
  })

  test('requires auth and validation for data operations', async () => {
    const unauth = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/data/delete-all',
      payload: {
        confirm: true,
      },
    })
    await assertErrorResponse(unauth, 401)

    const invalid = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/data/delete-all',
      payload: {
        confirm: false,
      },
      headers: {
        'x-user-id': otherUserId,
      },
    })
    await assertErrorResponse(invalid, 400)
  })

  test('calculates runway and calculators with numeric normalization', async () => {
    const runwayResponse = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/runway/calculate',
      payload: {
        balance: '12000',
        monthlyExpenses: '4000',
      },
      headers: {
        'x-user-id': otherUserId,
      },
    })
    expect(runwayResponse.status).toBe(200)
    const runwayBody = (await runwayResponse.json()) as { runwayMonths: number }
    expect(runwayBody.runwayMonths).toBe(3)

    const loanResponse = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/runway/loan-details',
      payload: {
        principal: '12000',
        annualRate: '12',
        months: '12',
      },
      headers: {
        'x-user-id': otherUserId,
      },
    })
    expect(loanResponse.status).toBe(200)
    const loanBody = (await loanResponse.json()) as { totalInterest: number }
    expect(loanBody.totalInterest).toBeGreaterThan(0)
  })
})
