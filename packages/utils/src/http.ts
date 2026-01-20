export interface DownloadImageOptions {
  url: string;
  maxRetries?: number;
  timeout?: number;
}

export interface DownloadedImage {
  buffer: Buffer;
  contentType: string;
  size: number;
}

/**
 * Downloads an image from a URL with retry logic
 */
export async function downloadImage(
  { url, maxRetries = 3, timeout = 10000 }: DownloadImageOptions,
  referer?: string,
): Promise<DownloadedImage> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Hominem/1.0',
          // Use Referer to satisfy browser-key restrictions when fetching from Legacy API
          ...(referer ? { Referer: referer } : {}),
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return {
        buffer,
        contentType,
        size: buffer.length,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 1000));
      }
    }
  }

  throw new Error(
    `Failed to download image after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
  );
}
