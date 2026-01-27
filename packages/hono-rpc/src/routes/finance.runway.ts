import { calculateRunway, runwayCalculationSchema } from '@hominem/finance-services';
import { error, success, isServiceError } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { publicMiddleware, type AppContext } from '../middleware/auth';
import { type RunwayCalculateOutput } from '../types/finance.types';

/**
 * Finance Runway Routes
 *
 * Handles runway calculation (public endpoint).
 */
export const runwayRoutes = new Hono<AppContext>()
  .use('*', publicMiddleware)

  // POST /calculate - Calculate runway (public)
  .post('/calculate', zValidator('json', runwayCalculationSchema), async (c) => {
    const input = c.req.valid('json');

    try {
      const result = calculateRunway(input);

      return c.json(
        success({
          runwayMonths: result.runwayMonths,
          runwayEndDate: result.runwayEndDate,
          isRunwayDangerous: result.isRunwayDangerous,
          totalPlannedExpenses: result.totalPlannedExpenses,
          projectionData: result.projectionData,
          months: result.runwayMonths,
          years: result.runwayMonths / 12,
        }),
        200,
      );
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message), err.statusCode as any);
      }
      console.error('Runway calculation error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to calculate runway'), 500);
    }
  });
