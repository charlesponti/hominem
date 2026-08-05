import { randomUUID } from 'node:crypto';

import { authDb, db } from '@hominem/db';

type CareerTestUser = {
  id: string;
  email: string;
  name: string;
};

type CreateUserOptions = {
  name?: string;
  email?: string;
};

export function createCareerTestDb() {
  const userIds: string[] = [];

  async function createUser(options: CreateUserOptions = {}): Promise<CareerTestUser> {
    const id = `career-test-${randomUUID()}`;
    const user = {
      id,
      email: options.email ?? `${id}@example.com`,
      name: options.name ?? 'Test User',
    };
    userIds.push(user.id);

    await authDb.insertInto('user').values(user).execute();

    return user;
  }

  async function createProfile(
    options: { user?: CareerTestUser; slug?: string; title?: string } = {},
  ) {
    const user = options.user ?? (await createUser({ name: 'Profile User' }));
    const profileId = randomUUID();

    const profile = await db
      .insertInto('app.careerProfile')
      .values({
        id: profileId,
        ownerUserid: user.id,
        slug: options.slug,
        title: options.title,
        firstName: user.name,
        email: user.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    return { profile, user };
  }

  async function cleanup() {
    if (userIds.length === 0) return;

    await authDb.deleteFrom('user').where('id', 'in', userIds).execute();
    userIds.length = 0;
  }

  return {
    cleanup,
    createProfile,
    createUser,
  };
}
