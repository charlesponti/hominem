/**
 * Builds a properly formatted photo URL for Google Places API photos.
 * Only processes Google Places photo references - must not be called with relative URLs or non-Google URLs.
 * Always returns an absolute URL for Google Maps place photos.
 *
 * If the URL is already a Supabase Storage URL, returns it as-is.
 *
 * @param photoReference - The Google Places photo reference (e.g., "places/.../photos/..." or Google user content URL) or Supabase URL
 * @param width - Desired width in pixels (default: 600)
 * @param height - Desired height in pixels (default: 400)
 * @returns Formatted absolute URL for photo
 * @throws Error if the input is not a valid photo reference
 */
export function buildPlacePhotoUrl(photoReference: string, width = 600, height = 400) {
  // If it's already a Supabase Storage URL, return it as-is
  if (photoReference.includes('supabase.co') || photoReference.startsWith('http')) {
    // Check if it's not a Google URL
    if (
      !(
        photoReference.includes('places/') &&
        photoReference.includes('googleusercontent') &&
        photoReference.includes('googleapis.com')
      )
    ) {
      return photoReference
    }
  }

  // Handle Google Places API photo references (format: "places/.../photos/...")
  // Proxy through our API so we do not expose the API key in the client
  if (photoReference.includes('places/') && photoReference.includes('/photos/')) {
    return `/api/images?resource=${encodeURIComponent(photoReference)}&width=${width}&height=${height}`
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
