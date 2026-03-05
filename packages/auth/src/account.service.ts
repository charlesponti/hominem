import { and, eq } from '@hominem/db'
import { account } from '@hominem/db/schema/users'
import { randomUUID } from 'node:crypto'

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

function toCompatRecord(
  row: typeof account.$inferSelect,
): AccountRecord {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    provider: row.provider,
    providerAccountId: row.providerAccountId,
    refreshToken: row.refreshToken,
    accessToken: row.accessToken,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    tokenType: row.tokenType,
    scope: row.scope,
    idToken: row.idToken,
    sessionState: row.sessionState,
  }
}

export async function listAccountsByProvider(userId: string, provider: string): Promise<AccountRecord[]> {
  const { db } = await import('@hominem/db')
  const records = await db
    .select()
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.provider, provider),
      ),
    )

  return records.map((row) => toCompatRecord(row))
}

export async function getAccountByUserAndProvider(
  userId: string,
  provider: string,
): Promise<AccountRecord | null> {
  const { db } = await import('@hominem/db')
  const [result] = await db
    .select()
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.provider, provider),
      ),
    )
    .limit(1)

  return result ? toCompatRecord(result) : null
}

export async function getAccountByProviderAccountId(
  providerAccountId: string,
  provider: string,
): Promise<AccountRecord | null> {
  const { db } = await import('@hominem/db')
  const [result] = await db
    .select()
    .from(account)
    .where(
      and(
        eq(account.provider, provider),
        eq(account.providerAccountId, providerAccountId),
      ),
    )
    .limit(1)

  if (!result) {
    return null
  }

  return toCompatRecord(result)
}

export async function createAccount(data: AccountInsert): Promise<AccountRecord | null> {
  const { db } = await import('@hominem/db')
  const [created] = await db
    .insert(account)
    .values({
      id: data.id ?? randomUUID(),
      userId: data.userId,
      providerAccountId: data.providerAccountId,
      provider: data.provider,
      type: data.type ?? 'oauth',
      accessToken: data.accessToken ?? null,
      refreshToken: data.refreshToken ?? null,
      idToken: data.idToken ?? null,
      expiresAt: data.expiresAt ?? null,
      tokenType: data.tokenType ?? null,
      scope: data.scope ?? null,
      sessionState: data.sessionState ?? null,
    })
    .returning()

  return created ? toCompatRecord(created) : null
}

export async function updateAccount(
  id: string,
  updates: Partial<AccountInsert>,
): Promise<AccountRecord | null> {
  const { db } = await import('@hominem/db')
  const [updated] = await db
    .update(account)
    .set({
      ...(updates.provider ? { provider: updates.provider } : {}),
      ...(updates.providerAccountId ? { providerAccountId: updates.providerAccountId } : {}),
      ...(updates.type ? { type: updates.type } : {}),
      ...(updates.accessToken !== undefined ? { accessToken: updates.accessToken } : {}),
      ...(updates.refreshToken !== undefined ? { refreshToken: updates.refreshToken } : {}),
      ...(updates.idToken !== undefined ? { idToken: updates.idToken } : {}),
      ...(updates.tokenType !== undefined ? { tokenType: updates.tokenType } : {}),
      ...(updates.sessionState !== undefined ? { sessionState: updates.sessionState } : {}),
      ...(updates.scope !== undefined ? { scope: updates.scope } : {}),
      ...(updates.expiresAt !== undefined ? { expiresAt: updates.expiresAt } : {}),
    })
    .where(eq(account.id, id))
    .returning()

  if (!updated) {
    return null
  }

  return toCompatRecord(updated)
}

export async function deleteAccountForUser(
  id: string,
  userId: string,
  provider: string,
): Promise<boolean> {
  const { db } = await import('@hominem/db')
  const result = await db
    .delete(account)
    .where(
      and(
        eq(account.id, id),
        eq(account.userId, userId),
        eq(account.provider, provider),
      ),
    )
    .returning({ id: account.id })

  return result.length > 0
}

export type { AccountRecord, AccountInsert }
