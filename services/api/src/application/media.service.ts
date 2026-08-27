import { db } from '@hominem/db';
import type * as z from 'zod';

import type {
  mediaItemHistoryOutputSchema,
  mediaRecentActivityOutputSchema,
  mediaWantToWatchOutputSchema,
  musicPurchaseHistoryOutputSchema,
  musicRecentPlaysOutputSchema,
} from '../schemas/media.schema';

type MediaRecentActivityOutput = z.output<typeof mediaRecentActivityOutputSchema>;
type MusicRecentPlaysOutput = z.output<typeof musicRecentPlaysOutputSchema>;
type MediaWantToWatchOutput = z.output<typeof mediaWantToWatchOutputSchema>;
type MusicPurchaseHistoryOutput = z.output<typeof musicPurchaseHistoryOutputSchema>;
type MediaItemHistoryOutput = z.output<typeof mediaItemHistoryOutputSchema>;

function toIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(value as string).toISOString();
}

function endOfDay(isoDate: string): string {
  return `${isoDate}T23:59:59.999Z`;
}

export async function listMediaRecentActivity(
  ownerUserId: string,
  input: { from?: string; to?: string; limit: number },
): Promise<MediaRecentActivityOutput> {
  const { from, to, limit } = input;
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
}

export async function listMusicRecentPlays(
  ownerUserId: string,
  input: { from?: string; to?: string; limit: number },
): Promise<MusicRecentPlaysOutput> {
  const { from, to, limit } = input;
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
}

export async function listMediaWantToWatch(
  ownerUserId: string,
  input: { limit: number },
): Promise<MediaWantToWatchOutput> {
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
    .limit(input.limit)
    .execute();
  const items = rows.map((row) => ({
    itemId: row.itemId,
    title: row.title,
    mediaKind: row.mediaKind,
    addedAt: toIso(row.addedAt) ?? '',
  }));
  return { items, count: items.length };
}

export async function listMusicPurchaseHistory(
  ownerUserId: string,
  input: { from?: string; to?: string; limit: number },
): Promise<MusicPurchaseHistoryOutput> {
  const { from, to, limit } = input;
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
}

export async function getMediaItemHistory(
  ownerUserId: string,
  itemId: string,
): Promise<MediaItemHistoryOutput> {
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
}
