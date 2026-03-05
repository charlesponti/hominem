import { randomUUID } from 'node:crypto';

import { db, eq, sql } from '@hominem/db';
import { authSubjects, users } from '@hominem/db/all-schema';
import { createTestUser } from '@hominem/db/test/fixtures';
import { afterAll, describe, expect, test } from 'vitest';

describe('auth_subjects constraints', () => {
  const userIdA = randomUUID();
  const userIdB = randomUUID();
  const providerSubject = `apple-subject-${randomUUID()}`;

  const hasTable = async (tableName: string) => {
    try {
      await db.execute(sql.raw(`select 1 from "${tableName}" limit 1`));
      return true;
    } catch {
      return false;
    }
  };

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userIdA));
    await db.delete(users).where(eq(users.id, userIdB));
  });

  test('enforces global uniqueness for provider/provider_subject', async () => {
    if (!(await hasTable('auth_subjects'))) {
      return;
    }

    await createTestUser({
      id: userIdA,
      email: `auth-subject-a-${randomUUID()}@example.com`,
    });

    await createTestUser({
      id: userIdB,
      email: `auth-subject-b-${randomUUID()}@example.com`,
    });

    await db.insert(authSubjects).values({
      id: randomUUID(),
      userId: userIdA,
      provider: 'google',
      providerSubject,
      isPrimary: true,
      linkedAt: new Date().toISOString(),
    });

    await expect(
      db.insert(authSubjects).values({
        id: randomUUID(),
        userId: userIdB,
        provider: 'google',
        providerSubject,
        isPrimary: false,
        linkedAt: new Date().toISOString(),
      }),
    ).rejects.toThrow();
  });
});
