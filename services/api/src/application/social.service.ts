import { db } from '@hominem/db';
import type * as z from 'zod';

import type {
  socialConversationActivityOutputSchema,
  socialEngagementSummaryOutputSchema,
} from '../schemas/social.schema';

type SocialEngagementSummaryOutput = z.output<typeof socialEngagementSummaryOutputSchema>;
type SocialConversationActivityOutput = z.output<typeof socialConversationActivityOutputSchema>;

function endOfDay(isoDate: string): string {
  return `${isoDate}T23:59:59.999Z`;
}

export async function getSocialEngagementSummary(
  ownerUserId: string,
  input: { from?: string; to?: string; limit: number },
): Promise<SocialEngagementSummaryOutput> {
  const { from, to, limit } = input;
  let query = db
    .selectFrom('app.socialEngagements')
    .select((builder) => [
      'platform',
      'engagementType as type',
      builder.fn.countAll<number>().as('count'),
    ])
    .where('ownerUserid', '=', ownerUserId);
  if (from) query = query.where('occurredAt', '>=', from);
  if (to) query = query.where('occurredAt', '<=', endOfDay(to));
  const rows = await query
    .groupBy(['platform', 'engagementType'])
    .orderBy('count', 'desc')
    .limit(limit)
    .execute();
  const breakdown = rows.map((row) => ({
    platform: row.platform,
    type: row.type,
    count: Number(row.count),
  }));
  return {
    from: from ?? null,
    to: to ?? null,
    breakdown,
    totalCount: breakdown.reduce((sum, row) => sum + row.count, 0),
  };
}

export async function getSocialConversationActivity(
  ownerUserId: string,
  input: { from?: string; to?: string; limit: number },
): Promise<SocialConversationActivityOutput> {
  const { from, to, limit } = input;
  let query = db
    .selectFrom('app.socialThreads as st')
    .innerJoin('app.socialMessages as sm', 'sm.threadId', 'st.id')
    .select((builder) => [
      'st.id as conversationId',
      'st.platform as platform',
      'st.title as title',
      'st.isGroup as isGroup',
      builder.fn.countAll<number>().as('messageCount'),
      builder.fn.max('sm.sentAt').as('latestMessageAt'),
    ])
    .where('st.ownerUserid', '=', ownerUserId);
  if (from) query = query.where('sm.sentAt', '>=', from);
  if (to) query = query.where('sm.sentAt', '<=', endOfDay(to));
  const rows = await query
    .groupBy(['st.id', 'st.platform', 'st.title', 'st.isGroup'])
    .orderBy('messageCount', 'desc')
    .limit(limit)
    .execute();
  const conversations = rows.map((row) => ({
    conversationId: row.conversationId,
    platform: row.platform,
    title: row.title,
    isGroup: row.isGroup,
    messageCount: Number(row.messageCount),
    latestMessageAt: row.latestMessageAt ? String(row.latestMessageAt) : null,
  }));
  return { conversations, count: conversations.length };
}
