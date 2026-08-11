import { db, pool } from '@hominem/db';
import { beforeAll, describe, expect, it } from 'vitest';

import type { McpToolResult } from '../tools';

const userId = 'a2000001-0000-4000-8000-000000000001';

function resultContent(result: McpToolResult) {
  return result.structuredContent as Record<string, unknown>;
}

beforeAll(async () => {
  await pool.query('DELETE FROM "user" WHERE id = $1', [userId]);
  await pool.query(
    'INSERT INTO "user" (id, name, email, "emailVerified") VALUES ($1, $2, $3, $4)',
    [userId, 'Wishlist Test User', `${userId}@test.hominem.dev`, true],
  );
  await import('./career');
});

describe('career wishlist MCP tools', () => {
  it('creates, lists, updates, and removes a wishlist company', async () => {
    const { callTool } = await import('../tools');
    const created = resultContent(
      await callTool(userId, 'career_wishlist_add', { company: 'OpenAI' }),
    ) as { company: { id: string; company: string } };
    expect(created.company.company).toBe('OpenAI');

    const duplicate = resultContent(
      await callTool(userId, 'career_wishlist_add', { company: 'openai' }),
    ) as { company: { id: string } };
    expect(duplicate.company.id).toBe(created.company.id);

    const listed = resultContent(await callTool(userId, 'career_wishlist_companies', {})) as {
      companies: Array<{ id: string }>;
    };
    expect(listed.companies.map((company) => company.id)).toContain(created.company.id);

    const updated = resultContent(
      await callTool(userId, 'career_wishlist_update', {
        id: created.company.id,
        company: 'OpenAI Research',
      }),
    ) as { company: { company: string } };
    expect(updated.company.company).toBe('OpenAI Research');

    const removed = resultContent(
      await callTool(userId, 'career_wishlist_remove', { id: created.company.id }),
    ) as { removed: boolean };
    expect(removed.removed).toBe(true);
  });

  it('does not expose another user’s wishlist entry', async () => {
    const otherUserId = 'a2000001-0000-4000-8000-000000000002';
    await pool.query(
      'INSERT INTO "user" (id, name, email, "emailVerified") VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
      [otherUserId, 'Other Wishlist User', `${otherUserId}@test.hominem.dev`, true],
    );
    const entry = await db
      .insertInto('app.careerApplications')
      .values({ ownerUserid: userId, company: 'Secret Co', title: 'Secret Co', status: 'WISHLIST' })
      .returning('id')
      .executeTakeFirstOrThrow();
    const { callTool } = await import('../tools');

    const result = resultContent(
      await callTool(otherUserId, 'career_wishlist_remove', { id: entry.id }),
    ) as { removed: boolean };
    expect(result.removed).toBe(false);

    await db.deleteFrom('app.careerApplications').where('id', '=', entry.id).execute();
  });
});
