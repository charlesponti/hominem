import { db } from '@hominem/db';
import { beforeEach, describe, expect, test } from 'vitest';

import { createTokenPairForUser } from './session-store';

describe('session store', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  test('creates persisted sessions with json amr and refresh token metadata', async () => {
    const userId = crypto.randomUUID();

    await db
      .insertInto('users')
      .values({
        id: userId,
        email: `session-store-${userId}@hominem.test`,
        name: 'Session Store Test',
        is_admin: false,
      })
      .execute();

    const tokenPair = await createTokenPairForUser({
      userId,
      amr: ['email_otp'],
    });

    expect(tokenPair.refreshToken.length).toBeGreaterThan(0);
    expect(tokenPair.refreshFamilyId.length).toBeGreaterThan(0);

    const session = await db
      .selectFrom('auth_sessions')
      .select(['id', 'amr'])
      .where('id', '=', tokenPair.sessionId)
      .executeTakeFirstOrThrow();

    expect(session.id).toBe(tokenPair.sessionId);
    expect(session.amr).toEqual(['email_otp']);
  });
});
