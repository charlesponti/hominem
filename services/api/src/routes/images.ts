import {
  ValidationError,
  ForbiddenError,
  UnavailableError,
  InternalError,
} from '@hominem/services';
import { isValidGoogleHost } from '@hominem/utils/google';
import { Hono } from 'hono';

import type { AppEnv } from '../server';

export const imagesRoutes = new Hono<AppEnv>();

/**
 * Proxy endpoint for external images to avoid CORB/CORS issues
 * Usage: /api/images/proxy?url=<encoded-image-url>
 *
 * Note: This endpoint returns binary image data on success, not ApiResult.
 * Errors use ApiResult format for consistency.
 */
imagesRoutes.get('/proxy', async (c) => {
  const imageUrl = c.req.query('url');

  if (!imageUrl) {
    throw new ValidationError('URL parameter is required');
  }

  try {
    // Decode the URL if it's encoded
    const decodedUrl = decodeURIComponent(imageUrl);

    // Only allow Google hosts for security
    if (!isValidGoogleHost(decodedUrl)) {
      throw new ForbiddenError('Domain not allowed');
    }

    // Fetch the image
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)',
      },
    });

    if (!response.ok) {
      throw new UnavailableError(`Failed to fetch image: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await response.arrayBuffer();

    // Set CORS headers to allow cross-origin requests
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET');
    c.header('Content-Type', contentType);
    // Cache for 1 day
    c.header('Cache-Control', 'public, max-age=86400');

    return c.body(imageBuffer);
  } catch (err) {
    console.error('Error proxying image:', err);
    console.error('Image URL:', imageUrl);
    console.error('Decoded URL:', imageUrl ? decodeURIComponent(imageUrl) : 'N/A');
    console.error('Error stack:', err instanceof Error ? err.stack : 'No stack');
    throw new InternalError('Failed to proxy image', {
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});
