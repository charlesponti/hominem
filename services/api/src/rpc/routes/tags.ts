import { db, ForbiddenError, NotFoundError } from '@hominem/db';
import {
  CreateTagInputSchema,
  TaggingInputSchema,
  TagSyncInputSchema,
  UpdateTagInputSchema,
} from '@hominem/rpc/schemas/tags.schema';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import type { AppContext } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';

async function getTagWithOwnershipCheck(id: string, userId: string) {
  const tag = await db
    .selectFrom('app.tags')
    .selectAll()
    .where('id', '=', id)
    .where('owner_user_id', '=', userId)
    .executeTakeFirst();

  if (!tag) {
    throw new ForbiddenError('Tag not found or access denied');
  }
  return tag;
}

export const tagsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', async (c) => {
    const userId = c.get('userId')!;
    const tags = await db
      .selectFrom('app.tags')
      .selectAll()
      .where('owner_user_id', '=', userId)
      .orderBy('name', 'asc')
      .execute();
    return c.json({ success: true, data: tags });
  })
  .get('/:id', async (c) => {
    const userId = c.get('userId')!;
    const id = c.req.param('id');

    const tag = await getTagWithOwnershipCheck(id, userId);
    return c.json({ success: true, data: tag });
  })
  .post('/', zValidator('json', CreateTagInputSchema), async (c) => {
    const userId = c.get('userId')!;
    const data = c.req.valid('json');

    const newTag = await db
      .insertInto('app.tags')
      .values({
        owner_user_id: userId,
        name: data.name,
        color: data.color ?? null,
        description: data.description ?? null,
        path: `/${data.name}`,
        slug: data.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return c.json({ success: true, data: newTag }, 201);
  })
  .patch('/:id', zValidator('json', UpdateTagInputSchema), async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');
      const data = c.req.valid('json');

      // Verify ownership
      await getTagWithOwnershipCheck(id, userId);

      const updateData: {
        name?: string;
        color?: string | null;
        description?: string | null;
        emoji_image_url?: string | null;
      } = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.color !== undefined) updateData.color = data.color ?? null;
      if (data.description !== undefined) updateData.description = data.description ?? null;
      if (data.emojiImageUrl !== undefined) updateData.emoji_image_url = data.emojiImageUrl ?? null;

      const updatedTag = await db
        .updateTable('app.tags')
        .set(updateData)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst();

      if (!updatedTag) {
        throw new NotFoundError('Tag not found');
      }
      return c.json({ success: true, data: updatedTag });
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error;
      }
      throw error;
    }
  })
  .delete('/:id', async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');

      // Verify ownership
      await getTagWithOwnershipCheck(id, userId);

      const result = await db.deleteFrom('app.tags').where('id', '=', id).executeTakeFirst();

      if ((result.numDeletedRows ?? 0n) === 0n) {
        throw new NotFoundError('Tag not found');
      }
      return c.json({ success: true, data: { id } });
    } catch (error) {
      if (error instanceof ForbiddenError) {
        throw error;
      }
      throw error;
    }
  })
  .post('/:id/tag', zValidator('json', TaggingInputSchema), async (c) => {
    const userId = c.get('userId')!;
    const tagId = c.req.param('id');
    const data = c.req.valid('json');

    // Verify tag exists and user owns it
    await getTagWithOwnershipCheck(tagId, userId);

    const result = await db
      .insertInto('app.tag_assignments')
      .values({
        tag_id: tagId,
        entity_id: data.entityId,
        entity_table: data.entityType,
      })
      .returningAll()
      .executeTakeFirst();

    return c.json({ success: true, data: result }, 201);
  })
  .delete('/:id/tag/:entityId', async (c) => {
    const userId = c.get('userId')!;
    const tagId = c.req.param('id');
    const entityId = c.req.param('entityId');
    const entityType = c.req.query('entityType');

    if (!entityType) {
      throw new Error('entityType query parameter required');
    }

    // Verify tag exists and user owns it
    await getTagWithOwnershipCheck(tagId, userId);

    const result = await db
      .deleteFrom('app.tag_assignments')
      .where('tag_id', '=', tagId)
      .where('entity_id', '=', entityId)
      .where('entity_table', '=', entityType)
      .executeTakeFirst();

    if ((result.numDeletedRows ?? 0n) === 0n) {
      throw new NotFoundError('Tagging not found');
    }

    return c.json({ success: true, data: { id: tagId } });
  })
  .put('/:id/sync', zValidator('json', TagSyncInputSchema), async (c) => {
    const userId = c.get('userId')!;
    const tagId = c.req.param('id');
    const data = c.req.valid('json');

    // Verify tag exists and user owns it
    await getTagWithOwnershipCheck(tagId, userId);

    // Delete all current tagged items for this entity
    await db
      .deleteFrom('app.tag_assignments')
      .where('entity_id', '=', data.entityId)
      .where('entity_table', '=', data.entityType)
      .execute();

    // Insert new tagged items
    if (data.tagIds && data.tagIds.length > 0) {
      await db
        .insertInto('app.tag_assignments')
        .values(
          data.tagIds.map((tid) => ({
            tag_id: tid,
            entity_id: data.entityId,
            entity_table: data.entityType,
          })),
        )
        .execute();
    }

    return c.json({ success: true, data: { id: tagId } });
  });
