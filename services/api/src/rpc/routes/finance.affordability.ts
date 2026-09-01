import { affordabilityCheckInputSchema, calculateAffordability } from '@hominem/finance-services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware } from '../middleware/auth';
import type { AppContext } from '../middleware/auth';

const numberFromQuery = z.coerce.number();

const affordabilityInputSchema = z.object({
  purchaseAmount: numberFromQuery,
  currentBalance: numberFromQuery,
  monthlyIncome: numberFromQuery,
  monthlyExpenses: numberFromQuery,
  emergencyFundTarget: numberFromQuery.optional(),
});

export const affordabilityRoutes = new Hono<AppContext>().get(
  '/check',
  authMiddleware,
  zValidator('query', affordabilityInputSchema),
  async (c) => {
    const input = c.req.valid('query');
    const parsed = affordabilityCheckInputSchema.parse(input);
    return c.json(calculateAffordability(parsed));
  },
);
