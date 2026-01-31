import type { PossessionOutput } from '@hominem/db/types/possessions';

import {
  createPossession,
  deletePossession,
  listPossessions,
  updatePossession,
  UnauthorizedError,
  NotFoundError,
  InternalError,
} from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import crypto from 'node:crypto';
import { z } from 'zod';

import type { AppEnv } from '../server';

export const possessionsRoutes = new Hono<AppEnv>();

// Serialize possession Date objects to ISO strings
function serializePossession(possession: PossessionOutput) {
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
    throw new UnauthorizedError('Unauthorized');
  }

  try {
    const items = await listPossessions(userId);
    return c.json(items.map(serializePossession));
  } catch (err) {
    console.error('Error fetching possessions:', err);
    throw new InternalError('Failed to fetch possessions', {
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// Create a new possession
possessionsRoutes.post('/', zValidator('json', createPossessionSchema), async (c) => {
  const user = c.get('user');
  if (!user) {
    throw new UnauthorizedError('Unauthorized');
  }

  const userId = c.get('userId');
  if (!userId) {
    throw new UnauthorizedError('Unauthorized');
  }

  try {
    const data = c.req.valid('json');

    const created = await createPossession({
      ...data,
      id: crypto.randomUUID ? crypto.randomUUID() : 'generated-id',
      userId,
      dateAcquired: new Date(data.dateAcquired),
    });

    return c.json(serializePossession(created), 201);
  } catch (err) {
    console.error('Error creating possession:', err);
    throw new InternalError('Failed to create possession', {
      details: err instanceof Error ? err.message : String(err),
    });
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
      throw new UnauthorizedError('Unauthorized');
    }

    try {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');

      const updated = await updatePossession({
        id,
        userId,
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.dateAcquired !== undefined && { dateAcquired: new Date(data.dateAcquired) }),
        ...(data.purchasePrice !== undefined && { purchasePrice: data.purchasePrice }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      });

      if (!updated) {
        throw new NotFoundError('Possession not found');
      }

      return c.json(serializePossession(updated));
    } catch (err) {
      console.error('Error updating possession:', err);
      throw new InternalError('Failed to update possession', {
        details: err instanceof Error ? err.message : String(err),
      });
    }
  },
);

// Delete a possession
possessionsRoutes.delete('/:id', zValidator('param', possessionIdParamSchema), async (c) => {
  const user = c.get('user');
  if (!user) {
    throw new UnauthorizedError('Unauthorized');
  }

  const userId = c.get('userId');
  if (!userId) {
    throw new UnauthorizedError('Unauthorized');
  }

  try {
    const { id } = c.req.valid('param');

    await deletePossession(id, userId);

    return c.json({ deleted: true });
  } catch (err) {
    console.error('Error deleting possession:', err);
    throw new InternalError('Failed to delete possession', {
      details: err instanceof Error ? err.message : String(err),
    });
  }
});
