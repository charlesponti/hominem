import { createHash } from 'node:crypto'

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
export function generatePlaceImageFilename(googleMapsId: string, photoUrl: string): string {
  // Create a hash of the photo URL to ensure uniqueness
  const hash = createHash('sha256').update(photoUrl).digest('hex').substring(0, 12)
  return `${googleMapsId}-${hash}`
}

/**
 * Checks if a URL is a Google Photos URL that needs to be downloaded
 */
export function isGooglePhotosUrl(url: string): boolean {
  return (
    (url.includes('places/') && url.includes('/photos/')) || url.includes('googleusercontent.com')
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
