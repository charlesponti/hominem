import { env } from '~/lib/env'
import type { Route } from './+types/images'

/**
 * Canonical image proxy for Google Places media (preferred and fastest path).
 * Returns raw image bytes suitable for `<img src="/api/images?...">` and
 * keeps the Google API key on the Rocco server. This is the single supported
 * image endpoint; the tRPC image procedure has been deprecated.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const requestUrl = new URL(request.url)
  const resource = requestUrl.searchParams.get('resource')
  const width = requestUrl.searchParams.get('width') || '600'
  const height = requestUrl.searchParams.get('height') || '400'

  if (!resource) {
    return new Response(JSON.stringify({ error: 'resource query parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!(resource.includes('places/') && resource.includes('/photos/'))) {
    return new Response(JSON.stringify({ error: 'Invalid resource format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const searchParams = new URLSearchParams({
      maxWidthPx: width,
      maxHeightPx: height,
      key: env.VITE_GOOGLE_API_KEY,
    })
    const targetUrl = `https://places.googleapis.com/v1/${resource}/media?${searchParams.toString()}`

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          request.headers.get('User-Agent') || 'Mozilla/5.0 (compatible; ImageProxy/1.0)',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      console.error('Failed fetching from Google:', response.status, response.statusText)
      return new Response(JSON.stringify({ error: 'Failed to fetch image from Google' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = await response.arrayBuffer()

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    })
  } catch (err) {
    console.error('Error proxying Google Places photo:', err)
    return new Response(JSON.stringify({ error: 'Failed to proxy Google Places photo' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
