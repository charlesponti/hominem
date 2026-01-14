import { isValidGoogleHost } from '@hominem/utils/google';
import { downloadImage } from '@hominem/utils/http';
import { isGooglePlacesPhotoReference } from '@hominem/utils/images';
import { placeImagesStorageService } from '@hominem/utils/supabase';
import { google } from 'googleapis';

export interface PlaceImagesService {
  downloadAndStorePlaceImage: (
    googleMapsId: string,
    photoUrl: string,
    photoIndex?: number,
  ) => Promise<string | null>;
}

/**
 * Create a place-images service instance bound to env vars (e.g., APP_BASE_URL, GOOGLE_PLACES_API_KEY)
 * Developer must call this with their env values to get a working service.
 */
export function createPlaceImagesService({
  appBaseUrl,
  googleApiKey,
}: {
  appBaseUrl?: string;
  googleApiKey: string;
}) {
  const placesClient = google.places({ version: 'v1', auth: googleApiKey });

  async function downloadAndStorePlaceImage(
    googleMapsId: string,
    photoUrl: string,
    photoIndex = 0,
  ): Promise<string | null> {
    try {
      let downloadUrl = photoUrl;
      let resourceName: string | null = null;

      if (isGooglePlacesPhotoReference(photoUrl)) {
        resourceName = photoUrl;
      } else if (photoUrl.startsWith('/api/images')) {
        try {
          // It's a local proxy URL, extract logic from query param
          const urlObj = new URL(photoUrl, 'http://placeholder'); // Use dummy base for relative URLs
          const resource = urlObj.searchParams.get('resource');
          if (resource && isGooglePlacesPhotoReference(resource)) {
            resourceName = resource;
          }
        } catch {
          // ignore
        }
      } else {
        try {
          const urlObj = new URL(photoUrl);
          if (urlObj.hostname.includes('places.googleapis.com')) {
            const rawPath = urlObj.pathname.replace(/^\/?v1\//, '').replace(/^\//, '');
            const baseRef = rawPath.replace(/\/media$/, '');
            if (isGooglePlacesPhotoReference(baseRef)) {
              resourceName = rawPath;
            }
          }
        } catch {
          // invalid url, ignore
        }
      }

      if (resourceName) {
        if (!resourceName.endsWith('/media')) {
          resourceName += '/media';
        }

        const response = await placesClient.places.photos.getMedia({
          name: resourceName,
          maxWidthPx: 1600,
          maxHeightPx: 1200,
          skipHttpRedirect: true,
        });

        if (response.data.photoUri) {
          downloadUrl = response.data.photoUri;
        } else {
          throw new Error('No photoUri in Google API response');
        }
      }

      // Download the image (either from the successful New API URI or the Legacy API URL)
      const { buffer } = await downloadImage({ url: downloadUrl }, appBaseUrl);

      // Use helper to convert + upload full + thumb
      const { fullUrl: storedFullUrl } = await savePlacePhoto(googleMapsId, buffer, photoIndex);

      // Return the full-size URL (clients will request thumbnails separately via helper)
      return storedFullUrl;
    } catch (error) {
      console.error('Failed to download and store place image:', {
        googleMapsId,
        photoUrl,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  return {
    downloadAndStorePlaceImage,
  };
}

/**
 * Save a place photo: converts buffer to full + thumbnail WebP and uploads both files.
 * Returns the uploaded URLs and filenames.
 */
export async function savePlacePhoto(
  googleMapsId: string,
  buffer: Buffer,
  photoIndex = 0,
): Promise<{
  fullUrl: string | null;
  thumbUrl: string | null;
  fullFilename: string;
  thumbFilename: string;
}> {
  try {
    const sharpLib = (await import('sharp')).default;

    const fullBuffer = await sharpLib(buffer)
      .resize({ width: 1600, height: 1200, fit: 'inside' })
      .webp({ quality: 80 })
      .toBuffer();

    const thumbBuffer = await sharpLib(buffer)
      .resize({ width: 800, height: 800, fit: 'cover' })
      .webp({ quality: 75 })
      .toBuffer();

    const baseFullFilename = generatePlaceImageFilename(googleMapsId, photoIndex, 'full');
    const baseThumbFilename = generatePlaceImageFilename(googleMapsId, photoIndex, 'thumb');

    const storedFull = await placeImagesStorageService.storeFile(
      fullBuffer,
      'image/webp',
      `places/${googleMapsId}`,
      { filename: baseFullFilename },
    );

    const fullFilename = storedFull.filename.split('/').pop() || `${baseFullFilename}.webp`;

    let thumbUrl: string | null = null;
    let thumbFilename = `${baseThumbFilename}.webp`;
    try {
      const storedThumb = await placeImagesStorageService.storeFile(
        thumbBuffer,
        'image/webp',
        `places/${googleMapsId}`,
        { filename: baseThumbFilename },
      );
      thumbUrl = storedThumb.url;
      thumbFilename = storedThumb.filename.split('/').pop() || `${baseThumbFilename}.webp`;
    } catch (err) {
      console.error('Failed to upload thumbnail for place image:', {
        googleMapsId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    return {
      fullUrl: storedFull.url,
      thumbUrl,
      fullFilename,
      thumbFilename,
    };
  } catch (error) {
    console.error('savePlacePhoto failed:', {
      googleMapsId,
      error: error instanceof Error ? error.message : String(error),
    });

    const baseFullFilename = generatePlaceImageFilename(googleMapsId, photoIndex, 'full');
    const baseThumbFilename = generatePlaceImageFilename(googleMapsId, photoIndex, 'thumb');

    return {
      fullUrl: null,
      thumbUrl: null,
      fullFilename: `${baseFullFilename}.webp`,
      thumbFilename: `${baseThumbFilename}.webp`,
    };
  }
}

/**
 * Generates a consistent filename for a place image
 */
export function generatePlaceImageFilename(
  googleMapsId: string,
  index?: number,
  size?: 'full' | 'thumb',
): string {
  // Deterministic when index and size are provided
  if (typeof index === 'number' && index >= 0 && size) {
    return `${googleMapsId}-${index}-${size}`;
  }

  // Fallback for legacy callers: keep previous unique behavior
  return `${googleMapsId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Checks if a URL or reference is a Google Photos URL that needs to be downloaded
 */
export function isGooglePhotosUrl(url: string): boolean {
  // If it's a proper URL with a Google host, accept it
  return (
    url.startsWith('/api/images') ||
    isValidGoogleHost(url) ||
    // Otherwise, use the stricter helper to recognize Google Places photo references
    isGooglePlacesPhotoReference(url)
  );
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
  };

  return mimeMap[contentType] || '.jpg';
}
