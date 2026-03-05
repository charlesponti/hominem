import crypto from 'node:crypto'

import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import {
  assertErrorResponse,
  makeAuthenticatedRequest,
  useApiTestLifecycle,
} from '@/test/api-test-utils'
import { cleanupFinanceUserData, createFinanceUserPair } from '@/test/finance-test-harness'

describe('Finance Accounts/Institutions/Plaid Router', () => {
  const { getServer } = useApiTestLifecycle()

  let ownerId: string
  let otherUserId: string
  let createdInstitutionId: string | null = null
  let createdItemId: string | null = null

  beforeAll(async () => {
    const pair = await createFinanceUserPair()
    ownerId = pair.ownerId
    otherUserId = pair.otherUserId
  })

  afterAll(async () => {
    await cleanupFinanceUserData({
      userIds: [ownerId, otherUserId],
      institutionIds: [createdInstitutionId],
    })
  })

  test('account CRUD endpoints enforce owner scope', async () => {
    const createResponse = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/accounts/create',
      payload: {
        name: 'Primary Checking',
        type: 'checking',
        balance: 3200,
      },
      headers: {
        'x-user-id': ownerId,
      },
    })

    expect(createResponse.status).toBe(201)
    const created = (await createResponse.json()) as {
      id: string
      userId: string
      name: string
      accountType: string
      balance: number
    }
    expect(created.userId).toBe(ownerId)
    expect(created.name).toBe('Primary Checking')

    const listResponse = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/accounts/list',
      payload: { includeInactive: false },
      headers: {
        'x-user-id': ownerId,
      },
    })
    expect(listResponse.status).toBe(200)
    const listed = (await listResponse.json()) as Array<{ id: string }>
    expect(listed.some((item) => item.id === created.id)).toBe(true)

    const getResponse = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/accounts/get',
      payload: { id: created.id },
      headers: {
        'x-user-id': ownerId,
      },
    })
    expect(getResponse.status).toBe(200)

    const deniedUpdate = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/accounts/update',
      payload: { id: created.id, name: 'Hijacked' },
      headers: {
        'x-user-id': otherUserId,
      },
    })
    await assertErrorResponse(deniedUpdate, 404)

    const updateResponse = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/accounts/update',
      payload: { id: created.id, name: 'Updated Checking' },
      headers: {
        'x-user-id': ownerId,
      },
    })
    expect(updateResponse.status).toBe(200)

    const deleteResponse = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/accounts/delete',
      payload: { id: created.id },
      headers: {
        'x-user-id': ownerId,
      },
    })
    expect(deleteResponse.status).toBe(200)
    const deleted = (await deleteResponse.json()) as { success: boolean }
    expect(deleted.success).toBe(true)
  })

  test('institutions list/create endpoints are available and authenticated', async () => {
    const createResponse = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/institutions/create',
      payload: {
        name: `Test Institution ${crypto.randomUUID().slice(0, 6)}`,
      },
      headers: {
        'x-user-id': ownerId,
      },
    })
    expect(createResponse.status).toBe(201)
    const created = (await createResponse.json()) as { id: string; name: string }
    createdInstitutionId = created.id
    expect(created.name).toContain('Test Institution')

    const listResponse = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/institutions/list',
      payload: {},
      headers: {
        'x-user-id': ownerId,
      },
    })
    expect(listResponse.status).toBe(200)
    const institutions = (await listResponse.json()) as Array<{ id: string }>
    expect(institutions.some((item) => item.id === created.id)).toBe(true)
  })

  test('plaid exchange/sync/remove lifecycle works for owner', async () => {
    const exchangeResponse = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/plaid/exchange-token',
      payload: {
        publicToken: `pub-${crypto.randomUUID()}`,
        institutionName: 'Sandbox Institution',
      },
      headers: {
        'x-user-id': ownerId,
      },
    })
    expect(exchangeResponse.status).toBe(200)
    const exchange = (await exchangeResponse.json()) as { itemId: string; accessToken: string }
    createdItemId = exchange.itemId
    expect(exchange.itemId).toContain('item-')
    expect(exchange.accessToken).toContain('access-')

    const syncResponse = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/plaid/sync-item',
      payload: {
        itemId: createdItemId,
      },
      headers: {
        'x-user-id': ownerId,
      },
    })
    expect(syncResponse.status).toBe(200)
    const syncBody = (await syncResponse.json()) as { success: boolean }
    expect(syncBody.success).toBe(true)

    const removeDenied = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/plaid/remove-connection',
      payload: {
        itemId: createdItemId,
      },
      headers: {
        'x-user-id': otherUserId,
      },
    })
    await assertErrorResponse(removeDenied, 404)

    const removeAllowed = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/plaid/remove-connection',
      payload: {
        itemId: createdItemId,
      },
      headers: {
        'x-user-id': ownerId,
      },
    })
    expect(removeAllowed.status).toBe(200)
    const removed = (await removeAllowed.json()) as { success: boolean }
    expect(removed.success).toBe(true)
  })

  test('auth is required on account routes', async () => {
    const unauth = await makeAuthenticatedRequest(getServer(), {
      method: 'POST',
      url: '/api/finance/accounts/list',
      payload: { includeInactive: false },
    })
    await assertErrorResponse(unauth, 401)
  })
})
