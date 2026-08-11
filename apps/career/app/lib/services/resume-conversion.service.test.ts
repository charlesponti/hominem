import { authDb, db } from '@hominem/db';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createCareerTestDb } from '~/test/db/career';
import { makeConvertedResumeData } from '~/test/factories/resume';

import { generateUniqueSlug, saveResumeToDatabase } from './resume-conversion.service';

const testDb = createCareerTestDb();
const slugTestValues = ['test-person', 'test-person-2', 'test-person-3'];

let slugUser: { id: string };

async function cleanupSlugTestRows() {
  await db.deleteFrom('app.careerProfile').where('slug', 'in', slugTestValues).execute();
}

describe('resume conversion slug generation', () => {
  beforeEach(async () => {
    slugUser = await testDb.createUser({ name: 'Slug Test User' });
    await cleanupSlugTestRows();
  });
  afterEach(async () => {
    await testDb.cleanup();
    await cleanupSlugTestRows();
  });

  it('normalizes mixed-case and invalid slug input', async () => {
    await expect(generateUniqueSlug(db, ' Test Person!! ', 'Fallback')).resolves.toBe(
      'test-person',
    );
  });

  it('uses fallback input when the requested slug normalizes to empty', async () => {
    await expect(generateUniqueSlug(db, '!!!', 'Jane Doe')).resolves.toBe('jane-doe');
  });

  it('increments the suffix when the root slug already exists', async () => {
    const slugUser2 = await testDb.createUser({ name: 'Slug Test User 2' });

    await db
      .insertInto('app.careerProfile')
      .values({
        ownerUserid: slugUser.id,
        slug: 'test-person',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .execute();

    await expect(generateUniqueSlug(db, 'test-person')).resolves.toBe('test-person-2');

    await db
      .insertInto('app.careerProfile')
      .values({
        ownerUserid: slugUser2.id,
        slug: 'test-person-2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .execute();

    await expect(generateUniqueSlug(db, 'test-person')).resolves.toBe('test-person-3');
  });

  it('handles the case where the first 99 suffixes are all taken', async () => {
    try {
      for (let i = 1; i <= 100; i++) {
        await authDb
          .insertInto('user')
          .values({
            id: `slug-overflow-${i}`,
            email: `overflow-${i}@test.com`,
            name: `Overflow ${i}`,
          })
          .execute();
        await db
          .insertInto('app.careerProfile')
          .values({
            ownerUserid: `slug-overflow-${i}`,
            slug: `overflow${i === 1 ? '' : `-${i}`}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .execute();
      }

      await expect(generateUniqueSlug(db, 'overflow')).rejects.toThrow(
        'Could not generate a unique profile slug',
      );
    } finally {
      await db.deleteFrom('app.careerProfile').where('slug', 'like', 'overflow%').execute();
      await authDb.deleteFrom('user').where('id', 'like', 'slug-overflow-%').execute();
    }
  });
});

describe('resume conversion database save', () => {
  afterEach(async () => {
    await testDb.cleanup();
  });

  it('creates a profile with all related data', async () => {
    const user = await testDb.createUser({ name: 'Test User' });

    const data = makeConvertedResumeData({
      portfolio: {
        slug: 'my-portfolio',
        title: 'My Portfolio',
        name: user.name,
        email: user.email,
      },
      workExperience: [
        {
          company: 'Acme Corp',
          role: 'Engineer',
          description: 'Built stuff',
          start_date: '2020-01-01',
          end_date: '2022-01-01',
        },
      ],
      skills: [
        {
          name: 'TypeScript',
          level: 80,
          category: 'Technical',
          description: null,
          certifications: [],
        },
      ],
      projects: [
        {
          title: 'Awesome Project',
          description: 'An awesome project',
          short_description: null,
          technologies: ['TypeScript', 'React'],
          live_url: null,
          github_url: null,
          status: 'completed' as const,
        },
      ],
      social_links: {
        github: 'https://github.com/example',
        linkedin: null,
        twitter: null,
        website: null,
      },
      stats: [{ label: 'Years', value: '5+' }],
    });

    const result = await saveResumeToDatabase(user.id, data);

    expect(result.profileSlug).toBe('my-portfolio');

    const profiles = await db
      .selectFrom('app.careerProfile')
      .select(['id', 'slug', 'title'])
      .where('ownerUserid', '=', user.id)
      .execute();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].slug).toBe('my-portfolio');

    const [positionCount, skillCount, project] = await Promise.all([
      db
        .selectFrom('app.careerEngagements')
        .select(({ fn }) => fn.countAll<number>().as('count'))
        .where('ownerUserid', '=', user.id)
        .executeTakeFirstOrThrow(),
      db
        .selectFrom('app.careerSkills')
        .select(({ fn }) => fn.countAll<number>().as('count'))
        .where('ownerUserid', '=', user.id)
        .executeTakeFirstOrThrow(),
      db
        .selectFrom('app.careerProjects')
        .select(['technologies'])
        .where('ownerUserid', '=', user.id)
        .executeTakeFirstOrThrow(),
    ]);

    expect(Number(positionCount.count)).toBe(1);
    expect(Number(skillCount.count)).toBe(1);
    expect(
      typeof project.technologies === 'string'
        ? JSON.parse(project.technologies)
        : project.technologies,
    ).toEqual(['TypeScript', 'React']);
  });

  it('replaces an existing profile', async () => {
    const user = await testDb.createUser({ name: 'Existing User' });
    await testDb.createProfile({ user });

    const result = await saveResumeToDatabase(
      user.id,
      makeConvertedResumeData({
        portfolio: {
          slug: 'imported-portfolio',
          name: user.name,
          email: user.email,
        },
      }),
    );

    const profiles = await db
      .selectFrom('app.careerProfile')
      .select(['id', 'slug'])
      .where('ownerUserid', '=', user.id)
      .execute();

    expect(result.profileSlug).toBe('imported-portfolio');
    expect(profiles).toHaveLength(1);
    expect(profiles[0].slug).toBe('imported-portfolio');
  });
});
