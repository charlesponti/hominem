import { env } from '~/lib/env'

/**
 * Builds a properly formatted photo URL for Google Places API photos.
 * Handles both Places API photo references and Google user content URLs.
 *
 * @param photoUrl - The photo URL or reference from Google Places API
 * @param width - Desired width in pixels (default: 600)
 * @param height - Desired height in pixels (default: 400)
 * @returns Formatted photo URL ready for use in img src
 */
export function buildPlacePhotoUrl(photoUrl: string, width = 600, height = 400): string {
  if (photoUrl.includes('places/') && photoUrl.includes('/photos/')) {
    return `https://places.googleapis.com/v1/${photoUrl}/media?key=${env.VITE_GOOGLE_API_KEY}&maxWidthPx=${width}&maxHeightPx=${height}`
  }

  if (photoUrl.includes('googleusercontent')) {
    return `${photoUrl}=w${width}-h${height}-c`
  }

  return photoUrl
}
