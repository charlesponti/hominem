import { getAllInstitutions, createInstitution } from '@hominem/finance-services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * Finance Institutions Routes
 *
 * Handles institution operations:
 * - POST /list - List all institutions
 * - POST /create - Create new institution
 */

// ============================================================================
// Validation Schemas
// ============================================================================

const institutionCreateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  url: z.string().url().optional(),
  logo: z.string().optional(),
  primaryColor: z.string().optional(),
  country: z.string().optional(),
});

// ============================================================================
// Routes
// ============================================================================

export const institutionsRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /list - List institutions
  .post('/list', async (c) => {
    try {
      const result = await getAllInstitutions();
      return c.json(result);
    } catch (error) {
      console.error('Error listing institutions:', error);
      return c.json({ error: 'Failed to list institutions' }, 500);
    }
  })

  // POST /create - Create institution
  .post('/create', zValidator('json', institutionCreateSchema), async (c) => {
    const input = c.req.valid('json');

    try {
      const result = await createInstitution(input);
      return c.json(result);
    } catch (error) {
      console.error('Error creating institution:', error);
      return c.json({ error: 'Failed to create institution' }, 500);
    }
  });
