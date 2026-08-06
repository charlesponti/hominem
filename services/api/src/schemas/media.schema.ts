import * as z from 'zod';

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date (YYYY-MM-DD).');

const limitSchema = z.number().int().min(1).max(50);
const fromToSchema = z
  .object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    limit: limitSchema.default(25),
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

// ── media_recent_activity ──────────────────────────────────────────

export const mediaRecentActivityInputSchema = fromToSchema;

export const mediaRecentActivityOutputSchema = z.object({
  activities: z.array(
    z.object({
      itemId: z.string(),
      title: z.string(),
      mediaKind: z.string(),
      activityType: z.string(),
      occurredAt: z.string(),
      provider: z.string().nullable(),
    }),
  ),
  count: z.number().int().min(0),
});

// ── music_recent_plays ─────────────────────────────────────────────

export const musicRecentPlaysInputSchema = fromToSchema;

export const musicRecentPlaysOutputSchema = z.object({
  plays: z.array(
    z.object({
      playedAt: z.string(),
      platform: z.string().nullable(),
      trackName: z.string(),
      artistName: z.string(),
      msPlayed: z.number().int().nullable(),
    }),
  ),
  count: z.number().int().min(0),
});

// ── media_want_to_watch ────────────────────────────────────────────

export const mediaWantToWatchInputSchema = z.object({
  limit: limitSchema.default(25),
});

export const mediaWantToWatchOutputSchema = z.object({
  items: z.array(
    z.object({
      itemId: z.string(),
      title: z.string(),
      mediaKind: z.string(),
      addedAt: z.string(),
    }),
  ),
  count: z.number().int().min(0),
});

// ── music_purchase_history ─────────────────────────────────────────

export const musicPurchaseHistoryInputSchema = fromToSchema;

export const musicPurchaseHistoryOutputSchema = z.object({
  purchases: z.array(
    z.object({
      title: z.string(),
      seller: z.string().nullable(),
      purchasedAt: z.string(),
      trackId: z.string().nullable(),
      trackTitle: z.string().nullable(),
    }),
  ),
  count: z.number().int().min(0),
});

// ── media_item_history ─────────────────────────────────────────────

export const mediaItemHistoryInputSchema = z.object({
  itemId: z.string(),
});

export const mediaItemHistoryOutputSchema = z.object({
  item: z
    .object({
      id: z.string(),
      title: z.string(),
      mediaKind: z.string(),
    })
    .nullable(),
  activities: z.array(
    z.object({
      activityType: z.string(),
      occurredAt: z.string(),
      rating: z.number().nullable(),
      season: z.number().int().nullable(),
      episode: z.number().int().nullable(),
    }),
  ),
  count: z.number().int().min(0),
});
