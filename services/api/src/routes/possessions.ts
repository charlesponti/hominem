import { type UserId, brandId, ForbiddenError, InternalError, NotFoundError } from '@hominem/db';
import {
  createPossession,
  deletePossession,
  listPossessions,
  updatePossession,
} from '@hominem/db/services/possessions.service';
import { logger } from '@hominem/utils/logger';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';

import type { AppEnv } from '../server';

export const possessionsRoutes = new Hono<AppEnv>();
type PossessionOutput = Awaited<ReturnType<typeof listPossessions>>[number];

// Serialize possession Date objects to ISO strings
function serializePossession(possession: PossessionOutput) {
  const dateToString = (date: Date | string | null): string | null => {
    if (!date) return null;
    return typeof date === 'string' ? date : date.toISOString();
  };

  return {
    ...possession,
    purchaseDate: dateToString(possession.purchaseDate),
    createdAt: dateToString(possession.createdAt),
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
    throw new ForbiddenError('Unauthorized');
  }

  try {
    const items = await listPossessions(brandId<UserId>(userId));
    return c.json(items.map(serializePossession));
  } catch (err) {
    logger.error('Error fetching possessions', { error: err });
    throw new InternalError('Failed to fetch possessions', {
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

// Create a new possession
possessionsRoutes.post('/', zValidator('json', createPossessionSchema), async (c) => {
  const user = c.get('user');
  if (!user) {
    throw new ForbiddenError('Unauthorized');
  }

  const userId = c.get('userId');
  if (!userId) {
    throw new ForbiddenError('Unauthorized');
  }

  try {
    const data = c.req.valid('json');

    const created = await createPossession(brandId<UserId>(userId), {
      name: data.name,
      ...(data.description !== undefined ? { description: data.description } : {}),
      category: data.categoryId,
    });

    return c.json(serializePossession(created), 201);
  } catch (err) {
    logger.error('Error creating possession', { error: err });
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
      throw new ForbiddenError('Unauthorized');
    }

    try {
      const { id } = c.req.valid('param');
      const data = c.req.valid('json');

      const updated = await updatePossession(id, brandId<UserId>(userId), {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.categoryId !== undefined && { category: data.categoryId }),
      });

      if (!updated) {
        throw new NotFoundError('Possession not found');
      }

      return c.json(serializePossession(updated));
    } catch (err) {
      logger.error('Error updating possession', { error: err });
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
    throw new ForbiddenError('Unauthorized');
  }

  const userId = c.get('userId');
  if (!userId) {
    throw new ForbiddenError('Unauthorized');
  }

  try {
    const { id } = c.req.valid('param');

    await deletePossession(id, brandId<UserId>(userId));

    return c.json({ deleted: true });
  } catch (err) {
    logger.error('Error deleting possession', { error: err });
    throw new InternalError('Failed to delete possession', {
      details: err instanceof Error ? err.message : String(err),
    });
  }
});
