import {
  getSocialConversationActivity,
  getSocialEngagementSummary,
} from '../../application/social.service';
import {
  socialConversationActivityInputSchema,
  socialConversationActivityOutputSchema,
  socialEngagementSummaryInputSchema,
  socialEngagementSummaryOutputSchema,
} from '../../schemas/social.schema';
import { registerTool } from '../tools';

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
    resultCap: 20,
  },
  getSocialEngagementSummary,
);

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
    resultCap: 20,
  },
  getSocialConversationActivity,
);
