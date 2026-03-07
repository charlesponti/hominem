import { randomUUID } from 'node:crypto'

import type { UserAccounts } from '@hominem/db'
import { db } from '@hominem/db'

interface AccountRecord {
  id: string
  userId: string
  type: string
  provider: string
  providerAccountId: string
  refreshToken: string | null
  accessToken: string | null
  expiresAt: string | null
  tokenType: string | null
  scope: string | null
  idToken: string | null
  sessionState: string | null
}

interface AccountInsert {
  id?: string
  userId: string
  type?: string
  provider: string
  providerAccountId: string
  refreshToken?: string | null
  accessToken?: string | null
  expiresAt?: Date | null
  tokenType?: string | null
  scope?: string | null
  idToken?: string | null
  sessionState?: string | null
}

function toCompatRecord(row: UserAccounts): AccountRecord {
  return {
    id: row.id,
    userId: row.user_id,
    type: 'oauth',
    provider: row.provider,
    providerAccountId: row.account_id,
    refreshToken: null,
    accessToken: null,
    expiresAt: null,
    tokenType: null,
    scope: null,
    idToken: null,
    sessionState: null,
  }
}

export async function listAccountsByProvider(userId: string, provider: string): Promise<AccountRecord[]> {
  const rows = await db
    .selectFrom('user_accounts')
    .selectAll()
    .where('user_id', '=', userId)
    .where('provider', '=', provider)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'asc')
    .execute()

  return rows.map(toCompatRecord)
}

export async function getAccountByUserAndProvider(
  userId: string,
  provider: string
): Promise<AccountRecord | null> {
  const row = await db
    .selectFrom('user_accounts')
    .selectAll()
    .where('user_id', '=', userId)
    .where('provider', '=', provider)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'asc')
    .limit(1)
    .executeTakeFirst()

  return row ? toCompatRecord(row) : null
}

export async function getAccountByProviderAccountId(
  providerAccountId: string,
  provider: string
): Promise<AccountRecord | null> {
  const row = await db
    .selectFrom('user_accounts')
    .selectAll()
    .where('account_id', '=', providerAccountId)
    .where('provider', '=', provider)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'asc')
    .limit(1)
    .executeTakeFirst()

  return row ? toCompatRecord(row) : null
}

export async function createAccount(data: AccountInsert): Promise<AccountRecord | null> {
  const accountId = data.id ?? randomUUID()

  const row = await db
    .insertInto('user_accounts')
    .values({
      id: accountId,
      user_id: data.userId,
      account_id: data.providerAccountId,
      provider: data.provider,
    })
    .onConflict((oc) =>
      oc.columns(['account_id', 'provider', 'user_id']).doNothing()
    )
    .returningAll()
    .executeTakeFirst()

  return row ? toCompatRecord(row) : null
}

export async function updateAccount(
  id: string,
  updates: Partial<AccountInsert>
): Promise<AccountRecord | null> {
  const updateData: Partial<UserAccounts> = {}

  if (updates.providerAccountId !== undefined) {
    updateData.account_id = updates.providerAccountId
  }

  if (updates.provider !== undefined) {
    updateData.provider = updates.provider
  }

  if (Object.keys(updateData).length === 0) {
    return null
  }

  const row = await db
    .updateTable('user_accounts')
    .set(updateData)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()

  return row ? toCompatRecord(row) : null
}

export async function deleteAccountForUser(
  id: string,
  userId: string,
  provider: string
): Promise<boolean> {
  const result = await db
    .deleteFrom('user_accounts')
    .where('id', '=', id)
    .where('user_id', '=', userId)
    .where('provider', '=', provider)
    .executeTakeFirst()

  return (result.numDeletedRows ?? 0n) > 0n
}

export type { AccountRecord, AccountInsert }
