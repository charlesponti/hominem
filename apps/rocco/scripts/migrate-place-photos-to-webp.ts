/**
 * Migration: Convert existing place.photos to WebP (full + thumbnail) and update DB
 * - Handles Google Places references via `downloadAndStorePlaceImage` (uses GOOGLE_PLACES_API_KEY)
 * - Handles existing Supabase image URLs by downloading, converting, and uploading new WebP files
 *
 * Usage: set env vars and run with `bun`/`node` (e.g., `bun apps/rocco/scripts/migrate-place-photos-to-webp.ts`)
 */

import { db } from '@hominem/data/db'
import { downloadAndStorePlaceImage, isGooglePhotosUrl, savePlacePhoto } from '@hominem/data/places'
import { place } from '@hominem/data/schema'
import type { SingleBar } from 'cli-progress'
import cliProgress from 'cli-progress'
import { eq, sql } from 'drizzle-orm'
// CLI niceties for progress/spinners
import ora from 'ora'

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY
if (!GOOGLE_PLACES_API_KEY) {
  console.warn(
    'Warning: GOOGLE_PLACES_API_KEY not set. Google reference migration will be skipped.'
  )
}

function isSupabasePublicUrl(url: string): boolean {
  return url.includes('.supabase.co') && url.includes('/storage/v1/object/public/')
}

// Adapter for downloadAndStorePlaceImage which expects a builder for Google references
const urlBuilder = (path: string) => {
  if (!GOOGLE_PLACES_API_KEY) {
    return null
  }
  if (path.startsWith('http')) {
    return path
  }
  const cleanPath = path.split('?')[0]
  return `https://places.googleapis.com/v1/${cleanPath}/media?maxWidthPx=1600&maxHeightPx=1600&key=${GOOGLE_PLACES_API_KEY}`
}

// Helper to create and manage a spinner while running an async function.
async function runWithSpinner<T>(label: string, fn: (spin: ora.Ora) => Promise<T>): Promise<T> {
  const spin = ora(label).start()
  try {
    const res = await fn(spin)
    spin.succeed()
    return res
  } catch (err) {
    spin.fail()
    throw err
  }
}

// Migrate a single photo (Google, Supabase, or external). Returns the new URL (or original on error).
async function migrateSinglePhoto(
  googleMapsId: string,
  photo: string,
  progressBar?: SingleBar | null,
  placeName?: string
): Promise<string> {
  if (isGooglePhotosUrl(photo)) {
    if (!GOOGLE_PLACES_API_KEY) {
      console.warn('Skipping Google photo (no API key):', photo)
      progressBar?.increment(1, { place: placeName || '' })
      return photo
    }

    return await runWithSpinner('Migrating Google photo', async (spin) => {
      spin.text = 'Downloading via Google Places API'
      try {
        const newUrl = await downloadAndStorePlaceImage(googleMapsId, photo, urlBuilder)
        if (newUrl) {
          spin.succeed('Google photo migrated')
          return newUrl
        }
        spin.warn('Google migration returned null — keeping original URL')
        return photo
      } finally {
        progressBar?.increment(1, { place: placeName || '' })
      }
    })
  }

  if (isSupabasePublicUrl(photo)) {
    // Supabase-hosted images: convert and upload
    return await runWithSpinner('Migrating Supabase photo', async (spin) => {
      try {
        // dynamic import ensures test spies on the exported function are used
        const mod = await import('./migrate-place-photos-to-webp')
        const newUrl = await mod.migrateSupabasePhoto(googleMapsId, photo)
        if (newUrl) {
          spin.succeed('Supabase image migrated')
          return newUrl
        }
        spin.warn('Supabase migration returned null — keeping original URL')
        return photo
      } finally {
        progressBar?.increment(1, { place: placeName || '' })
      }
    })
  }

  // External image — leave as-is
  progressBar?.increment(1, { place: placeName || '' })
  return photo
}

export async function migrateSupabasePhoto(googleMapsId: string, photoUrl: string) {
  return await runWithSpinner('Migrating Supabase photo', async (spin) => {
    spin.text = `Downloading ${photoUrl}`

    // Download existing image
    const res = await fetch(photoUrl, { headers: { 'User-Agent': 'Hominem/1.0' } })
    if (!res.ok) {
      throw new Error(`Failed to download supabase image: HTTP ${res.status}`)
    }
    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    spin.succeed('Downloaded image')

    // Delegate conversion + upload to the shared helper
    spin.start()
    spin.text = 'Converting and uploading full + thumbnail'
    const { fullUrl, thumbUrl, fullFilename, thumbFilename } = await savePlacePhoto(
      googleMapsId,
      buffer
    )

    if (fullUrl) {
      spin.succeed(`Uploaded full image: ${fullFilename}`)
    } else {
      spin.fail('Failed to upload full image')
    }

    if (thumbUrl) {
      ora().succeed(`Uploaded thumbnail: ${thumbFilename}`)
    } else {
      ora().warn('Thumbnail not available')
    }

    return fullUrl
  })
}

export async function processPlacePhotos(
  googleMapsId: string,
  photos: string[],
  progressBar?: SingleBar | null,
  placeName?: string
) {
  const results: string[] = []

  for (const photo of photos) {
    if (!photo) {
      continue
    }

    try {
      const newUrl = await migrateSinglePhoto(googleMapsId, photo, progressBar, placeName)
      results.push(newUrl)
      // small delay
      await new Promise((r) => setTimeout(r, 250))
    } catch (err) {
      console.error('Failed to migrate photo:', err)
      results.push(photo)
    }
  }

  return {
    photos: results,
    imageUrl: results.length > 0 ? results[0] : null,
  }
}

async function migrate() {
  console.log('Starting place.photos -> WebP migration...')

  const places = await db.query.place.findMany({
    where: sql`${place.photos} IS NOT NULL AND array_length(${place.photos}, 1) > 0`,
  })

  console.log(`Found ${places.length} places with photos`)

  const totalPhotos = places.reduce((acc, p) => acc + (p.photos?.length || 0), 0)
  const photosProgress = new cliProgress.SingleBar(
    { format: 'Photos |{bar}| {value}/{total} | {place}' },
    cliProgress.Presets.shades_classic
  )
  photosProgress.start(totalPhotos, 0, { place: '' })

  try {
    for (const p of places) {
      if (!p.googleMapsId) {
        console.warn('Skipping place with no googleMapsId:', p.id)
        continue
      }

      const placeSpinner = ora(`Processing ${p.name} (${p.googleMapsId})`).start()
      try {
        const { photos: newPhotos, imageUrl } = await processPlacePhotos(
          p.googleMapsId,
          p.photos || [],
          photosProgress,
          p.name
        )

        // Update DB only if changed
        const changed = JSON.stringify(newPhotos) !== JSON.stringify(p.photos)
        if (changed) {
          await db
            .update(place)
            .set({
              photos: newPhotos,
              imageUrl: imageUrl || p.imageUrl,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(place.id, p.id))
          placeSpinner.succeed(`Updated ${p.name}`)
        } else {
          placeSpinner.succeed(`No changes for ${p.name}`)
        }

        // small throttle
        await new Promise((r) => setTimeout(r, 300))
      } catch (err) {
        placeSpinner.fail(`Error processing place ${p.name}`)
        console.error(`Error processing place ${p.name}:`, err)
      }
    }
  } finally {
    photosProgress.stop()
  }

  console.log('Migration finished')
}

if (import.meta.main) {
  migrate().catch((err) => {
    console.error('Fatal migration error:', err)
    process.exit(1)
  })
}
