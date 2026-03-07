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
    .select((eb) => [
      eb.ref('users.id'),
      eb.ref('users.email'),
      eb.ref('users.name'),
      eb.ref('users.image'),
      eb.ref('users.is_admin').as('isAdmin'),
      eb.ref('users.created_at').as('createdAt'),
      eb.ref('users.updated_at').as('updatedAt'),
    ] as any)
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
      createdAt: (bySubject.createdAt instanceof Date ? bySubject.createdAt.toISOString() : bySubject.createdAt) || new Date().toISOString(),
      updatedAt: (bySubject.updatedAt instanceof Date ? bySubject.updatedAt.toISOString() : bySubject.updatedAt) || new Date().toISOString(),
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
        createdAt: existingUser.created_at instanceof Date ? existingUser.created_at.toISOString() : existingUser.created_at,
        updatedAt: existingUser.updated_at instanceof Date ? existingUser.updated_at.toISOString() : existingUser.updated_at,
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
          createdAt: created.created_at instanceof Date ? created.created_at.toISOString() : created.created_at,
          updatedAt: created.updated_at instanceof Date ? created.updated_at.toISOString() : created.updated_at,
        };
      })();

  // Link authSubject to user
  try {
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
      .execute();
  } catch {
    // Subject already linked, continue
  }

  return user;
}
