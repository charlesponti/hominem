import {
  createHealthRecord,
  deleteHealthRecord,
  getHealthRecord,
  listHealthRecords,
  updateHealthRecord,
} from '@hominem/health-services';
import { success, error } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import type { AppEnv } from '../server';

// Serialize health record Date objects to ISO strings
function serializeHealthRecord(record: {
  date: Date;
  createdAt: Date | null;
  [key: string]: unknown;
}) {
  return {
    ...record,
    date: record.date.toISOString(),
    createdAt: record.createdAt?.toISOString() ?? null,
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
  date: z.string().transform((str) => new Date(str)),
  activityType: z.string(),
  duration: z.number(),
  caloriesBurned: z.number(),
  notes: z.string().optional(),
});

const updateHealthDataSchema = z.object({
  date: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
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
      userId: query.userId,
      startDate: query.startDate,
      endDate: query.endDate,
      activityType: query.activityType,
    });

    const sorted = results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return c.json(success(sorted.map(serializeHealthRecord)), 200);
  } catch (err) {
    console.error('Error fetching health data:', err);
    return c.json(error('INTERNAL_ERROR', 'Failed to fetch health data'), 500);
  }
});

// Get health data by ID
healthRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return c.json(error('VALIDATION_ERROR', 'Invalid ID format'), 400);
    }

    const result = await getHealthRecord(numericId);

    if (!result) {
      return c.json(error('NOT_FOUND', 'Health record not found'), 404);
    }

    return c.json(success(serializeHealthRecord(result)), 200);
  } catch (err) {
    console.error('Error fetching health record:', err);
    return c.json(error('INTERNAL_ERROR', 'Failed to fetch health record'), 500);
  }
});

// Add health data
healthRoutes.post('/', zValidator('json', healthDataSchema), async (c) => {
  try {
    const validated = c.req.valid('json');

    const result = await createHealthRecord(validated);
    return c.json(success(serializeHealthRecord(result)), 201);
  } catch (err) {
    console.error('Error creating health record:', err);
    return c.json(error('INTERNAL_ERROR', 'Failed to create health record'), 500);
  }
});

// Update health data
healthRoutes.put('/:id', zValidator('json', updateHealthDataSchema), async (c) => {
  try {
    const id = c.req.param('id');
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return c.json(error('VALIDATION_ERROR', 'Invalid ID format'), 400);
    }

    const validated = c.req.valid('json');

    const result = await updateHealthRecord(numericId, validated);

    if (!result) {
      return c.json(error('NOT_FOUND', 'Health record not found'), 404);
    }

    return c.json(success(serializeHealthRecord(result)), 200);
  } catch (err) {
    console.error('Error updating health record:', err);
    return c.json(error('INTERNAL_ERROR', 'Failed to update health record'), 500);
  }
});

// Delete health data
healthRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return c.json(error('VALIDATION_ERROR', 'Invalid ID format'), 400);
    }

    const result = await deleteHealthRecord(numericId);
    if (!result) {
      return c.json(error('NOT_FOUND', 'Health record not found'), 404);
    }

    return c.json(success({ deleted: true }), 200);
  } catch (err) {
    console.error('Error deleting health record:', err);
    return c.json(error('INTERNAL_ERROR', 'Failed to delete health record'), 500);
  }
});
