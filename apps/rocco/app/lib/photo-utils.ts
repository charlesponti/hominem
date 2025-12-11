import { env } from '~/lib/env'

/**
 * Builds a properly formatted photo URL for Google Places API photos.
 * Only processes Google Places photo references - must not be called with relative URLs or non-Google URLs.
 * Always returns an absolute URL for Google Maps place photos.
 *
 * @param photoReference - The Google Places photo reference (e.g., "places/.../photos/..." or Google user content URL)
 * @param width - Desired width in pixels (default: 600)
 * @param height - Desired height in pixels (default: 400)
 * @returns Formatted absolute URL for Google Places photo
 * @throws Error if the input is not a valid Google Places photo reference
 */
export function buildPlacePhotoUrl(photoReference: string, width = 600, height = 400): string {
  // Handle Google Places API photo references (format: "places/.../photos/...")
  if (photoReference.includes('places/') && photoReference.includes('/photos/')) {
    return `https://places.googleapis.com/v1/${photoReference}/media?key=${env.VITE_GOOGLE_API_KEY}&maxWidthPx=${width}&maxHeightPx=${height}`
  }

  // Handle Google user content URLs (these should already be absolute URLs, but we add dimensions)
  if (photoReference.includes('googleusercontent')) {
    return `${photoReference}=w${width}-h${height}-c`
  }

  // If it's not a Google Places photo reference, throw an error
  // This ensures we never return relative URLs or process non-Google URLs
  throw new Error(
    `buildPlacePhotoUrl can only process Google Places photo references. Received: ${photoReference}`
  )
}
