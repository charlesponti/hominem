import { PublishingContentTypeSchema, AllContentTypeSchema } from '@hominem/db/schema';
import { ContentService } from '@hominem/notes-services';
import { error, success } from '@hominem/services';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';

const tweetMetadataSchema = z
  .object({
    tweetId: z.string().optional(),
    url: z.string().optional(),
    status: z.enum(['draft', 'posted', 'failed']).default('draft'),
    postedAt: z.string().optional(),
    importedAt: z.string().optional(),
    metrics: z
      .object({
        retweets: z.number().optional(),
        likes: z.number().optional(),
        replies: z.number().optional(),
        views: z.number().optional(),
      })
      .optional(),
    threadPosition: z.number().optional(),
    threadId: z.string().optional(),
    inReplyTo: z.string().optional(),
  })
  .optional();

const createContentSchema = z.object({
  type: PublishingContentTypeSchema.default('tweet'),
  title: z.string().optional(),
  content: z.string(),
  tags: z
    .array(z.object({ value: z.string() }))
    .optional()
    .default([]),
  mentions: z
    .array(z.object({ id: z.string(), name: z.string() }))
    .optional()
    .default([]),
  tweetMetadata: tweetMetadataSchema,
});

const updateContentSchema = z.object({
  type: PublishingContentTypeSchema.optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.object({ value: z.string() })).optional(),
  mentions: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  tweetMetadata: tweetMetadataSchema,
});

export const contentRoutes = new Hono<AppContext>()
  // ListOutput content
  .get('/', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const query = c.req.query();

      const types = query.types?.split(',') as
        | ('tweet' | 'essay' | 'blog_post' | 'social_post')[]
        | undefined;
      const tags = query.tags?.split(',');

      const contentService = new ContentService();
      const content = await contentService.list(userId, {
        types,
        query: query.query,
        tags,
        since: query.since,
      });

      return c.json(success({ content }));
    } catch (err) {
      console.error('[content.list] error:', err);
      return c.json(
        error('INTERNAL_ERROR', `Failed to fetch content: ${err instanceof Error ? err.message : String(err)}`),
        500,
      );
    }
  })

  // Get content by ID
  .get('/:id', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');

      const contentService = new ContentService();
      const content = await contentService.getById(id, userId);

      return c.json(success({ content }));
    } catch (err) {
      if (err instanceof Error && err.message === 'Content not found') {
        return c.json(error('NOT_FOUND', 'Content not found'), 404);
      }
      console.error('[content.getById] error:', err);
      return c.json(
        error('INTERNAL_ERROR', `Failed to fetch content: ${err instanceof Error ? err.message : String(err)}`),
        500,
      );
    }
  })

  // Create content
  .post('/', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const body = await c.req.json();
      const parsed = createContentSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(error('VALIDATION_ERROR', parsed.error.issues[0].message), 400);
      }

      const contentService = new ContentService();
      const newContent = await contentService.create({
        ...parsed.data,
        userId,
      });

      return c.json(success({ content: newContent }), 201);
    } catch (err) {
      console.error('[content.create] error:', err);
      return c.json(
        error('INTERNAL_ERROR', `Failed to create content: ${err instanceof Error ? err.message : String(err)}`),
        500,
      );
    }
  })

  // Update content
  .patch('/:id', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');
      const body = await c.req.json();
      const parsed = updateContentSchema.safeParse(body);

      if (!parsed.success) {
        return c.json(error('VALIDATION_ERROR', parsed.error.issues[0].message), 400);
      }

      const contentService = new ContentService();
      const updatedContent = await contentService.update({
        id,
        userId,
        ...parsed.data,
      });

      return c.json(success({ content: updatedContent }));
    } catch (err) {
      if (err instanceof Error && err.message === 'Content not found or not authorized to update') {
        return c.json(error('NOT_FOUND', 'Content not found'), 404);
      }
      console.error('[content.update] error:', err);
      return c.json(
        error('INTERNAL_ERROR', `Failed to update content: ${err instanceof Error ? err.message : String(err)}`),
        500,
      );
    }
  })

  // Delete content
  .delete('/:id', authMiddleware, async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');

      const contentService = new ContentService();
      await contentService.delete(id, userId);

      return c.json(success({ success: true, message: 'Content deleted successfully' }));
    } catch (err) {
      if (err instanceof Error && err.message === 'Content not found') {
        return c.json(error('NOT_FOUND', 'Content not found'), 404);
      }
      console.error('[content.delete] error:', err);
      return c.json(
        error('INTERNAL_ERROR', `Failed to delete content: ${err instanceof Error ? err.message : String(err)}`),
        500,
      );
    }
  });
