/**
 * Migration script to download Google Photos images for existing places
 * and store them in Supabase Storage
 */
import { db } from '@hominem/data/db';
import { createPlaceImagesService, isGooglePhotosUrl } from '@hominem/data/places';
import { place } from '@hominem/data/schema';
import { eq, sql } from 'drizzle-orm';
import { getPlacePhotos } from '../app/lib/google-places.server';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!GOOGLE_PLACES_API_KEY) {
  throw new Error('GOOGLE_PLACES_API_KEY is not set');
}

const placeImagesService = createPlaceImagesService({
  appBaseUrl: process.env.APP_BASE_URL,
  googleApiKey: GOOGLE_PLACES_API_KEY,
});

interface MigrationStats {
  total: number;
  processed: number;
  updated: number;
  failed: number;
  skipped: number;
}

// downloadAndStoreImage removed in favor of downloadAndStorePlaceImage from @hominem/data/places

/**
 * Processes a single place's photos
 */
async function processPlacePhotos(
  googleMapsId: string,
  photos: string[],
): Promise<{ photos: string[]; imageUrl: string | null }> {
  // We'll collect only the successful Supabase URLs
  const successfulPhotos: string[] = [];

  // Process serially to catch errors easier (and maybe avoid rate limits)
  for (const photoUrl of photos) {
    if (isGooglePhotosUrl(photoUrl)) {
      console.log(`Migrating photo for ${googleMapsId}: ${photoUrl.substring(0, 50)}...`);
      try {
        const supabaseUrl = await placeImagesService.downloadAndStorePlaceImage(
          googleMapsId,
          photoUrl,
        );

        if (supabaseUrl) {
          successfulPhotos.push(supabaseUrl);
        } else {
          console.warn(`Failed to migrate photo for ${googleMapsId}, skipping.`);
        }
      } catch (e) {
        console.error(`Error migrating photo for ${googleMapsId}:`, e);
      }
    } else {
      // If it's already not a google photo (e.g. existing supabase url?), keep it
      successfulPhotos.push(photoUrl);
    }
  }

  return {
    photos: successfulPhotos,
    imageUrl: successfulPhotos[0] || null,
  };
}

/**
 * Main migration function
 */
async function migrateImages() {
  const stats: MigrationStats = {
    total: 0,
    processed: 0,
    updated: 0,
    failed: 0,
    skipped: 0,
  };

  try {
    // Find all places with photos that might contain Google Photos URLs
    const places = await db.query.place.findMany({
      where: sql`${place.photos} IS NOT NULL AND array_length(${place.photos}, 1) > 0`,
    });

    stats.total = places.length;
    // biome-ignore lint/suspicious/noConsole: Migration script needs console output
    console.log(`Found ${stats.total} places with photos`);

    for (const placeRecord of places) {
      stats.processed++;

      try {
        // Fetch fresh photos from Google to ensure we have the correct, up-to-date references.
        // This is critical if the DB contains stale or corrupted photo references.
        let photos = placeRecord.photos || [];
        try {
          // biome-ignore lint/suspicious/noConsole: Migration script needs console output
          console.log(
            `[${stats.processed}/${stats.total}] Fetching fresh photos for ${placeRecord.name}...`,
          );
          const freshPhotos = await getPlacePhotos({
            placeId: placeRecord.googleMapsId,
            forceFresh: true,
          });

          if (freshPhotos.length > 0) {
            photos = freshPhotos;
          } else {
            console.warn(
              `No fresh photos found for ${placeRecord.name}, attempting to use existing records...`,
            );
          }
        } catch (fetchError) {
          console.error(`Failed to fetch fresh photos for ${placeRecord.name}:`, fetchError);
          // If we can't fetch fresh ones, we skip because old ones are likely broken/corrupted
          // based on user report of "same image" everywhere.
          continue;
        }

        // Check if any photos are Google Photos URLs
        // Note: Even fresh photos from API might not be "googleusercontent" yet, they are references.
        // isGooglePhotosUrl returns true for references too.
        const hasGooglePhotos = photos.some((url) => isGooglePhotosUrl(url));

        if (!hasGooglePhotos) {
          stats.skipped++;
          // biome-ignore lint/suspicious/noConsole: Migration script needs console output
          console.log(
            `[${stats.processed}/${stats.total}] Skipping ${placeRecord.name} - no Google Photos URLs found`,
          );
          continue;
        }

        // biome-ignore lint/suspicious/noConsole: Migration script needs console output
        console.log(
          `[${stats.processed}/${stats.total}] Processing ${placeRecord.name} (${photos.length} photos)`,
        );

        // Process the photos
        const { photos: newPhotos, imageUrl } = await processPlacePhotos(
          placeRecord.googleMapsId,
          photos,
        );

        // Update the place with new photo URLs
        await db
          .update(place)
          .set({
            photos: newPhotos,
            imageUrl: imageUrl || placeRecord.imageUrl,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(place.id, placeRecord.id));

        // biome-ignore lint/suspicious/noConsole: Migration script needs console output
        console.log(`✓ Updated ${placeRecord.name}`);

        // Add a small delay to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        stats.failed++;
        console.error(`✗ Failed to process ${placeRecord.name}:`, error);
      }
    }

    // biome-ignore lint/suspicious/noConsole: Migration script needs console output
    console.log('\n=== Migration Complete ===');
    // biome-ignore lint/suspicious/noConsole: Migration script needs console output
    console.log(`Total places: ${stats.total}`);
    // biome-ignore lint/suspicious/noConsole: Migration script needs console output
    console.log(`Processed: ${stats.processed}`);
    // biome-ignore lint/suspicious/noConsole: Migration script needs console output
    console.log(`Updated: ${stats.updated}`);
    // biome-ignore lint/suspicious/noConsole: Migration script needs console output
    console.log(`Skipped: ${stats.skipped}`);
    // biome-ignore lint/suspicious/noConsole: Migration script needs console output
    console.log(`Failed: ${stats.failed}`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateImages().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
