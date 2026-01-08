import { isValidGoogleHost } from '@hominem/data/places'
import { Hono } from 'hono'

export const imagesRoutes = new Hono()

/**
 * Proxy endpoint for external images to avoid CORB/CORS issues
 * Usage: /api/images/proxy?url=<encoded-image-url>
 */
imagesRoutes.get('/proxy', async (c) => {
  const imageUrl = c.req.query('url')

  if (!imageUrl) {
    return c.json({ error: 'URL parameter is required' }, 400)
  }

  try {
    // Decode the URL if it's encoded
    const decodedUrl = decodeURIComponent(imageUrl)

    // Only allow Google hosts for security
    if (!isValidGoogleHost(decodedUrl)) {
      return c.json({ error: 'Domain not allowed' }, 403)
    }

    // Fetch the image
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)',
      },
    })

    if (!response.ok) {
      return c.json({ error: `Failed to fetch image: ${response.statusText}` }, 502)
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const imageBuffer = await response.arrayBuffer()

    // Set CORS headers to allow cross-origin requests
    c.header('Access-Control-Allow-Origin', '*')
    c.header('Access-Control-Allow-Methods', 'GET')
    c.header('Content-Type', contentType)
    // Cache for 1 day
    c.header('Cache-Control', 'public, max-age=86400')

    return c.body(imageBuffer)
  } catch (error) {
    console.error('Error proxying image:', error)
    console.error('Image URL:', imageUrl)
    console.error('Decoded URL:', imageUrl ? decodeURIComponent(imageUrl) : 'N/A')
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    return c.json(
      {
        error: 'Failed to proxy image',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})
