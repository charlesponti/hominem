import {
  createPossession,
  deletePossession,
  listPossessions,
  updatePossession,
  success,
  error,
} from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import crypto from 'node:crypto';
import { z } from 'zod';

import type { AppEnv } from '../server';

export const possessionsRoutes = new Hono<AppEnv>();

// Serialize possession Date objects to ISO strings
function serializePossession(possession: {
  dateAcquired: Date;
  dateSold: Date | null;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}) {
  return {
    ...possession,
    dateAcquired: possession.dateAcquired.toISOString(),
    dateSold: possession.dateSold?.toISOString() ?? null,
    createdAt: possession.createdAt.toISOString(),
    updatedAt: possession.updatedAt.toISOString(),
  };
}

const createPossessionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  dateAcquired: z.string(),
  purchasePrice: z.number(),
  categoryId: z.string(),
});

const updatePossessionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  dateAcquired: z.string().optional(),
  purchasePrice: z.number().optional(),
  categoryId: z.string().optional(),
});

const possessionIdParamSchema = z.object({
  id: z.string().uuid('Invalid possession ID format'),
});

// Get all possessions for user
possessionsRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(error('UNAUTHORIZED', 'Unauthorized'), 401);
  }

  try {
    const items = await listPossessions(userId);
    return c.json(success(items.map(serializePossession)), 200);
  } catch (err) {
    console.error('Error fetching possessions:', err);
    return c.json(
      error('INTERNAL_ERROR', 'Failed to fetch possessions', {
        details: err instanceof Error ? err.message : String(err),
      }),
      500,
    );
  }
});

// Create a new possession
possessionsRoutes.post('/', zValidator('json', createPossessionSchema), async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json(error('UNAUTHORIZED', 'Unauthorized'), 401);
  }

  const userId = c.get('userId');
  if (!userId) {
    return c.json(error('UNAUTHORIZED', 'Unauthorized'), 401);
  }

  try {
    const data = c.req.valid('json');

    const created = await createPossession({
      ...data,
      id: crypto.randomUUID ? crypto.randomUUID() : 'generated-id',
      userId,
      dateAcquired: new Date(data.dateAcquired),
    });

    return c.json(success(serializePossession(created)), 201);
  } catch (err) {
    console.error('Error creating possession:', err);
    return c.json(
      error('INTERNAL_ERROR', 'Failed to create possession', {
        details: err instanceof Error ? err.message : String(err),
      }),
      500,
    );
  }
});

// Update a possession
possessionsRoutes.put(
  '/:id',
  zValidator('param', possessionIdParamSchema),
  zValidator('json', updatePossessionSchema),
  async (c) => {
    const userId = c.get('userId');
    if (!userId) {
      return c.json(error('UNAUTHORIZED', 'Unauthorized'), 401);
    }

    try {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');

      const updated = await updatePossession({
        ...data,
        id,
        userId,
        dateAcquired: data.dateAcquired ? new Date(data.dateAcquired) : undefined,
      });

      if (!updated) {
        return c.json(error('NOT_FOUND', 'Possession not found'), 404);
      }

      return c.json(success(serializePossession(updated)), 200);
    } catch (err) {
      console.error('Error updating possession:', err);
      return c.json(
        error('INTERNAL_ERROR', 'Failed to update possession', {
          details: err instanceof Error ? err.message : String(err),
        }),
        500,
      );
    }
  },
);

// Delete a possession
possessionsRoutes.delete('/:id', zValidator('param', possessionIdParamSchema), async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json(error('UNAUTHORIZED', 'Unauthorized'), 401);
  }

  const userId = c.get('userId');
  if (!userId) {
    return c.json(error('UNAUTHORIZED', 'Unauthorized'), 401);
  }

  try {
    const { id } = c.req.valid('param');

    await deletePossession(id, userId);

    return c.json(success({ deleted: true }), 200);
  } catch (err) {
    console.error('Error deleting possession:', err);
    return c.json(
      error('INTERNAL_ERROR', 'Failed to delete possession', {
        details: err instanceof Error ? err.message : String(err),
      }),
      500,
    );
  }
});
