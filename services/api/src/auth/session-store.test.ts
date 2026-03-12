import { db } from '@hominem/db';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createTokenPairForUser } from './session-store';

const createdUserIds: string[] = [];
const createdSessionIds: string[] = [];

async function cleanupUser(userId: string) {
  await db
    .deleteFrom('auth_refresh_tokens')
    .where('session_id', 'in', (eb) =>
      eb.selectFrom('auth_sessions').select('id').where('user_id', '=', userId),
    )
    .execute();
  await db.deleteFrom('auth_sessions').where('user_id', '=', userId).execute();
  await db.deleteFrom('users').where('id', '=', userId).execute();
}

describe('session store', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  afterEach(async () => {
    while (createdUserIds.length > 0) {
      const userId = createdUserIds.pop();
      if (!userId) {
        continue;
      }
      await cleanupUser(userId);
    }
    createdSessionIds.length = 0;
  });

  test('creates persisted sessions with json amr and refresh token metadata', async () => {
    const userId = crypto.randomUUID();
    createdUserIds.push(userId);

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

    createdSessionIds.push(tokenPair.sessionId);

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
