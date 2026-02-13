import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as z from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';
import { type ExportTransactionsOutput, type ExportSummaryOutput } from '../types/finance.types';

/**
 * Finance Export Routes
 */
export const exportRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)

  // POST /transactions - Export transactions
  .post(
    '/transactions',
    zValidator(
      'json',
      z.object({
        format: z.enum(['csv', 'json', 'pdf']),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        accounts: z.array(z.string()).optional(),
        categories: z.array(z.string()).optional(),
      }),
    ),
    async (c) => {
      const input = c.req.valid('json');

      // TODO: Implement actual export logic from services
      if (input.format === 'csv') {
        return c.json<ExportTransactionsOutput>(
          {
            url: '',
            filename: 'transactions.csv',
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            data: 'Date,Description,Amount,Category\n',
          },
          200,
        );
      }

      return c.json<ExportTransactionsOutput>(
        {
          url: '',
          filename: 'transactions.json',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          data: '[]',
        },
        200,
      );
    },
  )

  // POST /summary - Export summary
  .post(
    '/summary',
    zValidator(
      'json',
      z.object({
        year: z.number(),
        format: z.enum(['pdf', 'html', 'csv', 'json']),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    ),
    async (c) => {
      const input = c.req.valid('json');

      // TODO: Implement actual summary export logic
      return c.json<ExportSummaryOutput>(
        {
          url: '',
          filename: `summary-${input.year}.${input.format}`,
          data: '',
        },
        200,
      );
    },
  );
