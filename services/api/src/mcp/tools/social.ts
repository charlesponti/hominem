import { db } from '@hominem/db';

import {
  socialConversationActivityInputSchema,
  socialConversationActivityOutputSchema,
  socialEngagementSummaryInputSchema,
  socialEngagementSummaryOutputSchema,
} from '../../schemas/social.schema';
import { registerTool } from '../tools';

function endOfDay(isoDate: string): string {
  return `${isoDate}T23:59:59.999Z`;
}

// ── social_engagement_summary ───────────────────────────────────────

registerTool(
  {
    name: 'social_engagement_summary',
    title: 'Social engagement summary',
    description:
      'Summarize social engagement (likes, comments, reactions) counts by platform and type over a bounded date range. Counts only — no message or comment content.',
    inputSchema: socialEngagementSummaryInputSchema,
    outputSchema: socialEngagementSummaryOutputSchema,
    readOnly: true,
    scopes: ['social:read'],
    sensitivity: 'sensitive',
    resultCap: 20,
  },
  async (ownerUserId, input) => {
    const { from, to, limit } = input as { from?: string; to?: string; limit: number };

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
    const totalCount = breakdown.reduce((sum, row) => sum + row.count, 0);

    return { from: from ?? null, to: to ?? null, breakdown, totalCount };
  },
);

// ── social_conversation_activity ────────────────────────────────────

registerTool(
  {
    name: 'social_conversation_activity',
    title: 'Social conversation activity',
    description:
      'Rank social conversations by message volume in a bounded date range, with platform, title, and latest message time. Message counts only — no message content.',
    inputSchema: socialConversationActivityInputSchema,
    outputSchema: socialConversationActivityOutputSchema,
    readOnly: true,
    scopes: ['social:read'],
    sensitivity: 'sensitive',
    resultCap: 20,
  },
  async (ownerUserId, input) => {
    const { from, to, limit } = input as { from?: string; to?: string; limit: number };

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
      platform: row.platform as string | null,
      title: row.title,
      isGroup: row.isGroup,
      messageCount: Number(row.messageCount),
      latestMessageAt: row.latestMessageAt ? String(row.latestMessageAt) : null,
    }));

    return { conversations, count: conversations.length };
  },
);
