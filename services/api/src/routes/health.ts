import { logger } from '@hominem/utils/logger';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';

import { notFound, unavailable } from '../errors';
import type { AppEnv } from '../server';

const healthQuerySchema = z.object({
  userId: z.string().optional(),
  startDate: z
    .string()
    .transform((value) => new Date(value))
    .optional(),
  endDate: z
    .string()
    .transform((value) => new Date(value))
    .optional(),
  activityType: z.string().optional(),
  detailed: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
});

const healthDataSchema = z.object({
  userId: z.string(),
  date: z.string(),
  activityType: z.string(),
  duration: z.number(),
  caloriesBurned: z.number(),
  notes: z.string().optional(),
});

const updateHealthDataSchema = z.object({
  date: z.string().optional(),
  activityType: z.string().optional(),
  duration: z.number().optional(),
  caloriesBurned: z.number().optional(),
  notes: z.string().optional(),
});

export const healthRoutes = new Hono<AppEnv>();

healthRoutes.get('/', zValidator('query', healthQuerySchema), async (c) => {
  const query = c.req.valid('query');

  logger.warn('Health record listing is unavailable during the schema redesign', {
    activityType: query.activityType,
    endDate: query.endDate?.toISOString(),
    startDate: query.startDate?.toISOString(),
    userId: query.userId,
  });

  return c.json([]);
});

healthRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  logger.warn('Health record lookup is unavailable during the schema redesign', { id });

  throw notFound('Health record', id);
});

healthRoutes.post('/', zValidator('json', healthDataSchema), async (c) => {
  const input = c.req.valid('json');

  logger.warn('Health record creation is unavailable during the schema redesign', {
    activityType: input.activityType,
    userId: input.userId,
  });

  throw unavailable('Health records are temporarily unavailable', 'health');
});

healthRoutes.put('/:id', zValidator('json', updateHealthDataSchema), async (c) => {
  const id = c.req.param('id');
  const input = c.req.valid('json');

  logger.warn('Health record updates are unavailable during the schema redesign', {
    hasActivityType: input.activityType !== undefined,
    hasDate: input.date !== undefined,
    hasDuration: input.duration !== undefined,
    hasNotes: input.notes !== undefined,
    id,
  });

  throw unavailable('Health records are temporarily unavailable', 'health');
});

healthRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');

  logger.warn('Health record deletion is unavailable during the schema redesign', { id });

  throw unavailable('Health records are temporarily unavailable', 'health');
});
