import { db } from '@hominem/db'

function generateUUID(): string {
  const cryptoApi = globalThis.crypto

  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }

  throw new Error('Secure UUID generation is unavailable')
}

interface AccountRecord {
  id: string
  userId: string
  providerId: string
  providerAccountId: string
  refreshToken: string | null
  accessToken: string | null
  expiresAt: string | null
  scope: string | null
  idToken: string | null
}

interface AccountInsert {
  id?: string
  userId: string
  providerId: string
  providerAccountId: string
  providerSubject?: string
  refreshToken?: string | null
  accessToken?: string | null
  expiresAt?: Date | null
  scope?: string | null
  idToken?: string | null
}

type IdentityRow = {
  id: string
  userid: string
  provider: string
  provider_account_id: string | null
  provider_subject: string
  access_token_encrypted: string | null
  refresh_token_encrypted: string | null
  id_token_encrypted: string | null
  createdat: Date
  updatedat: Date
}

function toCompatRecord(row: IdentityRow): AccountRecord {
  return {
    id: row.id,
    userId: row.userid,
    providerId: row.provider,
    providerAccountId: row.provider_account_id ?? '',
    refreshToken: row.refresh_token_encrypted,
    accessToken: row.access_token_encrypted,
    expiresAt: null,
    scope: null,
    idToken: row.id_token_encrypted,
  }
}

export async function listAccountsByProvider(userId: string, providerId: string): Promise<AccountRecord[]> {
  const rows = await db
    .selectFrom('auth.identities')
    .selectAll()
    .where('userid', '=', userId)
    .where('provider', '=', providerId)
    .orderBy('createdat', 'desc')
    .orderBy('id', 'asc')
    .execute()

  return rows.map((row) => toCompatRecord(row as IdentityRow))
}

export async function getAccountByUserAndProvider(
  userId: string,
  providerId: string,
): Promise<AccountRecord | null> {
  const row = await db
    .selectFrom('auth.identities')
    .selectAll()
    .where('userid', '=', userId)
    .where('provider', '=', providerId)
    .orderBy('createdat', 'desc')
    .orderBy('id', 'asc')
    .limit(1)
    .executeTakeFirst()

  return row ? toCompatRecord(row as IdentityRow) : null
}

export async function getAccountByProviderAccountId(
  providerAccountId: string,
  providerId: string,
): Promise<AccountRecord | null> {
  const row = await db
    .selectFrom('auth.identities')
    .selectAll()
    .where('provider_account_id', '=', providerAccountId)
    .where('provider', '=', providerId)
    .orderBy('createdat', 'desc')
    .orderBy('id', 'asc')
    .limit(1)
    .executeTakeFirst()

  return row ? toCompatRecord(row as IdentityRow) : null
}

export async function createAccount(data: AccountInsert): Promise<AccountRecord | null> {
  const row = await db
    .insertInto('auth.identities')
    .values({
      id: data.id ?? generateUUID(),
      userid: data.userId,
      provider: data.providerId,
      provider_account_id: data.providerAccountId,
      provider_subject: data.providerSubject ?? data.providerAccountId,
      access_token_encrypted: data.accessToken ?? null,
      refresh_token_encrypted: data.refreshToken ?? null,
      id_token_encrypted: data.idToken ?? null,
    })
    .returningAll()
    .executeTakeFirst()

  return row ? toCompatRecord(row as IdentityRow) : null
}

export async function updateAccount(
  id: string,
  updates: Partial<AccountInsert>,
): Promise<AccountRecord | null> {
  const updateData: Partial<IdentityRow> = {}

  if (updates.providerAccountId !== undefined) {
    updateData.provider_account_id = updates.providerAccountId
  }

  if (updates.providerId !== undefined) {
    updateData.provider = updates.providerId
  }

  if (updates.providerSubject !== undefined) {
    updateData.provider_subject = updates.providerSubject
  }

  if (updates.accessToken !== undefined) {
    updateData.access_token_encrypted = updates.accessToken
  }

  if (updates.refreshToken !== undefined) {
    updateData.refresh_token_encrypted = updates.refreshToken
  }

  if (updates.idToken !== undefined) {
    updateData.id_token_encrypted = updates.idToken
  }

  const row = await db
    .updateTable('auth.identities')
    .set(updateData)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()

  return row ? toCompatRecord(row as IdentityRow) : null
}

export async function deleteAccountForUser(
  id: string,
  userId: string,
  providerId: string,
): Promise<boolean> {
  const result = await db
    .deleteFrom('auth.identities')
    .where('id', '=', id)
    .where('userid', '=', userId)
    .where('provider', '=', providerId)
    .executeTakeFirst()

  return (result.numDeletedRows ?? 0n) > 0n
}

export type { AccountRecord, AccountInsert }
