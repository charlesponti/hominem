import { google } from '@ai-sdk/google';
import { ContentStrategySchema } from '@hominem/db/schema';
import { ContentStrategiesService, content_generator, NotFoundError, ValidationError, InternalError } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { generateText } from 'ai';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';
import {
  contentStrategiesCreateSchema,
  contentStrategiesUpdateSchema,
  contentStrategiesGenerateSchema,
  type ContentStrategiesListOutput,
  type ContentStrategiesGetOutput,
  type ContentStrategiesCreateOutput,
  type ContentStrategiesUpdateOutput,
  type ContentStrategiesDeleteOutput,
  type ContentStrategiesGenerateOutput,
} from '../types/content-strategies.types';

export const contentStrategiesRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  // ListOutput content strategies
  .get('/', async (c) => {
    try {
      const userId = c.get('userId')!;
      const contentStrategiesService = new ContentStrategiesService();

      const strategies = await contentStrategiesService.getByUserId(userId);
      return c.json<ContentStrategiesListOutput>(strategies);
    } catch (err) {
      console.error('[contentStrategies.list] error:', err);
      throw new InternalError(`Failed to get content strategies: ${err instanceof Error ? err.message : String(err)}`);
    }
  })

  // Get content strategy by ID
  .get('/:id', async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');

      const contentStrategiesService = new ContentStrategiesService();
      const strategy = await contentStrategiesService.getById(id, userId);

      if (!strategy) {
        throw new NotFoundError('Content strategy');
      }

      return c.json<ContentStrategiesGetOutput>(strategy);
    } catch (err) {
      console.error('[contentStrategies.getById] error:', err);
      throw new InternalError(`Failed to get content strategy: ${err instanceof Error ? err.message : String(err)}`);
    }
  })

  // Create content strategy
  .post('/', zValidator('json', contentStrategiesCreateSchema), async (c) => {
    try {
      const userId = c.get('userId')!;
      const data = c.req.valid('json');

      const contentStrategiesService = new ContentStrategiesService();
      const result = await contentStrategiesService.create({
        title: data.title,
        description: data.description,
        strategy: (data.strategy || {}) as any,
        userId,
      });

      return c.json<ContentStrategiesCreateOutput>(result, 201);
    } catch (err) {
      console.error('[contentStrategies.create] error:', err);
      throw new InternalError(`Failed to create content strategy: ${err instanceof Error ? err.message : String(err)}`);
    }
  })

  // Update content strategy
  .patch('/:id', zValidator('json', contentStrategiesUpdateSchema), async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');
      const data = c.req.valid('json');

      const contentStrategiesService = new ContentStrategiesService();
      const result = await contentStrategiesService.update(id, userId, {
        title: data.title,
        description: data.description,
        strategy: (data.strategy || {}) as any,
      });

      if (!result) {
        throw new NotFoundError('Content strategy');
      }

      return c.json<ContentStrategiesUpdateOutput>(result);
    } catch (err) {
      console.error('[contentStrategies.update] error:', err);
      throw new InternalError(`Failed to update content strategy: ${err instanceof Error ? err.message : String(err)}`);
    }
  })

  // Delete content strategy
  .delete('/:id', async (c) => {
    try {
      const userId = c.get('userId')!;
      const id = c.req.param('id');

      const contentStrategiesService = new ContentStrategiesService();
      const deleted = await contentStrategiesService.delete(id, userId);

      if (!deleted) {
        throw new NotFoundError('Content strategy');
      }

      return c.json<ContentStrategiesDeleteOutput>(undefined as any, 200);
    } catch (err) {
      console.error('[contentStrategies.delete] error:', err);
      throw new InternalError(`Failed to delete content strategy: ${err instanceof Error ? err.message : String(err)}`);
    }
  })

  // Generate content strategy using AI
  .post('/generate', zValidator('json', contentStrategiesGenerateSchema), async (c) => {
    try {
      const { topic, audience, platforms } = c.req.valid('json');

      const result = await generateText({
        model: google('gemini-1.5-pro-latest'),
        tools: {
          content_generator,
        },
        system:
          'You are a professional content strategist who helps create comprehensive content plans tailored to specific topics and audiences.',
        messages: [
          {
            role: 'user',
            content: `Create a comprehensive content strategy for the topic "${topic}" targeting the audience "${audience}". Include the following elements:
        
  1. Key insights about the topic and audience.
  2. A detailed content plan including:
      - Blog post ideas with titles, outlines, word counts, SEO keywords, and CTAs.
      - Social media content ideas for platforms like ${platforms.join(', ')}.
      - Visual content ideas such as infographics and image search terms.
  3. Monetization ideas and competitive analysis.
         
  Ensure all content ideas are tailored to both the topic and audience.`,
          },
        ],
        maxSteps: 5,
      });

      const toolCall = result.response.messages.find((message) => message.role === 'tool');

      if (toolCall && Array.isArray(toolCall.content) && toolCall.content.length > 0) {
        const toolResult = toolCall.content[0] as { result: unknown };
        return c.json<ContentStrategiesGenerateOutput>(toolResult.result as any ?? {});
      }

      console.error(
        'Content strategy generation did not produce the expected tool call output.',
        result,
      );
      throw new InternalError('Failed to extract content strategy from AI response');
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw new ValidationError(`Invalid input: ${err.issues.map((i) => i.message).join(', ')}`);
      }
      console.error('[contentStrategies.generate] error:', err);
      throw new InternalError('Failed to generate content strategy');
    }
  });
