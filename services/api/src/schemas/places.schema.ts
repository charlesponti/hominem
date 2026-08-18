import * as z from 'zod';

function isIsoDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date (YYYY-MM-DD).')
  .refine(isIsoDate, 'Invalid ISO date.');

const limitSchema = z.number().int().min(1).max(50);

// ── place_visit_history ─────────────────────────────────────────────

const placeVisitSchema = z.object({
  id: z.string(),
  placeName: z.string().nullable(),
  address: z.string().nullable(),
  visitedAt: z.string().nullable(),
  purpose: z.string().nullable(),
  notes: z.string().nullable(),
});

export const placeVisitHistoryInputSchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    limit: limitSchema.default(20),
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

export const placeVisitHistoryOutputSchema = z.object({
  visits: z.array(placeVisitSchema),
  count: z.number().int().min(0),
});
