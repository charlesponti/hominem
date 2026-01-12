import { isValidGoogleHost } from '@hominem/utils/google'
import { downloadImage } from '@hominem/utils/http'
import { createPlacePhotoUrlBuilder } from '@hominem/utils/images'
import { placeImagesStorageService } from '@hominem/utils/supabase'

export interface PlaceImagesService {
  downloadAndStorePlaceImage: (
    googleMapsId: string,
    photoUrl: string,
    photoIndex?: number
  ) => Promise<string | null>
}

/**
 * Create a place-images service instance bound to env vars (e.g., APP_BASE_URL, GOOGLE_PLACES_API_KEY)
 * Developer must call this with their env values to get a working service.
 */
export function createPlaceImagesService({
  appBaseUrl,
  googleApiKey,
}: {
  appBaseUrl?: string
  googleApiKey?: string
}) {
  const buildPhotoUrl = createPlacePhotoUrlBuilder(googleApiKey)
  async function downloadAndStorePlaceImage(
    googleMapsId: string,
    photoUrl: string,
    photoIndex = 0
  ): Promise<string | null> {
    try {
      // Build the full media URL with API key
      let fullUrl = buildPhotoUrl(photoUrl) ?? photoUrl
      const urlObj = new URL(fullUrl)

      // Initial attempt: Use Google Places API (New) with explicit JSON response
      // This avoids generic HTTP client redirect issues and provides better error handling.
      if (fullUrl.includes('places.googleapis.com') && fullUrl.includes('/media')) {
        urlObj.searchParams.set('skipHttpRedirect', 'true')

        const response = await fetch(urlObj.toString())

        if (response.ok) {
          const data = (await response.json()) as { photoUri?: string }
          if (data.photoUri) {
            fullUrl = data.photoUri
          } else {
            throw new Error('No photoUri in Google API response')
          }
        } else {
          // Other errors (400, 403, 404, 500)
          const errorText = await response.text()
          throw new Error(`Google API Error (${response.status}): ${errorText.substring(0, 200)}`)
        }
      }

      // Download the image (either from the successful New API URI or the Legacy API URL)
      const { buffer } = await downloadImage({ url: fullUrl }, appBaseUrl)

      // Use helper to convert + upload full + thumb
      const { fullUrl: storedFullUrl } = await savePlacePhoto(googleMapsId, buffer, photoIndex)

      // Return the full-size URL (clients will request thumbnails separately via helper)
      return storedFullUrl
    } catch (error) {
      console.error('Failed to download and store place image:', {
        googleMapsId,
        photoUrl,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  return {
    downloadAndStorePlaceImage,
  }
}

/**
 * Save a place photo: converts buffer to full + thumbnail WebP and uploads both files.
 * Returns the uploaded URLs and filenames.
 */
export async function savePlacePhoto(
  googleMapsId: string,
  buffer: Buffer,
  photoIndex = 0
): Promise<{
  fullUrl: string | null
  thumbUrl: string | null
  fullFilename: string
  thumbFilename: string
}> {
  try {
    const sharpLib = (await import('sharp')).default

    const fullBuffer = await sharpLib(buffer)
      .resize({ width: 1600, height: 1200, fit: 'inside' })
      .webp({ quality: 80 })
      .toBuffer()

    const thumbBuffer = await sharpLib(buffer)
      .resize({ width: 800, height: 800, fit: 'cover' })
      .webp({ quality: 75 })
      .toBuffer()

    const baseFullFilename = generatePlaceImageFilename(googleMapsId, photoIndex, 'full')
    const baseThumbFilename = generatePlaceImageFilename(googleMapsId, photoIndex, 'thumb')

    const storedFull = await placeImagesStorageService.storeFile(
      fullBuffer,
      'image/webp',
      `places/${googleMapsId}`,
      { filename: baseFullFilename }
    )

    const fullFilename = storedFull.filename.split('/').pop() || `${baseFullFilename}.webp`

    let thumbUrl: string | null = null
    let thumbFilename = `${baseThumbFilename}.webp`
    try {
      const storedThumb = await placeImagesStorageService.storeFile(
        thumbBuffer,
        'image/webp',
        `places/${googleMapsId}`,
        { filename: baseThumbFilename }
      )
      thumbUrl = storedThumb.url
      thumbFilename = storedThumb.filename.split('/').pop() || `${baseThumbFilename}.webp`
    } catch (err) {
      console.error('Failed to upload thumbnail for place image:', {
        googleMapsId,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    return {
      fullUrl: storedFull.url,
      thumbUrl,
      fullFilename,
      thumbFilename,
    }
  } catch (error) {
    console.error('savePlacePhoto failed:', {
      googleMapsId,
      error: error instanceof Error ? error.message : String(error),
    })

    const baseFullFilename = generatePlaceImageFilename(googleMapsId, photoIndex, 'full')
    const baseThumbFilename = generatePlaceImageFilename(googleMapsId, photoIndex, 'thumb')

    return {
      fullUrl: null,
      thumbUrl: null,
      fullFilename: `${baseFullFilename}.webp`,
      thumbFilename: `${baseThumbFilename}.webp`,
    }
  }
}

/**
 * Generates a consistent filename for a place image
 */
export function generatePlaceImageFilename(
  googleMapsId: string,
  index?: number,
  size?: 'full' | 'thumb'
): string {
  // Deterministic when index and size are provided
  if (typeof index === 'number' && index >= 0 && size) {
    return `${googleMapsId}-${index}-${size}`
  }

  // Fallback for legacy callers: keep previous unique behavior
  return `${googleMapsId}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Checks if a URL or reference is a Google Photos URL that needs to be downloaded
 */
export function isGooglePhotosUrl(url: string): boolean {
  // If it's a proper URL with a Google host, accept it
  return (
    isValidGoogleHost(url) ||
    // Otherwise, it may be a Google Places photo reference path (e.g., "places/.../photos/...")
    (url.includes('places/') && url.includes('/photos/'))
  )
}

/**
 * Extracts the file extension from a content type
 */
export function getExtensionFromContentType(contentType: string): string {
  const mimeMap: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
  }

  return mimeMap[contentType] || '.jpg'
}
