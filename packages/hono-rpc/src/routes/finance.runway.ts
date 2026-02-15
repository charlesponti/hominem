import { calculateRunway, runwayCalculationSchema } from '@hominem/finance-services';
import { isServiceError, InternalError } from '@hominem/services';
import { logger } from '@hominem/utils/logger';
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
        {
          runwayMonths: result.runwayMonths,
          runwayEndDate: result.runwayEndDate,
          isRunwayDangerous: result.isRunwayDangerous,
          totalPlannedExpenses: result.totalPlannedExpenses,
          projectionData: result.projectionData,
          months: result.runwayMonths,
          years: result.runwayMonths / 12,
        },
        200,
      );
    } catch (err) {
      if (isServiceError(err)) {
        throw err;
      }
      logger.error('Runway calculation error', { error: err });
      throw new InternalError('Failed to calculate runway');
    }
  });
