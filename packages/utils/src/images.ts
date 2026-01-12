/**
 * Normalize and build photo URLs for Hominem.
 * - Returns Supabase or absolute URLs unchanged
 * - Proxies Google Places photo references via `/api/images?resource=...` so clients don't need the API key
 * - Appends size parameters for googleusercontent URLs
 */
export function getHominemPhotoURL(
  photoReference: string,
  width = 1200,
  height = 1200
): string | null {
  if (!photoReference) {
    return null
  }

  // Google user content URLs (e.g., user-uploaded Google images) should get size params
  if (photoReference.includes('googleusercontent')) {
    return `${photoReference}=w${width}-h${height}-c`
  }

  // Already a Supabase URL - return thumbnail variant for small sizes
  if (photoReference.includes('supabase.co')) {
    // If width looks like a thumbnail request (<= 800), prefer the -thumb variant
    if (width <= 800) {
      // Insert "-thumb" before the file extension (preserve query string if present)
      const parts = photoReference.split('?')
      const base = parts[0]
      const qs = parts[1] ? `?${parts[1]}` : ''
      const thumb = base?.replace(/(\.[a-z0-9]+)$/i, '-thumb$1')
      return `${thumb}${qs}`
    }
    return photoReference
  }

  // Google Places API photo reference -> proxy through our API
  if (photoReference.includes('places/') && photoReference.includes('/photos/')) {
    return `/api/images?resource=${encodeURIComponent(photoReference)}&width=${width}&height=${height}`
  }

  // Absolute URLs other than googleusercontent and supabase should be returned as-is
  if (photoReference.startsWith('http')) {
    return photoReference
  }

  return null
}

export const GOOGLE_PLACES_BASE_URL = 'https://places.googleapis.com/v1'

export const buildPhotoMediaUrl = ({
  key,
  photoName,
  maxWidthPx = 600,
  maxHeightPx = 400,
}: {
  key: string
  photoName: string
  maxWidthPx?: number
  maxHeightPx?: number
}) => {
  const url = new URL(`${GOOGLE_PLACES_BASE_URL}/${photoName}/media`)
  url.searchParams.set('maxWidthPx', String(maxWidthPx))
  url.searchParams.set('maxHeightPx', String(maxHeightPx))
  url.searchParams.set('key', key)
  return url.toString()
}

/**
 * Factory to create a simple URL builder for Google place photos.
 * Returns a function `(path: string) => string | null` which:
 * - returns `null` if `apiKey` is not provided
 * - returns absolute URLs unchanged
 * - strips query params from photo references before building
 * - warns if the path doesn't look like a places photos reference
 */
export function createPlacePhotoUrlBuilder(
  apiKey?: string,
  opts?: { maxWidthPx?: number; maxHeightPx?: number }
): (path: string) => string | null {
  return (path: string) => {
    if (!apiKey) {
      return null
    }
    if (!path) {
      return null
    }
    if (path.startsWith('http')) {
      return path
    }

    const cleanPath = path.split('?')[0]
    if (!cleanPath) {
      return null
    }

    if (!(cleanPath.includes('places/') && cleanPath.includes('/photos/'))) {
      console.warn(`Suspicious photo path format: ${cleanPath}`)
    }

    return buildPhotoMediaUrl({
      key: apiKey,
      photoName: cleanPath,
      maxWidthPx: opts?.maxWidthPx ?? 1600,
      maxHeightPx: opts?.maxHeightPx ?? 1600,
    })
  }
}
