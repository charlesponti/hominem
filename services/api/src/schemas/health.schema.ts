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

// ── health_daily_summary ────────────────────────────────────────────

export const healthDailyMetricSchema = z.object({
  date: z.string(),
  steps: z.number().int().nullable(),
  distanceM: z.number().nullable(),
  caloriesTotal: z.number().nullable(),
  elevationM: z.number().nullable(),
  source: z.string().nullable(),
});

export const healthDailySummaryInputSchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    limit: limitSchema.default(30),
  })
  .superRefine(fromBeforeTo);

export const healthDailySummaryOutputSchema = z.object({
  from: isoDateSchema.nullable(),
  to: isoDateSchema.nullable(),
  days: z.array(healthDailyMetricSchema),
  count: z.number().int().min(0),
});

// ── health_recent_workouts ──────────────────────────────────────────

export const healthWorkoutSchema = z.object({
  id: z.string(),
  activityType: z.string(),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  durationS: z.number().int().nullable(),
  calories: z.number().nullable(),
  distanceM: z.number().nullable(),
  avgHeartRate: z.number().nullable(),
  minHeartRate: z.number().nullable(),
  maxHeartRate: z.number().nullable(),
  steps: z.number().int().nullable(),
  source: z.string(),
});

export const healthRecentWorkoutsInputSchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    limit: limitSchema.default(20),
  })
  .superRefine(fromBeforeTo);

export const healthRecentWorkoutsOutputSchema = z.object({
  workouts: z.array(healthWorkoutSchema),
  count: z.number().int().min(0),
});

// ── health_sleep_summary ────────────────────────────────────────────

export const healthSleepSessionSchema = z.object({
  id: z.string(),
  startedAt: z.string(),
  endedAt: z.string(),
  totalSleepS: z.number().int().nullable(),
  deepSleepS: z.number().int().nullable(),
  lightSleepS: z.number().int().nullable(),
  remSleepS: z.number().int().nullable(),
  awakeS: z.number().int().nullable(),
  avgHeartRate: z.number().nullable(),
  minHeartRate: z.number().nullable(),
  maxHeartRate: z.number().nullable(),
  wakeUpCount: z.number().int().nullable(),
  source: z.string(),
});

export const healthSleepSummaryInputSchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    limit: limitSchema.default(20),
  })
  .superRefine(fromBeforeTo);

export const healthSleepSummaryOutputSchema = z.object({
  sessions: z.array(healthSleepSessionSchema),
  count: z.number().int().min(0),
});

// Types
export type HealthDailySummaryInput = z.output<typeof healthDailySummaryInputSchema>;
export type HealthDailySummaryOutput = z.output<typeof healthDailySummaryOutputSchema>;
export type HealthRecentWorkoutsInput = z.output<typeof healthRecentWorkoutsInputSchema>;
export type HealthRecentWorkoutsOutput = z.output<typeof healthRecentWorkoutsOutputSchema>;
export type HealthSleepSummaryInput = z.output<typeof healthSleepSummaryInputSchema>;
export type HealthSleepSummaryOutput = z.output<typeof healthSleepSummaryOutputSchema>;
