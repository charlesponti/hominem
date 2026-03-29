import { db } from '@hominem/db'

function generateUUID(): string {
  const cryptoApi = globalThis.crypto

  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }

  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16))
    const versionByte = bytes[6]
    const variantByte = bytes[8]

    if (versionByte === undefined || variantByte === undefined) {
      throw new Error('Secure UUID generation failed')
    }

    bytes[6] = (versionByte & 0x0f) | 0x40
    bytes[8] = (variantByte & 0x3f) | 0x80

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))

    return [
      hex.slice(0, 4).join(''),
      hex.slice(4, 6).join(''),
      hex.slice(6, 8).join(''),
      hex.slice(8, 10).join(''),
      hex.slice(10, 16).join(''),
    ].join('-')
  }

  throw new Error('Secure UUID generation is unavailable')
}

interface AccountRecord {
  id: string
  userId: string
  type: string
  providerId: string
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
  providerId: string
  providerAccountId: string
  refreshToken?: string | null
  accessToken?: string | null
  expiresAt?: Date | null
  tokenType?: string | null
  scope?: string | null
  idToken?: string | null
  sessionState?: string | null
}

interface AccountSelectRow {
  id: string
  userId: string
  providerId: string
  accountId: string
  refreshToken?: string | null
  accessToken?: string | null
  accessTokenExpiresAt?: string | null
  scope?: string | null
  idToken?: string | null
}

function toCompatRecord(row: AccountSelectRow): AccountRecord {
  return {
    id: row.id,
    userId: row.userId,
    type: 'oauth',
    providerId: row.providerId,
    providerAccountId: row.accountId,
    refreshToken: row.refreshToken ?? null,
    accessToken: row.accessToken ?? null,
    expiresAt: row.accessTokenExpiresAt ?? null,
    tokenType: null,
    scope: row.scope ?? null,
    idToken: row.idToken ?? null,
    sessionState: null,
  }
}

export async function listAccountsByProvider(
  userId: string,
  providerId: string,
): Promise<AccountRecord[]> {
  const rows = await db
    .selectFrom('auth.account')
    .selectAll()
    .where('userId', '=', userId)
    .where('providerId', '=', providerId)
    .orderBy('createdAt', 'desc')
    .orderBy('id', 'asc')
    .execute()

  return rows.map(toCompatRecord)
}

export async function getAccountByUserAndProvider(
  userId: string,
  providerId: string,
): Promise<AccountRecord | null> {
  const row = await db
    .selectFrom('auth.account')
    .selectAll()
    .where('userId', '=', userId)
    .where('providerId', '=', providerId)
    .orderBy('createdAt', 'desc')
    .orderBy('id', 'asc')
    .limit(1)
    .executeTakeFirst()

  return row ? toCompatRecord(row) : null
}

export async function getAccountByProviderAccountId(
  providerAccountId: string,
  providerId: string,
): Promise<AccountRecord | null> {
  const row = await db
    .selectFrom('auth.account')
    .selectAll()
    .where('accountId', '=', providerAccountId)
    .where('providerId', '=', providerId)
    .orderBy('createdAt', 'desc')
    .orderBy('id', 'asc')
    .limit(1)
    .executeTakeFirst()

  return row ? toCompatRecord(row) : null
}

export async function createAccount(data: AccountInsert): Promise<AccountRecord | null> {
  const row = await db
    .insertInto('auth.account')
    .values({
      id: data.id ?? generateUUID(),
      userId: data.userId,
      accountId: data.providerAccountId,
      providerId: data.providerId,
      accessToken: data.accessToken ?? null,
      refreshToken: data.refreshToken ?? null,
      idToken: data.idToken ?? null,
      accessTokenExpiresAt: data.expiresAt?.toISOString() ?? null,
      scope: data.scope ?? null,
      linkedAt: new Date().toISOString(),
    })
    .onConflict((oc) => oc.columns(['providerId', 'accountId']).doNothing())
    .returningAll()
    .executeTakeFirst()

  return row ? toCompatRecord(row) : null
}

export async function updateAccount(
  id: string,
  updates: Partial<AccountInsert>,
): Promise<AccountRecord | null> {
  const updateData: Partial<{
    accountId: string
    providerId: string
    accessToken: string | null
    refreshToken: string | null
    idToken: string | null
    accessTokenExpiresAt: string | null
    scope: string | null
    lastUsedAt: string
  }> = {}

  if (updates.providerAccountId !== undefined) {
    updateData.accountId = updates.providerAccountId
  }

  if (updates.providerId !== undefined) {
    updateData.providerId = updates.providerId
  }

  if (updates.accessToken !== undefined) {
    updateData.accessToken = updates.accessToken
  }

  if (updates.refreshToken !== undefined) {
    updateData.refreshToken = updates.refreshToken
  }

  if (updates.idToken !== undefined) {
    updateData.idToken = updates.idToken
  }

  if (updates.expiresAt !== undefined) {
    updateData.accessTokenExpiresAt = updates.expiresAt?.toISOString() ?? null
  }

  if (updates.scope !== undefined) {
    updateData.scope = updates.scope
  }

  updateData.lastUsedAt = new Date().toISOString()

  const row = await db
    .updateTable('auth.account')
    .set(updateData)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()

  return row ? toCompatRecord(row) : null
}

export async function deleteAccountForUser(
  id: string,
  userId: string,
  providerId: string,
): Promise<boolean> {
  const result = await db
    .deleteFrom('auth.account')
    .where('id', '=', id)
    .where('userId', '=', userId)
    .where('providerId', '=', providerId)
    .executeTakeFirst()

  return (result.numDeletedRows ?? 0n) > 0n
}

export type { AccountRecord, AccountInsert }
