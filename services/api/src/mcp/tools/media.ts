import { db } from '@hominem/db';

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
import { registerTool } from '../tools';

function toIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value as string).toISOString();
}

function endOfDay(isoDate: string): string {
  return `${isoDate}T23:59:59.999Z`;
}

// ── media_recent_activity ──────────────────────────────────────────

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
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => {
    const { from, to, limit } = input as { from?: string; to?: string; limit: number };

    let query = db
      .selectFrom('app.mediaItemActivities as mia')
      .innerJoin('app.mediaItems as mi', 'mi.id', 'mia.mediaItemId')
      .select([
        'mi.id as itemId',
        'mi.canonicalTitle as title',
        'mi.mediaKind as mediaKind',
        'mia.activityType as activityType',
        'mia.occurredAt as occurredAt',
        'mia.provider as provider',
      ])
      .where('mia.ownerUserid', '=', ownerUserId);

    if (from) query = query.where('mia.occurredAt', '>=', from);
    if (to) query = query.where('mia.occurredAt', '<=', endOfDay(to));

    const rows = await query.orderBy('mia.occurredAt', 'desc').limit(limit).execute();

    const activities = rows.map((row) => ({
      itemId: row.itemId,
      title: row.title,
      mediaKind: row.mediaKind,
      activityType: row.activityType,
      occurredAt: toIso(row.occurredAt) ?? '',
      provider: row.provider,
    }));

    return { activities, count: activities.length };
  },
);

// ── music_recent_plays ─────────────────────────────────────────────

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
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => {
    const { from, to, limit } = input as { from?: string; to?: string; limit: number };

    let query = db
      .selectFrom('app.mediaItemActivities as mia')
      .innerJoin('app.mediaItems as mi', 'mi.id', 'mia.mediaItemId')
      .leftJoin('app.personArtists as pa', 'pa.id', 'mi.artistId')
      .select([
        'mia.occurredAt as playedAt',
        'mia.provider as platform',
        'mi.canonicalTitle as trackName',
        'pa.name as artistName',
        'mia.metadata',
      ])
      .where('mia.ownerUserid', '=', ownerUserId)
      .where('mia.activityType', '=', 'listen');

    if (from) query = query.where('mia.occurredAt', '>=', from);
    if (to) query = query.where('mia.occurredAt', '<=', endOfDay(to));

    const rows = await query.orderBy('mia.occurredAt', 'desc').limit(limit).execute();

    const plays = rows
      .filter((row) => row.trackName || row.artistName)
      .map((row) => {
        const meta = (row.metadata ?? {}) as Record<string, unknown>;
        return {
          playedAt: toIso(row.playedAt) ?? '',
          platform: row.platform,
          trackName: (row.trackName ?? meta.trackName ?? '') as string,
          artistName: (row.artistName ?? meta.artistName ?? '') as string,
          msPlayed: (meta.msPlayed as number) ?? null,
        };
      });

    return { plays, count: plays.length };
  },
);

// ── media_want_to_watch ────────────────────────────────────────────

registerTool(
  {
    name: 'media_want_to_watch',
    title: 'Media want to watch',
    description: 'Lists media items marked as want-to-watch, newest first.',
    inputSchema: mediaWantToWatchInputSchema,
    outputSchema: mediaWantToWatchOutputSchema,
    readOnly: true,
    scopes: ['media:read'],
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => {
    const { limit } = input as { limit: number };

    const rows = await db
      .selectFrom('app.mediaItemActivities as mia')
      .innerJoin('app.mediaItems as mi', 'mi.id', 'mia.mediaItemId')
      .select([
        'mi.id as itemId',
        'mi.canonicalTitle as title',
        'mi.mediaKind as mediaKind',
        'mia.occurredAt as addedAt',
      ])
      .where('mia.ownerUserid', '=', ownerUserId)
      .where('mia.activityType', '=', 'want_to_watch')
      .orderBy('mia.occurredAt', 'desc')
      .limit(limit)
      .execute();

    const items = rows.map((row) => ({
      itemId: row.itemId,
      title: row.title,
      mediaKind: row.mediaKind,
      addedAt: toIso(row.addedAt) ?? '',
    }));

    return { items, count: items.length };
  },
);

// ── music_purchase_history ─────────────────────────────────────────

registerTool(
  {
    name: 'music_purchase_history',
    title: 'Music purchase history',
    description: 'Lists music purchases (iTunes, Amazon Music, etc.), newest first.',
    inputSchema: musicPurchaseHistoryInputSchema,
    outputSchema: musicPurchaseHistoryOutputSchema,
    readOnly: true,
    scopes: ['media:read'],
    sensitivity: 'sensitive',
    resultCap: 50,
  },
  async (ownerUserId, input) => {
    const { from, to, limit } = input as { from?: string; to?: string; limit: number };

    let query = db
      .selectFrom('app.mediaItemActivities as mia')
      .leftJoin('app.mediaItems as mi', 'mi.id', 'mia.mediaItemId')
      .select([
        'mia.occurredAt as purchasedAt',
        'mia.mediaItemId as trackId',
        'mi.canonicalTitle as trackTitle',
        'mia.metadata',
      ])
      .where('mia.ownerUserid', '=', ownerUserId)
      .where('mia.activityType', '=', 'purchase');

    if (from) query = query.where('mia.occurredAt', '>=', from);
    if (to) query = query.where('mia.occurredAt', '<=', endOfDay(to));

    const rows = await query.orderBy('mia.occurredAt', 'desc').limit(limit).execute();

    const purchases = rows.map((row) => {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      return {
        title: (meta.title ?? row.trackTitle ?? '') as string,
        seller: (meta.seller ?? null) as string | null,
        purchasedAt: toIso(row.purchasedAt) ?? '',
        trackId: row.trackId ?? null,
        trackTitle: row.trackTitle ?? null,
      };
    });

    return { purchases, count: purchases.length };
  },
);

// ── media_item_history ─────────────────────────────────────────────

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
    sensitivity: 'sensitive',
    resultCap: 100,
  },
  async (ownerUserId, input) => {
    const { itemId } = input as { itemId: string };

    const item = await db
      .selectFrom('app.mediaItems')
      .select(['id', 'canonicalTitle as title', 'mediaKind as mediaKind'])
      .where('id', '=', itemId)
      .where('ownerUserid', '=', ownerUserId)
      .executeTakeFirst();

    const rows = await db
      .selectFrom('app.mediaItemActivities')
      .select([
        'activityType as activityType',
        'occurredAt as occurredAt',
        'rating',
        'season',
        'episode',
      ])
      .where('mediaItemId', '=', itemId)
      .where('ownerUserid', '=', ownerUserId)
      .orderBy('occurredAt', 'desc')
      .execute();

    const activities = rows.map((row) => ({
      activityType: row.activityType,
      occurredAt: toIso(row.occurredAt) ?? '',
      rating: row.rating != null ? Number(row.rating) : null,
      season: row.season ?? null,
      episode: row.episode ?? null,
    }));

    return {
      item: item ? { id: item.id, title: item.title, mediaKind: item.mediaKind } : null,
      activities,
      count: activities.length,
    };
  },
);
