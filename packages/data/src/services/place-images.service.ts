import { isValidGoogleHost } from '@hominem/utils/google'
import { placeImagesStorageService } from '@hominem/utils/supabase'
import { env } from '../env.server'

/**
 * Service for downloading and managing place images
 */

export interface DownloadImageOptions {
  url: string
  maxRetries?: number
  timeout?: number
}

export interface DownloadedImage {
  buffer: Buffer
  contentType: string
  size: number
}

/**
 * Downloads a Google Photos image and uploads it to Supabase Storage
 * @param googleMapsId - The Google Maps ID for the place
 * @param photoUrl - The Google Photos URL to download
 * @param buildPhotoMediaUrl - Function to build the full media URL with API key
 * @returns The Supabase Storage URL or null if download fails
 */
export async function downloadAndStorePlaceImage(
  googleMapsId: string,
  photoUrl: string,
  buildPhotoMediaUrl?: (url: string) => string,
  photoIndex = 0
): Promise<string | null> {
  try {
    // Build the full media URL with API key
    let fullUrl = buildPhotoMediaUrl?.(photoUrl) ?? photoUrl
    const urlObj = new URL(fullUrl)

    // Initial attempt: Use Google Places API (New) with explicit JSON response
    // This avoids generic HTTP client redirect issues and provides better error handling.
    if (fullUrl.includes('places.googleapis.com') && fullUrl.includes('/media')) {
      urlObj.searchParams.set('skipHttpRedirect', 'true')

      const response = await fetch(urlObj.toString())

      if (response.ok) {
        // Happy path: New API worked
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
    const { buffer } = await downloadImage({ url: fullUrl })

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

    const fullFilename = `${generatePlaceImageFilename(googleMapsId, photoIndex, 'full')}.webp`
    const thumbFilename = `${generatePlaceImageFilename(googleMapsId, photoIndex, 'thumb')}.webp`

    const storedFull = await placeImagesStorageService.storeFile(
      fullBuffer,
      fullFilename,
      'image/webp',
      `places/${googleMapsId}`,
      { filename: fullFilename }
    )

    let thumbUrl: string | null = null
    try {
      const storedThumb = await placeImagesStorageService.storeFile(
        thumbBuffer,
        thumbFilename,
        'image/webp',
        `places/${googleMapsId}`,
        { filename: thumbFilename }
      )
      thumbUrl = storedThumb.url
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

    const fullFilename = `${generatePlaceImageFilename(googleMapsId, photoIndex, 'full')}.webp`
    const thumbFilename = `${generatePlaceImageFilename(googleMapsId, photoIndex, 'thumb')}.webp`

    return { fullUrl: null, thumbUrl: null, fullFilename, thumbFilename }
  }
}

/**
 * Downloads an image from a URL with retry logic
 */
export async function downloadImage({
  url,
  maxRetries = 3,
  timeout = 10000,
}: DownloadImageOptions): Promise<DownloadedImage> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Hominem/1.0',
          // Use Referer to satisfy browser-key restrictions when fetching from Legacy API
          Referer: env.APP_BASE_URL,
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg'
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      return {
        buffer,
        contentType,
        size: buffer.length,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries - 1) {
        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000))
      }
    }
  }

  throw new Error(
    `Failed to download image after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
  )
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
