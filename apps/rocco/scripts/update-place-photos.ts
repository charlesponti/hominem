import 'dotenv/config'
import { place } from '@hominem/data/db/schema/index'
import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import { getPlacePhotos } from '../app/lib/google-places.server'
import { db } from '../app/db'

if (!process.env.GOOGLE_API_KEY && !process.env.VITE_GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY environment variable is required')
}

async function updatePlacePhotos() {
  try {
    // Get all places that have a googleMapsId but no photos
    const placesToUpdate = await db.query.place.findMany({
      where: and(isNotNull(place.googleMapsId), isNull(place.photos)),
    })

    let _updatedCount = 0
    let _errorCount = 0

    for (const placeRecord of placesToUpdate) {
      if (!placeRecord.googleMapsId) {
        continue
      }

      try {
        const photoUrls = await getPlacePhotos({
          placeId: placeRecord.googleMapsId,
          forceFresh: true,
        })

        if (photoUrls.length === 0) {
          continue
        }

        // Update the place with photo references
        await db
          .update(place)
          .set({
            photos: photoUrls,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(place.id, placeRecord.id))
        _updatedCount++

        // Add a small delay to avoid hitting API rate limits
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Error updating place ${placeRecord.name}:`, error)
        _errorCount++
      }
    }
  } catch (error) {
    console.error('Script failed:', error)
  }
}

// Run the script
updatePlacePhotos().catch(console.error)
