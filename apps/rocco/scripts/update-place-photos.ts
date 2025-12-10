import { listPlacesMissingPhotos, updatePlacePhotos as setPlacePhotos } from '@hominem/data'
import { env } from '../app/lib/env'
import { getPlacePhotos } from '../app/lib/google-places.server'

if (!env.VITE_GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY environment variable is required')
}

async function refreshPlacePhotos() {
  try {
    const placesToUpdate = await listPlacesMissingPhotos()

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
        await setPlacePhotos(placeRecord.id, photoUrls)
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
refreshPlacePhotos().catch(console.error)
