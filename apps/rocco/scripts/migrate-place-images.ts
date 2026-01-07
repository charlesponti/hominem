/**
 * Migration script to download Google Photos images for existing places
 * and store them in Supabase Storage
 */
import { db, place } from '@hominem/data/db'
import {
  downloadImage,
  generatePlaceImageFilename,
  getExtensionFromContentType,
  isGooglePhotosUrl,
} from '@hominem/data/services/place-images.service'
import { placeImagesStorageService } from '@hominem/utils/supabase'
import { sql } from 'drizzle-orm'
import { buildPhotoMediaUrl } from '../app/lib/google-places.server'

interface MigrationStats {
  total: number
  processed: number
  updated: number
  failed: number
  skipped: number
}

/**
 * Downloads and stores a Google Photos image
 */
async function downloadAndStoreImage(
  googleMapsId: string,
  photoUrl: string
): Promise<string | null> {
  try {
    // Build the full media URL with API key
    const fullUrl = buildPhotoMediaUrl({ photoName: photoUrl })

    // Download the image
    const { buffer, contentType } = await downloadImage({ url: fullUrl })

    // Generate a consistent filename
    const baseFilename = generatePlaceImageFilename(googleMapsId, photoUrl)
    const extension = getExtensionFromContentType(contentType)
    const filename = `${baseFilename}${extension}`

    // Store in Supabase Storage under places/{googleMapsId}/
    const storedFile = await placeImagesStorageService.storeFile(
      buffer,
      filename,
      contentType,
      `places/${googleMapsId}`
    )

    return storedFile.url
  } catch (error) {
    console.error('Failed to download and store place image:', {
      googleMapsId,
      photoUrl,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Processes a single place's photos
 */
async function processPlacePhotos(
  googleMapsId: string,
  photos: string[]
): Promise<{ photos: string[]; imageUrl: string | null }> {
  const processedPhotos = await Promise.all(
    photos.map(async (photoUrl) => {
      if (isGooglePhotosUrl(photoUrl)) {
        const supabaseUrl = await downloadAndStoreImage(googleMapsId, photoUrl)
        return supabaseUrl || photoUrl
      }
      return photoUrl
    })
  )

  return {
    photos: processedPhotos,
    imageUrl: processedPhotos[0] || null,
  }
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
  }

  try {
    // Find all places with photos that might contain Google Photos URLs
    const places = await db.query.place.findMany({
      where: sql`${place.photos} IS NOT NULL AND array_length(${place.photos}, 1) > 0`,
    })

    stats.total = places.length
    // biome-ignore lint/suspicious/noConsole: Migration script needs console output
    console.log(`Found ${stats.total} places with photos`)

    for (const placeRecord of places) {
      stats.processed++

      try {
        const photos = placeRecord.photos || []

        // Check if any photos are Google Photos URLs
        const hasGooglePhotos = photos.some((url) => isGooglePhotosUrl(url))

        if (!hasGooglePhotos) {
          stats.skipped++
          // biome-ignore lint/suspicious/noConsole: Migration script needs console output
          console.log(
            `[${stats.processed}/${stats.total}] Skipping ${placeRecord.name} - no Google Photos URLs`
          )
          continue
        }

        // biome-ignore lint/suspicious/noConsole: Migration script needs console output
        console.log(
          `[${stats.processed}/${stats.total}] Processing ${placeRecord.name} (${photos.length} photos)`
        )

        // Process the photos
        const { photos: newPhotos, imageUrl } = await processPlacePhotos(
          placeRecord.googleMapsId,
          photos
        )

        // Update the place with new photo URLs
        await db.update(place).set({
          photos: newPhotos,
          imageUrl: imageUrl || placeRecord.imageUrl,
          updatedAt: new Date().toISOString(),
        })
        // biome-ignore lint/suspicious/noConsole: Migration script needs console output
        console.log(`✓ Updated ${placeRecord.name}`)

        // Add a small delay to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        stats.failed++
        console.error(`✗ Failed to process ${placeRecord.name}:`, error)
      }
    }

    // biome-ignore lint/suspicious/noConsole: Migration script needs console output
    console.log('\n=== Migration Complete ===')
    // biome-ignore lint/suspicious/noConsole: Migration script needs console output
    console.log(`Total places: ${stats.total}`)
    // biome-ignore lint/suspicious/noConsole: Migration script needs console output
    console.log(`Processed: ${stats.processed}`)
    // biome-ignore lint/suspicious/noConsole: Migration script needs console output
    console.log(`Updated: ${stats.updated}`)
    // biome-ignore lint/suspicious/noConsole: Migration script needs console output
    console.log(`Skipped: ${stats.skipped}`)
    // biome-ignore lint/suspicious/noConsole: Migration script needs console output
    console.log(`Failed: ${stats.failed}`)
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
migrateImages().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
