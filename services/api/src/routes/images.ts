import type { Context } from 'hono';

import {
  ValidationError,
  ForbiddenError,
  UnavailableError,
  InternalError,
} from '@hominem/services';
import { isValidGoogleHost } from '@hominem/utils/google';
import { logger } from '@hominem/utils/logger';
import { createHash } from 'crypto';
import { Hono } from 'hono';

import type { AppEnv } from '../server';

import { cache } from '../lib/redis';

export const imagesRoutes = new Hono<AppEnv>();

const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24h
const LOCK_TTL_SECONDS = 15;

function getCacheKey(url: string) {
  const hash = createHash('sha256').update(url).digest('hex');
  return `image:proxy:${hash}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function setResponseHeaders(
  c: Context<AppEnv>,
  options: {
    contentType: string;
    etag?: string | null;
    cacheStatus?: 'hit' | 'miss';
  },
) {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET');
  c.header('Content-Type', options.contentType);
  c.header(
    'Cache-Control',
    'public, max-age=86400, stale-while-revalidate=86400, stale-if-error=86400',
  );
  if (options.etag) {
    c.header('ETag', options.etag);
  }
  if (options.cacheStatus) {
    c.header('X-Image-Cache', options.cacheStatus);
  }
}

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

    const cacheKey = getCacheKey(decodedUrl);
    const cacheTypeKey = `${cacheKey}:type`;
    const cacheEtagKey = `${cacheKey}:etag`;
    const lockKey = `${cacheKey}:lock`;

    const readCached = async () => {
      const cachedBody = await cache.getBuffer(cacheKey);
      if (!cachedBody) return null;
      const cachedType = (await cache.get(cacheTypeKey)) || 'image/jpeg';
      const cachedEtag = (await cache.get(cacheEtagKey)) || null;
      return { cachedBody, cachedType, cachedEtag };
    };

    const initialCached = await readCached();
    if (initialCached) {
      const ifNoneMatch = c.req.header('If-None-Match');
      if (initialCached.cachedEtag && ifNoneMatch === initialCached.cachedEtag) {
        setResponseHeaders(c, {
          contentType: initialCached.cachedType,
          etag: initialCached.cachedEtag,
          cacheStatus: 'hit',
        });
        return c.body(null, 304);
      }
      setResponseHeaders(c, {
        contentType: initialCached.cachedType,
        etag: initialCached.cachedEtag,
        cacheStatus: 'hit',
      });
      return c.body(new Uint8Array(initialCached.cachedBody));
    }

    const lockValue = crypto.randomUUID();
    const lockResult = await cache.set(lockKey, lockValue, 'EX', LOCK_TTL_SECONDS, 'NX');
    if (!lockResult) {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        await sleep(200);
        const cached = await readCached();
        if (cached) {
          const ifNoneMatch = c.req.header('If-None-Match');
          if (cached.cachedEtag && ifNoneMatch === cached.cachedEtag) {
            setResponseHeaders(c, {
              contentType: cached.cachedType,
              etag: cached.cachedEtag,
              cacheStatus: 'hit',
            });
            return c.body(null, 304);
          }
          setResponseHeaders(c, {
            contentType: cached.cachedType,
            etag: cached.cachedEtag,
            cacheStatus: 'hit',
          });
          return c.body(new Uint8Array(cached.cachedBody));
        }
      }
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
    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    const etag = `"${createHash('sha256').update(imageBuffer).digest('hex')}"`;

    if (imageBuffer.length > 5 * 1024 * 1024) {
      throw new UnavailableError('Image exceeds 5MB limit');
    }

    try {
      await Promise.all([
        cache.set(cacheKey, imageBuffer, 'EX', CACHE_TTL_SECONDS),
        cache.set(cacheTypeKey, contentType, 'EX', CACHE_TTL_SECONDS),
        cache.set(cacheEtagKey, etag, 'EX', CACHE_TTL_SECONDS),
      ]);
    } catch (cacheError) {
      logger.warn('Failed to cache proxied image', { error: cacheError });
    } finally {
      try {
        if (lockResult) {
          await cache.del(lockKey);
        }
      } catch (releaseError) {
        logger.warn('Failed to release cache lock', { error: releaseError });
      }
    }

    setResponseHeaders(c, { contentType, etag, cacheStatus: 'miss' });
    return c.body(new Uint8Array(imageBuffer));
  } catch (err) {
    logger.error('Error proxying image', {
      error: err,
      imageUrl,
      decodedUrl: imageUrl ? decodeURIComponent(imageUrl) : 'N/A',
    });
    throw new InternalError('Failed to proxy image', {
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});
