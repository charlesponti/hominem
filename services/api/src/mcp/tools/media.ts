import {
  getMediaItemHistory,
  listMediaRecentActivity,
  listMediaWantToWatch,
  listMusicPurchaseHistory,
  listMusicRecentPlays,
} from '../../application/media.service';
import {
  mediaItemHistoryInputSchema,
  mediaItemHistoryOutputSchema,
  mediaRecentActivityInputSchema,
  mediaRecentActivityOutputSchema,
  mediaWantToWatchInputSchema,
  mediaWantToWatchOutputSchema,
  musicPurchaseHistoryInputSchema,
  musicPurchaseHistoryOutputSchema,
  musicRecentPlaysInputSchema,
  musicRecentPlaysOutputSchema,
} from '../../schemas/media.schema';
import { registerTool } from '../tool-registry';

registerTool(
  {
    name: 'media_recent_activity',
    title: 'Media recent activity',
    description:
      'Lists recent media activity (watches, listens, reads, purchases) across all media types, newest first.',
    inputSchema: mediaRecentActivityInputSchema,
    outputSchema: mediaRecentActivityOutputSchema,
    readOnly: true,
    scopes: ['media:read'],
    resultCap: 50,
  },
  listMediaRecentActivity,
);

registerTool(
  {
    name: 'music_recent_plays',
    title: 'Music recent plays',
    description:
      'Lists recent music plays (listen activity), newest first, with track and artist names.',
    inputSchema: musicRecentPlaysInputSchema,
    outputSchema: musicRecentPlaysOutputSchema,
    readOnly: true,
    scopes: ['media:read'],
    resultCap: 50,
  },
  listMusicRecentPlays,
);

registerTool(
  {
    name: 'media_want_to_watch',
    title: 'Media want to watch',
    description: 'Lists media items marked as want-to-watch, newest first.',
    inputSchema: mediaWantToWatchInputSchema,
    outputSchema: mediaWantToWatchOutputSchema,
    readOnly: true,
    scopes: ['media:read'],
    resultCap: 50,
  },
  listMediaWantToWatch,
);

registerTool(
  {
    name: 'music_purchase_history',
    title: 'Music purchase history',
    description: 'Lists music purchases (iTunes, Amazon Music, etc.), newest first.',
    inputSchema: musicPurchaseHistoryInputSchema,
    outputSchema: musicPurchaseHistoryOutputSchema,
    readOnly: true,
    scopes: ['media:read'],
    resultCap: 50,
  },
  listMusicPurchaseHistory,
);

registerTool(
  {
    name: 'media_item_history',
    title: 'Media item history',
    description:
      "Returns a media item's details and its full activity history (watches, listens, reads, etc.).",
    inputSchema: mediaItemHistoryInputSchema,
    outputSchema: mediaItemHistoryOutputSchema,
    readOnly: true,
    scopes: ['media:read'],
    resultCap: 100,
  },
  async (ownerUserId, input) => getMediaItemHistory(ownerUserId, input.itemId),
);
