import crypto from 'node:crypto'

import { db, sql } from '../../../index'
import { createTestUser } from '../../fixtures'
import { seedFinanceTestData } from '../../finance.utils'
import { createDeterministicIdFactory } from './harness'

export interface SeedUserInput {
  id?: string
  email?: string
  name?: string
}

export async function seedUser(input: SeedUserInput = {}): Promise<{ id: string; email: string; name: string | undefined }> {
  const id = input.id ?? crypto.randomUUID()
  const email = input.email ?? `${id}@example.com`
  const name = input.name ?? 'Test User'
  await createTestUser({ id, email, name })
  return { id, email, name }
}

export interface FinanceDomainSeed {
  userId: string
  accountId: string
  institutionId: string
}

export async function seedFinanceDomain(seed: string, plaid = false): Promise<FinanceDomainSeed> {
  const nextId = createDeterministicIdFactory(`finance-domain:${seed}`)
  const userId = nextId()
  const accountId = nextId()
  const institutionId = nextId()

  await seedFinanceTestData({
    userId,
    accountId,
    institutionId,
    plaid,
  })

  return {
    userId,
    accountId,
    institutionId,
  }
}

export async function seedTaskList(params: {
  listId?: string
  userId: string
  name?: string
}): Promise<{ listId: string; userId: string; name: string }> {
  const listId = params.listId ?? crypto.randomUUID()
  const name = params.name ?? 'Test List'
  await db.execute(sql`
    insert into task_lists (id, user_id, name)
    values (${listId}, ${params.userId}, ${name})
    on conflict (id) do nothing
  `)
  return {
    listId,
    userId: params.userId,
    name,
  }
}
