import { db, sql, type Json } from '@hominem/db';
import { env } from '@hominem/services/env';
import { logger } from '@hominem/utils/logger';

import { createPlaceImagesService, isGooglePhotosUrl } from './place-images.service';
import { updatePlacePhotosFromGoogle } from './places.service';

interface BackfillOptions {
  concurrency: number;
  limit?: number;
  placeId?: string;
}

interface PlacePhotoBackfillRow {
  id: string;
  data: Json | null;
}

interface PlacePhotoBackfillMeta {
  googleMapsId: string | null;
  imageUrl: string | null;
  photos: string[];
}

interface BackfillStats {
  scanned: number;
  candidates: number;
  updated: number;
  unchanged: number;
  failed: number;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseArgs(argv: string[]): BackfillOptions {
  let concurrency = 4;
  let limit: number | undefined;
  let placeId: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--concurrency') {
      concurrency = parsePositiveInt(next, concurrency);
      index += 1;
    } else if (arg === '--limit') {
      limit = parsePositiveInt(next, 100);
      index += 1;
    } else if (arg === '--place-id' && next) {
      placeId = next;
      index += 1;
    }
  }

  return {
    concurrency,
    ...(limit !== undefined ? { limit } : {}),
    ...(placeId !== undefined ? { placeId } : {}),
  };
}

function toBackfillMeta(data: Json | null): PlacePhotoBackfillMeta {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      googleMapsId: null,
      imageUrl: null,
      photos: [],
    };
  }

  const payload = data as Record<string, Json>;
  const photosValue = payload.photos;
  const photos =
    Array.isArray(photosValue) && photosValue.every((photo) => typeof photo === 'string')
      ? photosValue
      : [];

  return {
    googleMapsId: typeof payload.googleMapsId === 'string' ? payload.googleMapsId : null,
    imageUrl: typeof payload.imageUrl === 'string' ? payload.imageUrl : null,
    photos,
  };
}

function needsPhotoBackfill(row: PlacePhotoBackfillRow): boolean {
  const meta = toBackfillMeta(row.data);
  if (!meta.googleMapsId) {
    return false;
  }

  if (meta.imageUrl && isGooglePhotosUrl(meta.imageUrl)) {
    return true;
  }

  return meta.photos.some((photo) => isGooglePhotosUrl(photo));
}

async function getCandidatePlaceIds(limit?: number, placeId?: string): Promise<string[]> {
  if (placeId) {
    const row = await db
      .selectFrom('places')
      .select(['id', 'data'])
      .where('id', '=', placeId)
      .executeTakeFirst();

    if (!row) {
      return [];
    }

    return needsPhotoBackfill(row) ? [row.id] : [];
  }

  let query = db
    .selectFrom('places')
    .select(['id', 'data'])
    .where(sql<boolean>`data->>'googleMapsId' IS NOT NULL`)
    .orderBy('created_at', 'asc')
    .orderBy('id', 'asc');

  if (limit !== undefined) {
    query = query.limit(limit);
  }

  const rows = await query.execute();
  return rows.filter(needsPhotoBackfill).map((row) => row.id);
}

async function runWithConcurrency<T>(
  values: T[],
  concurrency: number,
  worker: (value: T) => Promise<void>,
): Promise<void> {
  const queue = [...values];

  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (next === undefined) {
          return;
        }

        await worker(next);
      }
    }),
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const placeImagesService = createPlaceImagesService({
    appBaseUrl: env.VITE_APP_BASE_URL,
  });

  const stats: BackfillStats = {
    scanned: 0,
    candidates: 0,
    updated: 0,
    unchanged: 0,
    failed: 0,
  };

  const candidatePlaceIds = await getCandidatePlaceIds(options.limit, options.placeId);
  stats.candidates = candidatePlaceIds.length;
  stats.scanned = options.placeId
    ? candidatePlaceIds.length
    : (options.limit ?? candidatePlaceIds.length);

  logger.info('Starting place image backfill', {
    candidates: candidatePlaceIds.length,
    concurrency: options.concurrency,
    limit: options.limit,
    placeId: options.placeId,
  });

  await runWithConcurrency(candidatePlaceIds, options.concurrency, async (candidatePlaceId) => {
    try {
      const updated = await updatePlacePhotosFromGoogle(candidatePlaceId, {
        forceFresh: true,
        googleApiKey: env.GOOGLE_API_KEY,
        placeImagesService,
      });

      if (updated) {
        stats.updated += 1;
      } else {
        stats.unchanged += 1;
      }
    } catch (error) {
      stats.failed += 1;
      logger.error('Place image backfill failed', {
        error: error instanceof Error ? error.message : String(error),
        placeId: candidatePlaceId,
      });
    }
  });

  logger.info('Completed place image backfill', stats);
}

await main();
