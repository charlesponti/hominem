import 'dotenv/config'
import { place } from '@hominem/data/db/schema/index'
import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import { db } from '../app/db'

// Google API key
const GOOGLE_API_KEY = process.env.VITE_GOOGLE_API_KEY
if (!GOOGLE_API_KEY) {
  throw new Error('VITE_GOOGLE_API_KEY environment variable is required')
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
        // Fetch place details from Google Places API
        const response = await fetch(
          `https://places.googleapis.com/v1/places/${placeRecord.googleMapsId}`,
          {
            headers: {
              'X-Goog-Api-Key': GOOGLE_API_KEY,
              'X-Goog-FieldMask': 'photos',
            } as HeadersInit,
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          console.error(
            `Failed to fetch place details for ${placeRecord.googleMapsId}: ${response.status} ${response.statusText}`
          )
          console.error(`Error response: ${errorText}`)
          _errorCount++
          continue
        }

        const placeData = await response.json()
        const photos = placeData.photos

        if (!photos || photos.length === 0) {
          continue
        }

        // Extract photo references
        const photoUrls = photos.map((photo: any) => photo.name)

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
