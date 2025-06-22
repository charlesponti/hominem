import type { LoaderFunctionArgs } from 'react-router'
import { getFile } from '~/lib/services/file-storage.server.js'
import { requireAuth } from '~/lib/supabase/server.js'

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { fileId } = params

  if (!fileId) {
    return new Response('File ID required', { status: 400 })
  }

  try {
    // Require authentication and get user
    const { user } = await requireAuth(request)
    const userId = user.id

    const fileBuffer = await getFile(fileId, userId, request)

    if (!fileBuffer) {
      return new Response('File not found', { status: 404 })
    }

    // For now, return as binary data
    // In a production app, you'd want to determine the correct content type
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000', // 1 year cache
      },
    })
  } catch (error) {
    if (error instanceof Response) {
      return error // Return the 401 Unauthorized response from requireAuth
    }
    console.error('Error serving file:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
