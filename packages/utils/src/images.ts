/**
 * Append Google user photo sizing parameters to a Google user content URL.
 *
 * @param ref - original Google user image URL
 * @param width - desired width in pixels
 * @param height - desired height in pixels
 * @returns URL with appended sizing parameters (`=w{width}-h{height}-c`)
 */
function getGoogleUserPhoto(ref: string, width: number, height: number) {
  return `${ref}=w${width}-h${height}-c`
}

// Precompile regex for performance: avoids recompiling the pattern on each call
const PLACE_PHOTO_RE = /^places\/[^/]+\/photos\/[^/]+$/

/**
 * Returns true if the given path or absolute URL looks like a Google Places photo
 * reference of the form `places/<PLACE_ID>/photos/<PHOTO_ID>` (query params allowed).
 *
 * @param url - path or absolute URL to test
 * @returns true when it matches the places/<id>/photos/<id> pattern
 */
export function isGooglePlacesPhotoReference(url: string): boolean {
  return PLACE_PHOTO_RE.test(url)
}

/**
 * Normalize and build photo URLs for Hominem.
 *
 * - Returns Supabase or absolute URLs unchanged.
 * - Proxies Google Places photo references via `/api/images?resource=...` so clients don't need the API key.
 * - Appends size parameters for googleusercontent URLs.
 *
 * @param photoReference - image URL or Google Place photo reference
 * @param width - desired width in pixels (default: 1200)
 * @param height - desired height in pixels (default: 1200)
 * @returns normalized URL or `null` if input is empty/unsupported
 */
export function getHominemPhotoURL(
  photoReference: string,
  width = 1200,
  height = 1200
): string | null {
  let url: URL
  try {
    url = new URL(photoReference)
  } catch {
    // Not a valid URL, check if it's a Google Places photo reference
    if (isGooglePlacesPhotoReference(photoReference)) {
      const proxyUrl = new URL('/api/images', 'http://placeholder') // Use placeholder base for relative URL construction
      proxyUrl.searchParams.set('resource', photoReference)
      proxyUrl.searchParams.set('width', String(width))
      proxyUrl.searchParams.set('height', String(height))
      // Return relative path
      return `${proxyUrl.pathname}${proxyUrl.search}`
    }
    return null
  }

  // It's a valid URL
  if (url.hostname.endsWith('googleusercontent.com')) {
    return getGoogleUserPhoto(photoReference, width, height)
  }

  if (url.hostname.endsWith('supabase.co')) {
    // If width looks like a thumbnail request (<= 800), prefer the -thumb variant
    if (width <= 800) {
      url.pathname = url.pathname.replace(/(\.[a-z0-9]+)$/i, '-thumb$1')
      return url.toString()
    }
    return url.href
  }

  // Check if it's a Google Places photo reference in path
  if (isGooglePlacesPhotoReference(url.pathname)) {
    url.searchParams.set('skipHttpRedirect', 'true')
    url.searchParams.set('maxWidthPx', String(width))
    url.searchParams.set('maxHeightPx', String(height))
    return `/api/images?resource=${encodeURIComponent(url.toString())}`
  }

  // Other absolute URLs returned as-is
  return photoReference
}
