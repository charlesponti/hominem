import { STEP_UP_ACTIONS } from '@hominem/auth/step-up-actions';
import { db } from '@hominem/db';
import { Hono } from 'hono';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const proofStore = vi.hoisted(() => new Map<string, string>());
const STEP_UP_USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FIRST_TIME_USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

vi.mock('@hominem/services/redis', () => ({
  redis: {
    on: vi.fn(),
    set: vi.fn(async (key: string, value: string) => {
      proofStore.set(key, value);
      return 'OK';
    }),
    get: vi.fn(async (key: string) => proofStore.get(key) ?? null),
  },
}));

import { authRoutes } from './auth';

function createAuthedApp() {
  return new Hono<{
    Variables: {
      userId?: string;
    };
  }>()
    .use('*', async (c, next) => {
      c.set('userId', STEP_UP_USER_ID);
      await next();
    })
    .route('/api/auth', authRoutes);
}

function createAuthedAppForUser(userId: string) {
  return new Hono<{
    Variables: {
      userId?: string;
    };
  }>()
    .use('*', async (c, next) => {
      c.set('userId', userId);
      await next();
    })
    .route('/api/auth', authRoutes);
}

describe('auth step-up enforcement', () => {
  beforeEach(async () => {
    proofStore.clear();
    await db
      .deleteFrom('user_passkey')
      .where('user_id', 'in', [STEP_UP_USER_ID, FIRST_TIME_USER_ID])
      .execute();
    await db.deleteFrom('users').where('id', 'in', [STEP_UP_USER_ID, FIRST_TIME_USER_ID]).execute();

    await db
      .insertInto('users')
      .values([
        {
          id: STEP_UP_USER_ID,
          email: 'step-up-existing@hominem.test',
          name: 'Existing Passkey User',
          is_admin: false,
        },
        {
          id: FIRST_TIME_USER_ID,
          email: 'step-up-first-time@hominem.test',
          name: 'First Time Passkey User',
          is_admin: false,
        },
      ])
      .execute();

    await db
      .insertInto('user_passkey')
      .values({
        id: 'step-up-passkey',
        user_id: STEP_UP_USER_ID,
        name: 'Existing Device',
        public_key: 'public-key',
        credential_id: 'credential-id',
        counter: 0,
        device_type: 'singleDevice',
        backed_up: false,
        transports: 'internal',
        aaguid: 'test-aaguid',
      })
      .execute();
  });

  test('blocks passkey registration options without recent step-up proof', async () => {
    const app = createAuthedApp();

    const response = await app.request('http://localhost/api/auth/passkey/register/options', {
      method: 'POST',
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: 'step_up_required',
      action: STEP_UP_ACTIONS.PASSKEY_REGISTER,
    });
  });

  test('allows first passkey registration to proceed without step-up proof', async () => {
    const app = createAuthedAppForUser(FIRST_TIME_USER_ID);

    const response = await app.request('http://localhost/api/auth/passkey/register/options', {
      method: 'POST',
    });

    expect(response.status).not.toBe(403);
  });

  test('blocks passkey deletion without recent step-up proof', async () => {
    const app = createAuthedApp();

    const response = await app.request('http://localhost/api/auth/passkey/delete', {
      method: 'DELETE',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ id: 'passkey-1' }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: 'step_up_required',
      action: STEP_UP_ACTIONS.PASSKEY_DELETE,
    });
  });
});
