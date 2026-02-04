import { buildPhotoMediaUrl } from '@hominem/utils/google';

import { env } from '~/lib/env';

import type { Route } from './+types/images';

/**
 * Canonical image proxy for Google Places media (preferred and fastest path).
 * Returns raw image bytes suitable for `<img src="/api/images?...">` and
 * keeps the Google API key on the Rocco server. This is the single supported
 * image endpoint; the legacy RPC image procedure has been deprecated.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const requestUrl = new URL(request.url);
  const resource = requestUrl.searchParams.get('resource');
  const width = requestUrl.searchParams.get('width') || '600';
  const height = requestUrl.searchParams.get('height') || '400';

  if (!resource) {
    return new Response(JSON.stringify({ error: 'resource query parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!(resource.includes('places/') && resource.includes('/photos/'))) {
    return new Response(JSON.stringify({ error: 'Invalid resource format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const currentTargetUrl = buildPhotoMediaUrl({
      key: env.VITE_GOOGLE_API_KEY,
      pathname: resource,
      maxWidthPx: Number(width),
      maxHeightPx: Number(height),
    });

    const headers = {
      'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0 (compatible; ImageProxy/1.0)',
      // Pass Referer to satisfy browser-key restrictions
      Referer: env.VITE_APP_BASE_URL || request.headers.get('Referer') || 'http://localhost:3000',
    };

    const response = await fetch(currentTargetUrl, {
      headers,
      redirect: 'follow',
    });

    if (!response.ok) {
      console.error('Failed fetching from Google:', response.status, response.statusText);
      return new Response(JSON.stringify({ error: 'Failed to fetch image from Google' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    });
  } catch (err) {
    console.error('Error proxying Google Places photo:', resource, err);
    return new Response(JSON.stringify({ error: 'Failed to proxy Google Places photo' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
