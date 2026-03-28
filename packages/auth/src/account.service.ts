import { db } from '@hominem/db';

function generateUUID(): string {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    const versionByte = bytes[6];
    const variantByte = bytes[8];

    if (versionByte === undefined || variantByte === undefined) {
      throw new Error('Secure UUID generation failed');
    }

    bytes[6] = (versionByte & 0x0f) | 0x40;
    bytes[8] = (variantByte & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));

    return [
      hex.slice(0, 4).join(''),
      hex.slice(4, 6).join(''),
      hex.slice(6, 8).join(''),
      hex.slice(8, 10).join(''),
      hex.slice(10, 16).join(''),
    ].join('-');
  }

  throw new Error('Secure UUID generation is unavailable');
}

interface AccountRecord {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refreshToken: string | null;
  accessToken: string | null;
  expiresAt: string | null;
  tokenType: string | null;
  scope: string | null;
  idToken: string | null;
  sessionState: string | null;
}

interface AccountInsert {
  id?: string;
  userId: string;
  type?: string;
  provider: string;
  providerAccountId: string;
  refreshToken?: string | null;
  accessToken?: string | null;
  expiresAt?: Date | null;
  tokenType?: string | null;
  scope?: string | null;
  idToken?: string | null;
  sessionState?: string | null;
}

interface AccountSelectRow {
  id: string;
  user_id: string;
  provider: string;
  provider_account_id: string;
}

function toCompatRecord(row: AccountSelectRow): AccountRecord {
  return {
    id: row.id,
    userId: row.user_id,
    type: 'oauth',
    provider: row.provider,
    providerAccountId: row.provider_account_id,
    refreshToken: null,
    accessToken: null,
    expiresAt: null,
    tokenType: null,
    scope: null,
    idToken: null,
    sessionState: null,
  };
}

export async function listAccountsByProvider(
  userId: string,
  provider: string,
): Promise<AccountRecord[]> {
  const rows = (await db
    .selectFrom('auth.identities')
    .selectAll()
    .where('user_id', '=', userId)
    .where('provider', '=', provider)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'asc')
    .execute()) as AccountSelectRow[];

  return rows.map(toCompatRecord);
}

export async function getAccountByUserAndProvider(
  userId: string,
  provider: string,
): Promise<AccountRecord | null> {
  const row = (await db
    .selectFrom('auth.identities')
    .selectAll()
    .where('user_id', '=', userId)
    .where('provider', '=', provider)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'asc')
    .limit(1)
    .executeTakeFirst()) as AccountSelectRow | undefined;

  return row ? toCompatRecord(row) : null;
}

export async function getAccountByProviderAccountId(
  providerAccountId: string,
  provider: string,
): Promise<AccountRecord | null> {
  const row = (await db
    .selectFrom('auth.identities')
    .selectAll()
    .where('provider_account_id', '=', providerAccountId)
    .where('provider', '=', provider)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'asc')
    .limit(1)
    .executeTakeFirst()) as AccountSelectRow | undefined;

  return row ? toCompatRecord(row) : null;
}

export async function createAccount(data: AccountInsert): Promise<AccountRecord | null> {
  const accountId = data.id ?? generateUUID();

  const row = (await db
    .insertInto('auth.identities')
    .values({
      id: accountId,
      user_id: data.userId,
      provider_account_id: data.providerAccountId,
      provider: data.provider,
      provider_subject: data.providerAccountId, // Required field
    })
    .onConflict((oc) => oc.columns(['provider_account_id', 'provider', 'user_id']).doNothing())
    .returningAll()
    .executeTakeFirst()) as AccountSelectRow | undefined;

  return row ? toCompatRecord(row) : null;
}

export async function updateAccount(
  id: string,
  updates: Partial<AccountInsert>,
): Promise<AccountRecord | null> {
  const updateData: Partial<Record<'account_id' | 'provider', string>> = {};

  if (updates.providerAccountId !== undefined) {
    updateData.account_id = updates.providerAccountId;
  }

  if (updates.provider !== undefined) {
    updateData.provider = updates.provider;
  }

  if (Object.keys(updateData).length === 0) {
    return null;
  }

  const row = (await db
    .updateTable('auth.identities')
    .set(updateData)
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst()) as AccountSelectRow | undefined;

  return row ? toCompatRecord(row) : null;
}

export async function deleteAccountForUser(
  id: string,
  userId: string,
  provider: string,
): Promise<boolean> {
  const result = await db
    .deleteFrom('auth.identities')
    .where('id', '=', id)
    .where('user_id', '=', userId)
    .where('provider', '=', provider)
    .executeTakeFirst();

  return (result.numDeletedRows ?? 0n) > 0n;
}

export type { AccountRecord, AccountInsert };
