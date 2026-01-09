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
  if (!photoReference) { return null }

  // Google user content URLs (e.g., user-uploaded Google images) should get size params
  if (photoReference.includes('googleusercontent')) {
    return `${photoReference}=w${width}-h${height}-c`
  }

  // Already a Supabase URL - return as-is
  if (photoReference.includes('supabase.co')) {
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
