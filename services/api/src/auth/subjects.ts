import { randomUUID } from 'node:crypto';

import { db } from '@hominem/db';

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
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function ensureOAuthSubjectUser(
  input: EnsureOAuthSubjectUserInput,
): Promise<AuthUserRecord> {
  // Check if this OAuth subject is already linked
  const bySubject = await db
    .selectFrom('auth_subjects')
    .innerJoin('users', (join) => join.onRef('users.id', '=', 'auth_subjects.user_id'))
    .select({
      id: 'users.id',
      email: 'users.email',
      name: 'users.name',
      image: 'users.image',
      isAdmin: 'users.is_admin',
      createdAt: 'users.created_at',
      updatedAt: 'users.updated_at',
    })
    .where((eb) =>
      eb.and([
        eb('auth_subjects.provider', '=', input.provider),
        eb('auth_subjects.provider_subject', '=', input.providerSubject),
        eb('auth_subjects.unlinked_at', 'is', null),
      ]),
    )
    .limit(1)
    .executeTakeFirst();

  if (bySubject) {
    return {
      id: bySubject.id,
      email: bySubject.email,
      name: bySubject.name,
      image: bySubject.image,
      isAdmin: bySubject.isAdmin as boolean,
      createdAt: bySubject.createdAt as string,
      updatedAt: bySubject.updatedAt as string,
    };
  }

  // Check if a user with this email already exists
  const existingUser = await db
    .selectFrom('users')
    .select([
      'id',
      'email',
      'name',
      'image',
      'is_admin',
      'created_at',
      'updated_at',
    ])
    .where((eb) => eb('email', '=', input.email))
    .limit(1)
    .executeTakeFirst();

  // Create new user if needed
  const user = existingUser
    ? {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        image: existingUser.image,
        isAdmin: existingUser.is_admin as boolean,
        createdAt: existingUser.created_at as string,
        updatedAt: existingUser.updated_at as string,
      }
    : await (async () => {
        const now = new Date().toISOString();
        const created = await db
          .insertInto('users')
          .values({
            id: randomUUID(),
            email: input.email,
            name: input.name ?? null,
            image: input.image ?? null,
            is_admin: false,
            created_at: now,
            updated_at: now,
          })
          .returningAll()
          .executeTakeFirst();

        if (!created) {
          throw new Error('failed_to_ensure_user');
        }

        return {
          id: created.id,
          email: created.email,
          name: created.name,
          image: created.image,
          isAdmin: created.is_admin as boolean,
          createdAt: created.created_at as string,
          updatedAt: created.updated_at as string,
        };
      })();

  // Link authSubject to user
  await db
    .insertInto('auth_subjects')
    .values({
      id: randomUUID(),
      user_id: user.id,
      provider: input.provider,
      provider_subject: input.providerSubject,
      is_primary: true,
      linked_at: new Date().toISOString(),
    })
    .onConflictDoNothing()
    .execute();

  return user;
}
