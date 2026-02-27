import { db, eq } from '@hominem/db';
import { authSubjects } from '@hominem/db/schema/auth';
import { users } from '@hominem/db/schema/users';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, test } from 'vitest';

describe('auth_subjects constraints', () => {
  const userIdA = randomUUID();
  const userIdB = randomUUID();
  const providerSubject = `apple-subject-${randomUUID()}`;

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userIdA));
    await db.delete(users).where(eq(users.id, userIdB));
  });

  test('enforces global uniqueness for provider/provider_subject', async () => {
    const now = new Date().toISOString();

    await db.insert(users).values({
      id: userIdA,
      email: `auth-subject-a-${randomUUID()}@example.com`,
      isAdmin: false,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(users).values({
      id: userIdB,
      email: `auth-subject-b-${randomUUID()}@example.com`,
      isAdmin: false,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(authSubjects).values({
      id: randomUUID(),
      userId: userIdA,
      provider: 'google',
      providerSubject,
      isPrimary: true,
      linkedAt: now,
    });

    await expect(
      db.insert(authSubjects).values({
        id: randomUUID(),
        userId: userIdB,
        provider: 'google',
        providerSubject,
        isPrimary: false,
        linkedAt: now,
      }),
    ).rejects.toThrow();
  });
});
