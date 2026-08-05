import * as z from 'zod';

export const financeMonthlySummaryQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});

export const financeMonthlySummarySchema = z.object({
  month: z.string(),
  startsOn: z.string(),
  endsBefore: z.string(),
  currencyCode: z.string(),
  totalSpent: z.number(),
  totalIncome: z.number(),
  transactionCount: z.number().int().nonnegative(),
  topMerchants: z.array(
    z.object({
      merchantName: z.string(),
      totalSpent: z.number(),
      transactionCount: z.number().int().nonnegative(),
    }),
  ),
  transactions: z.array(
    z.object({
      transactionId: z.string().uuid(),
      accountId: z.string().uuid(),
      accountName: z.string(),
      institutionName: z.string().nullable(),
      postedOn: z.string(),
      amount: z.number(),
      transactionType: z.string(),
      merchantName: z.string().nullable(),
    }),
  ),
});

export type FinanceMonthlySummaryQuery = z.infer<typeof financeMonthlySummaryQuerySchema>;

// ── MCP tools ────────────────────────────────────────────────────────

function isIsoDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date (YYYY-MM-DD).')
  .refine(isIsoDate, 'Invalid ISO date.');

const mcpLimitSchema = z.number().int().min(1).max(50);

// -- finance_net_worth --

export const financeAccountBalanceSchema = z.object({
  accountId: z.string(),
  name: z.string(),
  institution: z.string().nullable(),
  accountType: z.string(),
  currencyCode: z.string(),
  balanceCents: z.number().int(),
  balanceAsOf: z.string().nullable(),
  balanceSource: z.enum(['statement+ledger', 'ledger_only']),
});

export const financeNetWorthInputSchema = z.object({
  includeClosed: z.boolean().default(false),
});

export const financeNetWorthOutputSchema = z.object({
  asOf: z.string(),
  totals: z.array(
    z.object({
      currencyCode: z.string(),
      totalCents: z.number().int(),
      accountCount: z.number().int().min(0),
    }),
  ),
  accounts: z.array(financeAccountBalanceSchema),
  warnings: z.array(z.string()),
});

// -- finance_recent_transactions --

export const financeTransactionSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  accountName: z.string(),
  postedOn: z.string(),
  description: z.string(),
  amountCents: z.number().int(),
  currencyCode: z.string(),
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  excluded: z.boolean(),
  transactionType: z.string(),
});

export const financeRecentTransactionsInputSchema = z
  .object({
    accountId: z.string().optional(),
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    limit: mcpLimitSchema.default(20),
  })
  .superRefine((value, context) => {
    if (value.from && value.to && value.from > value.to) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'from must be on or before to.',
        path: ['to'],
      });
    }
  });

export const financeRecentTransactionsOutputSchema = z.object({
  transactions: z.array(financeTransactionSchema),
  count: z.number().int().min(0),
});

// -- finance_spending_by_category --

export const financeSpendingByCategoryInputSchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    limit: mcpLimitSchema.default(20),
  })
  .superRefine((value, context) => {
    if (value.from && value.to && value.from > value.to) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'from must be on or before to.',
        path: ['to'],
      });
    }
  });

export const financeSpendingByCategoryOutputSchema = z.object({
  from: z.string(),
  to: z.string(),
  currencyCode: z.string().nullable(),
  categories: z.array(
    z.object({
      categoryId: z.string(),
      categoryName: z.string(),
      spentCents: z.number().int(),
      transactionCount: z.number().int(),
    }),
  ),
  warnings: z.array(z.string()),
});
