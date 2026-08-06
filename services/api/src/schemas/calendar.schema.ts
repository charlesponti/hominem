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

function fromBeforeTo(value: { from?: string; to?: string }, context: z.RefinementCtx) {
  if (value.from && value.to && value.from > value.to) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'from must be on or before to.',
      path: ['to'],
    });
  }
}

// ── calendar_search / calendar_upcoming ─────────────────────────────

export const calendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
  isAllDay: z.boolean(),
  status: z.string().nullable(),
  calendarName: z.string().nullable(),
  placeName: z.string().nullable(),
  address: z.string().nullable(),
});

export const calendarSearchInputSchema = z
  .object({
    query: z.string().trim().min(1).max(200),
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    includeCancelled: z.boolean().default(false),
    limit: limitSchema.default(20),
  })
  .superRefine(fromBeforeTo);

export const calendarSearchOutputSchema = z.object({
  events: z.array(calendarEventSchema),
  count: z.number().int().min(0),
});

export const calendarUpcomingInputSchema = z.object({
  from: isoDateSchema.optional(),
  days: z.number().int().min(1).max(90).default(14),
  limit: limitSchema.default(20),
});

export const calendarUpcomingOutputSchema = z.object({
  events: z.array(calendarEventSchema),
  count: z.number().int().min(0),
});

// ── trip_history ─────────────────────────────────────────────────────

export const tripSummarySchema = z.object({
  id: z.string(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  attendeeNames: z.array(z.string()),
});

export const tripHistoryInputSchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    limit: limitSchema.default(20),
  })
  .superRefine(fromBeforeTo);

export const tripHistoryOutputSchema = z.object({
  trips: z.array(tripSummarySchema),
  count: z.number().int().min(0),
});
