import * as z from 'zod';

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected an ISO date (YYYY-MM-DD).');

const limitSchema = z.number().int().min(1).max(50);
const fromToSchema = z
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

// ── social_engagement_summary ───────────────────────────────────────

export const socialEngagementSummaryInputSchema = fromToSchema;

const socialEngagementCountSchema = z.object({
  platform: z.string(),
  type: z.string(),
  count: z.number().int().min(0),
});

export const socialEngagementSummaryOutputSchema = z.object({
  from: isoDateSchema.nullable(),
  to: isoDateSchema.nullable(),
  breakdown: z.array(socialEngagementCountSchema),
  totalCount: z.number().int().min(0),
});

// ── social_conversation_activity ────────────────────────────────────

export const socialConversationActivityInputSchema = fromToSchema;

const socialConversationActivityItemSchema = z.object({
  conversationId: z.string(),
  platform: z.string().nullable(),
  title: z.string().nullable(),
  isGroup: z.boolean(),
  messageCount: z.number().int().min(0),
  latestMessageAt: z.string().nullable(),
});

export const socialConversationActivityOutputSchema = z.object({
  conversations: z.array(socialConversationActivityItemSchema),
  count: z.number().int().min(0),
});
