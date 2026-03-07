import { randomUUID } from 'node:crypto'

import { db, sql } from '@hominem/db'

interface AccountRow {
  id: string
  user_id: string
  account_id: string
  provider: string
  created_at: string | null
}

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

function resultRows<T>(result: unknown): T[] {
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

function toCompatRecord(row: AccountRow): AccountRecord {
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
  const result = await db.execute(sql`
    select id, user_id, account_id, provider, created_at
    from user_accounts
    where user_id = ${userId}
      and provider = ${provider}
    order by created_at desc nulls last, id asc
  `)

  return resultRows<AccountRow>(result).map(toCompatRecord)
}

export async function getAccountByUserAndProvider(
  userId: string,
  provider: string,
): Promise<AccountRecord | null> {
  const result = await db.execute(sql`
    select id, user_id, account_id, provider, created_at
    from user_accounts
    where user_id = ${userId}
      and provider = ${provider}
    order by created_at desc nulls last, id asc
    limit 1
  `)

  const row = resultRows<AccountRow>(result)[0] ?? null
  return row ? toCompatRecord(row) : null
}

export async function getAccountByProviderAccountId(
  providerAccountId: string,
  provider: string,
): Promise<AccountRecord | null> {
  const result = await db.execute(sql`
    select id, user_id, account_id, provider, created_at
    from user_accounts
    where account_id = ${providerAccountId}
      and provider = ${provider}
    order by created_at desc nulls last, id asc
    limit 1
  `)

  const row = resultRows<AccountRow>(result)[0] ?? null
  return row ? toCompatRecord(row) : null
}

export async function createAccount(data: AccountInsert): Promise<AccountRecord | null> {
  const accountId = data.id ?? randomUUID()

  const result = await db.execute(sql`
    insert into user_accounts (id, user_id, account_id, provider)
    values (${accountId}, ${data.userId}, ${data.providerAccountId}, ${data.provider})
    on conflict (account_id, provider, user_id) do nothing
    returning id, user_id, account_id, provider, created_at
  `)

  const row = resultRows<AccountRow>(result)[0] ?? null
  return row ? toCompatRecord(row) : null
}

export async function updateAccount(
  id: string,
  updates: Partial<AccountInsert>,
): Promise<AccountRecord | null> {
  const result = await db.execute(sql`
    update user_accounts
    set
      account_id = coalesce(${updates.providerAccountId ?? null}, account_id),
      provider = coalesce(${updates.provider ?? null}, provider)
    where id = ${id}
    returning id, user_id, account_id, provider, created_at
  `)

  const row = resultRows<AccountRow>(result)[0] ?? null
  return row ? toCompatRecord(row) : null
}

export async function deleteAccountForUser(
  id: string,
  userId: string,
  provider: string,
): Promise<boolean> {
  const result = await db.execute(sql`
    delete from user_accounts
    where id = ${id}
      and user_id = ${userId}
      and provider = ${provider}
    returning id
  `)

  return resultRows<{ id: string }>(result).length > 0
}

export type { AccountRecord, AccountInsert }
