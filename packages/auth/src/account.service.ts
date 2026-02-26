import { and, eq } from '@hominem/db'
import { betterAuthAccount, betterAuthUser, users } from '@hominem/db/schema/tables'
import { randomUUID } from 'node:crypto'

interface AccountRecord {
  id: string
  userId: string
  type: string
  provider: string
  providerAccountId: string
  refreshToken: string | null
  accessToken: string | null
  expiresAt: Date | null
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

interface BetterAuthIdentity {
  betterAuthUserId: string
  domainUserId: string
}

function toCompatRecord(
  row: typeof betterAuthAccount.$inferSelect,
  domainUserId: string,
): AccountRecord {
  return {
    id: row.id,
    userId: domainUserId,
    type: row.password ? 'credentials' : 'oauth',
    provider: row.providerId,
    providerAccountId: row.accountId,
    refreshToken: row.refreshToken,
    accessToken: row.accessToken,
    expiresAt: row.accessTokenExpiresAt,
    tokenType: null,
    scope: row.scope,
    idToken: row.idToken,
    sessionState: null,
  }
}

async function resolveIdentityFromDomainUserId(userId: string): Promise<BetterAuthIdentity | null> {
  const { db } = await import('@hominem/db')

  const [linkedUser] = await db
    .select({
      domainUserId: users.id,
      betterAuthUserId: users.betterAuthUserId,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!linkedUser) {
    return null
  }

  if (linkedUser.betterAuthUserId) {
    return {
      betterAuthUserId: linkedUser.betterAuthUserId,
      domainUserId: linkedUser.domainUserId,
    }
  }

  const [matchedAuthUser] = await db
    .select({ id: betterAuthUser.id })
    .from(betterAuthUser)
    .where(eq(betterAuthUser.email, linkedUser.email))
    .limit(1)

  if (!matchedAuthUser) {
    return null
  }

  await db
    .update(users)
    .set({
      betterAuthUserId: matchedAuthUser.id,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, linkedUser.domainUserId))

  return {
    betterAuthUserId: matchedAuthUser.id,
    domainUserId: linkedUser.domainUserId,
  }
}

async function resolveIdentityFromBetterAuthUserId(
  betterAuthUserId: string,
): Promise<BetterAuthIdentity | null> {
  const { db } = await import('@hominem/db')
  const [linkedUser] = await db
    .select({
      domainUserId: users.id,
      betterAuthUserId: users.betterAuthUserId,
    })
    .from(users)
    .where(eq(users.betterAuthUserId, betterAuthUserId))
    .limit(1)

  if (!linkedUser?.betterAuthUserId) {
    return null
  }

  return {
    betterAuthUserId: linkedUser.betterAuthUserId,
    domainUserId: linkedUser.domainUserId,
  }
}

async function resolveIdentity(userId: string): Promise<BetterAuthIdentity | null> {
  const byDomainId = await resolveIdentityFromDomainUserId(userId)
  if (byDomainId) {
    return byDomainId
  }

  return resolveIdentityFromBetterAuthUserId(userId)
}

export async function listAccountsByProvider(userId: string, provider: string): Promise<AccountRecord[]> {
  const identity = await resolveIdentity(userId)
  if (!identity) {
    return []
  }

  const { db } = await import('@hominem/db')
  const records = await db
    .select()
    .from(betterAuthAccount)
    .where(
      and(
        eq(betterAuthAccount.userId, identity.betterAuthUserId),
        eq(betterAuthAccount.providerId, provider),
      ),
    )

  return records.map((row) => toCompatRecord(row, identity.domainUserId))
}

export async function getAccountByUserAndProvider(
  userId: string,
  provider: string,
): Promise<AccountRecord | null> {
  const identity = await resolveIdentity(userId)
  if (!identity) {
    return null
  }

  const { db } = await import('@hominem/db')
  const [result] = await db
    .select()
    .from(betterAuthAccount)
    .where(
      and(
        eq(betterAuthAccount.userId, identity.betterAuthUserId),
        eq(betterAuthAccount.providerId, provider),
      ),
    )
    .limit(1)

  return result ? toCompatRecord(result, identity.domainUserId) : null
}

export async function getAccountByProviderAccountId(
  providerAccountId: string,
  provider: string,
): Promise<AccountRecord | null> {
  const { db } = await import('@hominem/db')
  const [result] = await db
    .select({
      account: betterAuthAccount,
      domainUserId: users.id,
    })
    .from(betterAuthAccount)
    .leftJoin(users, eq(users.betterAuthUserId, betterAuthAccount.userId))
    .where(
      and(
        eq(betterAuthAccount.providerId, provider),
        eq(betterAuthAccount.accountId, providerAccountId),
      ),
    )
    .limit(1)

  if (!result) {
    return null
  }

  return toCompatRecord(result.account, result.domainUserId ?? result.account.userId)
}

export async function createAccount(data: AccountInsert): Promise<AccountRecord | null> {
  const identity = await resolveIdentity(data.userId)
  if (!identity) {
    return null
  }

  const { db } = await import('@hominem/db')
  const [created] = await db
    .insert(betterAuthAccount)
    .values({
      id: data.id ?? randomUUID(),
      userId: identity.betterAuthUserId,
      providerId: data.provider,
      accountId: data.providerAccountId,
      accessToken: data.accessToken ?? null,
      refreshToken: data.refreshToken ?? null,
      idToken: data.idToken ?? null,
      accessTokenExpiresAt: data.expiresAt ?? null,
      scope: data.scope ?? null,
      password: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  return created ? toCompatRecord(created, identity.domainUserId) : null
}

export async function updateAccount(
  id: string,
  updates: Partial<AccountInsert>,
): Promise<AccountRecord | null> {
  const { db } = await import('@hominem/db')
  const [updated] = await db
    .update(betterAuthAccount)
    .set({
      ...(updates.provider ? { providerId: updates.provider } : {}),
      ...(updates.providerAccountId ? { accountId: updates.providerAccountId } : {}),
      ...(updates.accessToken !== undefined ? { accessToken: updates.accessToken } : {}),
      ...(updates.refreshToken !== undefined ? { refreshToken: updates.refreshToken } : {}),
      ...(updates.idToken !== undefined ? { idToken: updates.idToken } : {}),
      ...(updates.scope !== undefined ? { scope: updates.scope } : {}),
      ...(updates.expiresAt !== undefined
        ? { accessTokenExpiresAt: updates.expiresAt }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(betterAuthAccount.id, id))
    .returning()

  if (!updated) {
    return null
  }

  const [linkedUser] = await db
    .select({ domainUserId: users.id })
    .from(users)
    .where(eq(users.betterAuthUserId, updated.userId))
    .limit(1)

  return toCompatRecord(updated, linkedUser?.domainUserId ?? updated.userId)
}

export async function deleteAccountForUser(
  id: string,
  userId: string,
  provider: string,
): Promise<boolean> {
  const identity = await resolveIdentity(userId)
  if (!identity) {
    return false
  }

  const { db } = await import('@hominem/db')
  const result = await db
    .delete(betterAuthAccount)
    .where(
      and(
        eq(betterAuthAccount.id, id),
        eq(betterAuthAccount.userId, identity.betterAuthUserId),
        eq(betterAuthAccount.providerId, provider),
      ),
    )
    .returning({ id: betterAuthAccount.id })

  return result.length > 0
}

export type { AccountRecord, AccountInsert }
