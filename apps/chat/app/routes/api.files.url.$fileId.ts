import type { LoaderFunctionArgs } from 'react-router'
import { getFileUrl } from '~/lib/services/file-storage.server.js'
import { requireAuth } from '~/lib/supabase/server.js'
import { jsonResponse } from '~/lib/utils/json-response'

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { fileId } = params

  if (!fileId) {
    return jsonResponse({ error: 'File ID required' }, { status: 400 })
  }

  try {
    // Require authentication and get user
    const { user } = await requireAuth(request)
    const userId = user.id

    const fileUrl = await getFileUrl(fileId, userId, request)

    if (!fileUrl) {
      return jsonResponse({ error: 'File not found' }, { status: 404 })
    }

    return jsonResponse({
      url: fileUrl,
    })
  } catch (error) {
    if (error instanceof Response) {
      return error // Return the 401 Unauthorized response from requireAuth
    }
    console.error('Error getting file URL:', error)
    return jsonResponse(
      {
        error: 'Failed to get file URL',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
