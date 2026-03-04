import { randomUUID } from 'node:crypto';

import { and, eq, isNull } from '@hominem/db';
import { db } from '@hominem/db';
import { authSubjects } from '@hominem/db/schema/auth';
import { users } from '@hominem/db/schema/users';

type AuthProvider = 'apple' | 'google';

interface EnsureOAuthSubjectUserInput {
  provider: AuthProvider;
  providerSubject: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

interface AuthUserRecord {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export async function ensureOAuthSubjectUser(
  input: EnsureOAuthSubjectUserInput,
): Promise<AuthUserRecord> {
  // Check if this OAuth subject is already linked
  const [bySubject] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      is_admin: users.is_admin,
      created_at: users.created_at,
      updated_at: users.updated_at,
    })
    .from(authSubjects)
    .innerJoin(users, eq(users.id, authSubjects.userId))
    .where(
      and(
        eq(authSubjects.provider, input.provider),
        eq(authSubjects.providerSubject, input.providerSubject),
        isNull(authSubjects.unlinkedAt),
      ),
    )
    .limit(1);

  if (bySubject) {
    return bySubject;
  }

  // Check if a user with this email already exists
  const [existingUser] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      is_admin: users.is_admin,
      created_at: users.created_at,
      updated_at: users.updated_at,
    })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  // Create new user if needed
  const user =
    existingUser ??
    (
      await db
        .insert(users)
        .values({
          id: randomUUID(),
          email: input.email,
          name: input.name ?? null,
          image: input.image ?? null,
          is_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          image: users.image,
          is_admin: users.is_admin,
          created_at: users.created_at,
          updated_at: users.updated_at,
        })
    )[0];

  if (!user) {
    throw new Error('failed_to_ensure_user');
  }

  // Link authSubject to user
  await db
    .insert(authSubjects)
    .values({
      id: randomUUID(),
      userId: user.id,
      provider: input.provider,
      providerSubject: input.providerSubject,
      isPrimary: true,
      linkedAt: new Date().toISOString(),
    })
    .onConflictDoNothing();

  return user;
}
