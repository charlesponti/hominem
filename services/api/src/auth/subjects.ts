import { and, eq, isNull } from '@hominem/db'
import { db } from '@hominem/db'
import { authSubjects } from '@hominem/db/schema/auth'
import { users } from '@hominem/db/schema/users'
import { randomUUID } from 'node:crypto'

type AuthProvider = 'apple' | 'google'

interface EnsureOAuthSubjectUserInput {
  provider: AuthProvider
  providerSubject: string
  email: string
  name?: string | null
  image?: string | null
}

interface AuthUserRecord {
  id: string
  email: string
  name: string | null
  image: string | null
  isAdmin: boolean
  createdAt: string
  updatedAt: string
  primaryAuthSubjectId: string | null
}

export async function ensureOAuthSubjectUser(input: EnsureOAuthSubjectUserInput): Promise<AuthUserRecord> {
  const [bySubject] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      primaryAuthSubjectId: users.primaryAuthSubjectId,
    })
    .from(authSubjects)
    .innerJoin(users, eq(users.id, authSubjects.userId))
    .where(
      and(
        eq(authSubjects.provider, input.provider),
        eq(authSubjects.providerSubject, input.providerSubject),
        isNull(authSubjects.unlinkedAt)
      )
    )
    .limit(1)

  if (bySubject) {
    return bySubject
  }

  const [existingUser] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      primaryAuthSubjectId: users.primaryAuthSubjectId,
    })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1)

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
          isAdmin: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          image: users.image,
          isAdmin: users.isAdmin,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          primaryAuthSubjectId: users.primaryAuthSubjectId,
        })
    )[0]

  if (!user) {
    throw new Error('failed_to_ensure_user')
  }

  await db
    .insert(authSubjects)
    .values({
      id: randomUUID(),
      userId: user.id,
      provider: input.provider,
      providerSubject: input.providerSubject,
      isPrimary: !user.primaryAuthSubjectId,
      linkedAt: new Date().toISOString(),
    })
    .onConflictDoNothing()

  const [linkedSubject] = await db
    .select({
      id: authSubjects.id,
    })
    .from(authSubjects)
    .where(
      and(
        eq(authSubjects.provider, input.provider),
        eq(authSubjects.providerSubject, input.providerSubject),
        isNull(authSubjects.unlinkedAt)
      )
    )
    .limit(1)

  if (linkedSubject && !user.primaryAuthSubjectId) {
    await db
      .update(users)
      .set({
        primaryAuthSubjectId: linkedSubject.id,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, user.id))

    return {
      ...user,
      primaryAuthSubjectId: linkedSubject.id,
    }
  }

  return user
}
