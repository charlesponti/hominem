import {
  createHealthRecord,
  deleteHealthRecord,
  getHealthRecord,
  listHealthRecords,
  updateHealthRecord,
  type HealthRecordRow,
} from '@hominem/health-services';
import { NotFoundError, InternalError } from '@hominem/hono-rpc';
import { logger } from '@hominem/utils/logger';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';

import type { AppEnv } from '../server';

// Helper to get timestamp as milliseconds for sorting/comparison
function getTimestamp(date: unknown): number {
  if (!date) return 0;
  if (typeof date === 'string') return new Date(date).getTime();
  if (date instanceof Date) return date.getTime();
  return 0;
}

// Serialize health record timestamps to ISO strings
// Handles both Date objects (legacy) and string timestamps (new schema with precision: 3)
function serializeHealthRecord(record: HealthRecordRow) {
  const serializeDate = (date: unknown): string | null => {
    if (!date) return null;
    if (typeof date === 'string') return date;
    if (date instanceof Date) return date.toISOString();
    return String(date);
  };

  return {
    ...record,
    recorded_at: serializeDate(record.recorded_at),
    created_at: serializeDate(record.created_at),
  };
}

const healthQuerySchema = z.object({
  userId: z.string().optional(),
  startDate: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  endDate: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  activityType: z.string().optional(),
  detailed: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
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

// Get health data with optional filters
healthRoutes.get('/', zValidator('query', healthQuerySchema), async (c) => {
  try {
    const query = c.req.valid('query');
    const results = await listHealthRecords({
      ...(query.userId !== undefined && { userId: query.userId }),
      ...(query.startDate !== undefined && { startDate: query.startDate }),
      ...(query.endDate !== undefined && { endDate: query.endDate }),
      ...(query.activityType !== undefined && { activityType: query.activityType }),
    });

    const sorted = results.sort((a, b) => getTimestamp(b.recorded_at) - getTimestamp(a.recorded_at));
    return c.json(sorted.map(serializeHealthRecord));
  } catch (err) {
    logger.error('Error fetching health data', { error: err });
    throw new InternalError('Failed to fetch health data');
  }
});

// Get health data by ID
healthRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const result = await getHealthRecord(id);

    if (!result) {
      throw new NotFoundError('Health record not found');
    }

    return c.json(serializeHealthRecord(result));
  } catch (err) {
    logger.error('Error fetching health record', { error: err });
    throw new InternalError('Failed to fetch health record');
  }
});

// Add health data
healthRoutes.post('/', zValidator('json', healthDataSchema), async (c) => {
  try {
    const validated = c.req.valid('json');

    const result = await createHealthRecord({
      user_id: validated.userId,
      record_type: validated.activityType,
      recorded_at: validated.date,
      value: validated.duration,
      unit: 'minutes',
      source: null,
      metadata: validated.notes ? { notes: validated.notes } : null,
    });
    if (!result) {
      throw new InternalError('Failed to create health record');
    }
    return c.json(serializeHealthRecord(result), 201);
  } catch (err) {
    logger.error('Error creating health record', { error: err });
    throw new InternalError('Failed to create health record');
  }
});

// Update health data
healthRoutes.put('/:id', zValidator('json', updateHealthDataSchema), async (c) => {
  try {
    const id = c.req.param('id');

    const validated = c.req.valid('json');

    const updates: Partial<Omit<HealthRecordRow, 'id' | 'created_at'>> = {};
    if (validated.date !== undefined) updates.recorded_at = validated.date;
    if (validated.activityType !== undefined) updates.record_type = validated.activityType;
    if (validated.duration !== undefined) updates.value = validated.duration;
    if (validated.notes !== undefined) updates.metadata = { notes: validated.notes };

    const result = await updateHealthRecord(id, updates);

    if (!result) {
      throw new NotFoundError('Health record not found');
    }

    return c.json(serializeHealthRecord(result));
  } catch (err) {
    logger.error('Error updating health record', { error: err });
    throw new InternalError('Failed to update health record');
  }
});

// Delete health data
healthRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const result = await deleteHealthRecord(id);
    if (!result) {
      throw new NotFoundError('Health record not found');
    }

    return c.json({ deleted: true });
  } catch (err) {
    logger.error('Error deleting health record', { error: err });
    throw new InternalError('Failed to delete health record');
  }
});
