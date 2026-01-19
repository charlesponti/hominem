import { listPlacesMissingPhotos, updatePlacePhotosFromGoogle } from '@hominem/places-services';
import { googlePlaces } from '@hominem/places-services';

import { env } from '../app/lib/env';

if (!env.VITE_GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY environment variable is required');
}

async function refreshPlacePhotos() {
  try {
    const placesToUpdate = await listPlacesMissingPhotos();

    let _updatedCount = 0;
    let _errorCount = 0;

    for (const placeRecord of placesToUpdate) {
      if (!placeRecord.googleMapsId) {
        continue;
      }

      try {
        const photos = await googlePlaces.getPhotos({
          placeId: placeRecord.googleMapsId,
          forceFresh: true,
        });

        if (photos.length === 0) {
          continue;
        }

        // Update the place with photo references
        await updatePlacePhotosFromGoogle(placeRecord.id, {
          forceFresh: true,
          placeImagesService: undefined, // Add service here if running in context with storage
          googleApiKey: env.VITE_GOOGLE_API_KEY,
        });
        _updatedCount++;

        // Add a small delay to avoid hitting API rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error updating place ${placeRecord.name}:`, error);
        _errorCount++;
      }
    }
  } catch (error) {
    console.error('Script failed:', error);
  }
}

// Run the script
refreshPlacePhotos().catch(console.error);
