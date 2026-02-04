/**
 * Append Google user photo sizing parameters to a Google user content URL.
 *
 * @param ref - original Google user image URL
 * @param width - desired width in pixels
 * @param height - desired height in pixels
 * @returns URL with appended sizing parameters (`=w{width}-h{height}-c`)
 */
function getGoogleUserPhoto(ref: string, width: number, height: number) {
  return `${ref}=w${width}-h${height}-c`;
}

// Precompile regex for performance: avoids recompiling the pattern on each call
const PLACE_PHOTO_RE = /^places\/[^/]+\/photos\/[^/]+$/;

/**
 * Returns true if the given path or absolute URL looks like a Google Places photo
 * reference of the form `places/<PLACE_ID>/photos/<PHOTO_ID>` (query params allowed).
 *
 * @param url - path or absolute URL to test
 * @returns true when it matches the places/<id>/photos/<id> pattern
 */
export function isGooglePlacesPhotoReference(url: string): boolean {
  return PLACE_PHOTO_RE.test(url);
}

/**
 * Normalizes a photo reference string.
 * If the string is a proxied URL (starts with /api/images?resource=), it extracts the raw resource.
 * Otherwise, returns the string as-is.
 *
 * @param photo - photo reference or proxied URL
 * @returns normalized photo reference
 */
export function normalizePhotoReference(photo: string): string {
  if (photo.startsWith('/api/images?')) {
    try {
      // Use a placeholder base for relative URL parsing
      const url = new URL(photo, 'http://placeholder');
      const resource = url.searchParams.get('resource');
      if (resource) {
        return resource;
      }
    } catch {
      // ignore
    }
  }
  return photo;
}

/**
 * Sanitizes an array of photo references or URLs.
 * Filters out empty/invalid values and removes duplicates.
 *
 * @param photos - array of photo strings to sanitize
 * @returns sanitized array of unique, non-empty photo strings
 */
export function sanitizeStoredPhotos(photos: string[] | null | undefined): string[] {
  if (!Array.isArray(photos)) {
    return [];
  }

  const sanitized = photos
    .filter((photo): photo is string => typeof photo === 'string' && photo.trim().length > 0)
    .map((photo) => normalizePhotoReference(photo.trim()));

  return Array.from(new Set(sanitized));
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
  height = 1200,
): string | null {
  let url: URL;
  try {
    url = new URL(photoReference);
  } catch {
    // Not a valid URL, check if it's a Google Places photo reference
    if (isGooglePlacesPhotoReference(photoReference)) {
      const proxyUrl = new URL('/api/images', 'http://placeholder'); // Use placeholder base for relative URL construction
      proxyUrl.searchParams.set('resource', photoReference);
      proxyUrl.searchParams.set('width', String(width));
      proxyUrl.searchParams.set('height', String(height));
      // Return relative path
      const result = `${proxyUrl.pathname}${proxyUrl.search}`;
      return result;
    }
    return null;
  }

  // It's a valid URL
  if (url.hostname.endsWith('googleusercontent.com')) {
    return getGoogleUserPhoto(photoReference, width, height);
  }

  if (url.hostname.endsWith('supabase.co')) {
    // If width looks like a thumbnail request (<= 800), prefer the -thumb variant
    if (width <= 800) {
      url.pathname = url.pathname.replace(/(\.[a-z0-9]+)$/i, '-thumb$1');
      return url.toString();
    }
    return url.href;
  }

  // Check if it's a Google Places photo reference in path
  if (isGooglePlacesPhotoReference(url.pathname)) {
    url.searchParams.set('skipHttpRedirect', 'true');
    url.searchParams.set('maxWidthPx', String(width));
    url.searchParams.set('maxHeightPx', String(height));
    return `/api/images?resource=${encodeURIComponent(url.toString())}`;
  }

  // Other absolute URLs returned as-is
  return photoReference;
}
