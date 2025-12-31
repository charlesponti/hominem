import type { Route } from './+types/images'

/**
 * Proxy route for image requests to the API server
 * This avoids CORB/CORS issues by proxying Google user content images through our API
 */
export async function loader({ request }: Route.LoaderArgs) {
  // Determine API URL - use environment variable or construct from request
  const requestUrl = new URL(request.url)
  let apiUrl: string

  if (import.meta.env.VITE_API_URL) {
    apiUrl = import.meta.env.VITE_API_URL
  } else if (requestUrl.hostname.includes('localhost')) {
    // Development: use localhost with port
    apiUrl = 'http://localhost:4040'
  } else {
    // Production: assume API is on api subdomain
    apiUrl = `${requestUrl.protocol}//api.${requestUrl.hostname}`
  }

  // Extract the path and query string from the request
  const path = requestUrl.pathname.replace('/api/images', '')
  const searchParams = requestUrl.searchParams.toString()
  const queryString = searchParams ? `?${searchParams}` : ''

  // Construct the API URL
  const apiRequestUrl = `${apiUrl}/api/images${path}${queryString}`

  try {
    // Forward the request to the API server
    const response = await fetch(apiRequestUrl, {
      method: request.method,
      headers: {
        // Forward relevant headers
        'User-Agent': request.headers.get('User-Agent') || '',
        Accept: request.headers.get('Accept') || 'image/*',
      },
    })

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to proxy image: ${response.statusText}` }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer()
    const contentType = response.headers.get('Content-Type') || 'image/jpeg'

    // Return the image with appropriate headers
    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    })
  } catch (error) {
    console.error('Error proxying image:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to proxy image',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}
