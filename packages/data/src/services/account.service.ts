import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { account } from "../db/schema";

export type AccountRecord = typeof account.$inferSelect;
export type AccountInsert = typeof account.$inferInsert;

export async function listAccountsByProvider(userId: string, provider: string) {
  return db
    .select({
      id: account.id,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      expiresAt: account.expiresAt,
    })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.provider, provider)));
}

export async function getAccountByUserAndProvider(
  userId: string,
  provider: string
): Promise<AccountRecord | null> {
  const [result] = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.provider, provider)))
    .limit(1);

  return result ?? null;
}

export async function getAccountByProviderAccountId(
  providerAccountId: string,
  provider: string
): Promise<AccountRecord | null> {
  const [result] = await db
    .select()
    .from(account)
    .where(
      and(
        eq(account.provider, provider),
        eq(account.providerAccountId, providerAccountId)
      )
    )
    .limit(1);

  return result ?? null;
}

export async function createAccount(
  data: AccountInsert
): Promise<AccountRecord | null> {
  const [created] = await db.insert(account).values(data).returning();
  return created ?? null;
}

export async function updateAccount(
  id: string,
  updates: Partial<AccountInsert>
): Promise<AccountRecord | null> {
  const [updated] = await db
    .update(account)
    .set(updates)
    .where(eq(account.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteAccountForUser(
  id: string,
  userId: string,
  provider: string
): Promise<boolean> {
  const result = await db
    .delete(account)
    .where(
      and(
        eq(account.id, id),
        eq(account.userId, userId),
        eq(account.provider, provider)
      )
    )
    .returning();

  return result.length > 0;
}
