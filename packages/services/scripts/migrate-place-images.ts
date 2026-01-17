import { env } from '../src/env';

/**
 * Migration script to download Google Photos images for existing places
 * and store them in Supabase Storage
 */
import { db } from '../src/db';
import {
  createPlaceImagesService,
  isGooglePhotosUrl,
  processPlacePhotos,
  googlePlaces
} from '../src/places';
import { place } from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';

const GOOGLE_API_KEY = env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY is not set');
}

const placeImagesService = createPlaceImagesService({
  appBaseUrl: env.APP_BASE_URL,
  googleApiKey: GOOGLE_API_KEY,
});

interface MigrationStats {
  total: number;
  processed: number;
  updated: number;
  failed: number;
  skipped: number;
}

// downloadAndStoreImage removed in favor of downloadAndStorePlaceImage from @hominem/services/places

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
    // Find all places with a Google Maps ID (we'll check photos inside loop)
    const places = await db.query.place.findMany({
      where: sql`${place.googleMapsId} IS NOT NULL`,
    });

    stats.total = places.length;
    // biome-ignore lint/suspicious/noConsole: Migration script needs console output
    console.log(`Found ${stats.total} places with Google Maps ID`);

    for (const placeRecord of places) {
      stats.processed++;

      // Check if place already has enough Supabase photos (at least 5)
      // We don't skip if it's not an array or has fewer than 5 Supabase photos
      const currentPhotos = placeRecord.photos || [];
      const isArray = Array.isArray(currentPhotos);
      const supabasePhotosCount = isArray
        ? currentPhotos.filter((url) => !isGooglePhotosUrl(url)).length
        : 0;

      if (isArray && supabasePhotosCount >= 5) {
        stats.skipped++;
        // biome-ignore lint/suspicious/noConsole: Migration script needs console output
        console.log(
          `[${stats.processed}/${stats.total}] Skipping ${placeRecord.name} - already has ${supabasePhotosCount} Supabase photos`,
        );
        continue;
      }

      try {
        // Fetch fresh photos from Google to ensure we have the correct, up-to-date references.
        // This is critical if the DB contains stale or corrupted photo references.
        let photos = Array.isArray(placeRecord.photos) ? placeRecord.photos : [];
        try {
          // biome-ignore lint/suspicious/noConsole: Migration script needs console output
          console.log(
            `[${stats.processed}/${stats.total}] Fetching fresh photos for ${placeRecord.name}...`,
          );
          const freshPhotos = await googlePlaces.getPhotos({
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

        // Check if any photos are Google Photos URLs (refs usually are)
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

        // Process the photos using the shared service function
        const newPhotos = await processPlacePhotos(
          placeRecord.googleMapsId,
          photos,
          placeImagesService,
        );

        const newImageUrl = newPhotos.length > 0 ? newPhotos[0] : null;

        // Update the place with new photo URLs
        await db
          .update(place)
          .set({
            photos: newPhotos,
            imageUrl: newImageUrl || placeRecord.imageUrl,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(place.id, placeRecord.id));

        stats.updated++;
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
  } finally {
    process.exit(0);
  }
}

// Run the migration
migrateImages().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
