import { calculateRunway, runwayCalculationSchema } from '@hominem/finance-services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { publicMiddleware, type AppContext } from '../middleware/auth';

/**
 * Finance Runway Routes
 *
 * Handles runway calculation (public endpoint):
 * - POST /calculate - Calculate financial runway
 */

export const runwayRoutes = new Hono<AppContext>()
  .use('*', publicMiddleware)

  // POST /calculate - Calculate runway (public)
  .post('/calculate', zValidator('json', runwayCalculationSchema), async (c) => {
    const input = c.req.valid('json');

    try {
      const result = calculateRunway(input);

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Runway calculation error:', error);
      return c.json(
        {
          success: false,
          error: 'Failed to calculate runway',
        },
        500,
      );
    }
  });
