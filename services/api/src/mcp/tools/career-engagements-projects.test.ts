import { CareerRepository, db, pool } from '@hominem/db';
import { beforeAll, describe, expect, it } from 'vitest';

import type { McpToolResult } from '../tools';

const userId = 'a2000001-0000-4000-8000-000000000003';
const otherUserId = 'a2000001-0000-4000-8000-000000000004';

function resultContent(result: McpToolResult) {
  return result.structuredContent as Record<string, unknown>;
}

beforeAll(async () => {
  for (const id of [userId, otherUserId]) {
    await pool.query(
      'INSERT INTO "user" (id, name, email, "emailVerified") VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
      [id, `Engagement Test User ${id}`, `${id}@test.hominem.dev`, true],
    );
  }
  await import('./career');
});

describe('career engagement MCP tools', () => {
  it('updates and deletes an owned engagement', async () => {
    const engagement = await db
      .insertInto('app.careerEngagements')
      .values({ ownerUserid: userId, company: 'Acme', title: 'Engineer' })
      .returning('id')
      .executeTakeFirstOrThrow();
    const { callTool } = await import('../tools');

    const updated = resultContent(
      await callTool(userId, 'career_engagement_update', {
        id: engagement.id,
        data: {
          title: 'Senior Engineer',
          location: 'Lisbon',
          salaryLow: 10000000,
          salaryHigh: 12000000,
          currency: 'USD',
          kind: 'EMPLOYMENT',
          isCurrent: true,
          reasonForLeaving: null,
        },
      }),
    ) as { engagement: { title: string; location: string; salaryLow: number; isCurrent: boolean } };
    expect(updated.engagement.title).toBe('Senior Engineer');
    expect(updated.engagement.location).toBe('Lisbon');
    expect(updated.engagement.salaryLow).toBe(10000000);
    expect(updated.engagement.isCurrent).toBe(true);

    const removed = resultContent(
      await callTool(userId, 'career_engagement_delete', { id: engagement.id }),
    ) as { removed: boolean };
    expect(removed.removed).toBe(true);

    const gone = await db
      .selectFrom('app.careerEngagements')
      .select('id')
      .where('id', '=', engagement.id)
      .executeTakeFirst();
    expect(gone).toBeUndefined();
  });

  it('does not update or delete another user’s engagement', async () => {
    const engagement = await db
      .insertInto('app.careerEngagements')
      .values({ ownerUserid: userId, company: 'Secret Co', title: 'Secret role' })
      .returning('id')
      .executeTakeFirstOrThrow();
    const { callTool } = await import('../tools');

    const updated = resultContent(
      await callTool(otherUserId, 'career_engagement_update', {
        id: engagement.id,
        data: { title: 'Leaked' },
      }),
    ) as { engagement: unknown };
    expect(updated.engagement).toBeNull();

    const removed = resultContent(
      await callTool(otherUserId, 'career_engagement_delete', { id: engagement.id }),
    ) as { removed: boolean };
    expect(removed.removed).toBe(false);

    await db.deleteFrom('app.careerEngagements').where('id', '=', engagement.id).execute();
  });

  it('returns null when an engagement does not exist for the owner during update', async () => {
    const updated = await CareerRepository.updateEngagement(db, {
      id: 'a2000001-0000-4000-8000-000000000099',
      ownerUserid: userId,
      title: 'Nope',
    });

    expect(updated).toBeNull();
  });
});

describe('career project MCP tools', () => {
  it('updates and deletes an owned project', async () => {
    const project = await db
      .insertInto('app.careerProjects')
      .values({ ownerUserid: userId, title: 'Seed Project' })
      .returning('id')
      .executeTakeFirstOrThrow();
    const { callTool } = await import('../tools');

    const updated = resultContent(
      await callTool(userId, 'career_project_update', {
        id: project.id,
        data: {
          title: 'Renamed Project',
          status: 'IN_PROGRESS',
          technologies: ['TypeScript', 'React'],
          shortDescription: 'One-line summary',
        },
      }),
    ) as {
      project: {
        title: string;
        status: string;
        technologies: string[];
        shortDescription: string;
        engagements: unknown[];
      };
    };
    expect(updated.project.title).toBe('Renamed Project');
    expect(updated.project.status).toBe('IN_PROGRESS');
    expect(updated.project.technologies).toEqual(['TypeScript', 'React']);
    expect(updated.project.engagements).toEqual([]);

    const removed = resultContent(
      await callTool(userId, 'career_project_delete', { id: project.id }),
    ) as { removed: boolean };
    expect(removed.removed).toBe(true);

    const gone = await db
      .selectFrom('app.careerProjects')
      .select('id')
      .where('id', '=', project.id)
      .executeTakeFirst();
    expect(gone).toBeUndefined();
  });

  it('does not update or delete another user’s project', async () => {
    const project = await db
      .insertInto('app.careerProjects')
      .values({ ownerUserid: userId, title: 'Private project' })
      .returning('id')
      .executeTakeFirstOrThrow();
    const { callTool } = await import('../tools');

    const updated = resultContent(
      await callTool(otherUserId, 'career_project_update', {
        id: project.id,
        data: { title: 'Leaked project' },
      }),
    ) as { project: unknown };
    expect(updated.project).toBeNull();

    const removed = resultContent(
      await callTool(otherUserId, 'career_project_delete', { id: project.id }),
    ) as { removed: boolean };
    expect(removed.removed).toBe(false);

    await db.deleteFrom('app.careerProjects').where('id', '=', project.id).execute();
  });
});
