import type { ActionFunctionArgs } from 'react-router'
import { deleteFile } from '~/lib/services/file-storage.server.js'
import { removeFileFromVectorStore } from '~/lib/services/vector-file-integration.server.js'
import { requireAuth } from '~/lib/supabase/server.js'
import { jsonResponse } from '~/lib/utils/json-response'

export async function action({ params, request }: ActionFunctionArgs) {
  if (request.method !== 'DELETE') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 })
  }

  const { fileId } = params

  if (!fileId) {
    return jsonResponse({ error: 'File ID required' }, { status: 400 })
  }

  try {
    // Require authentication and get user
    const { user } = await requireAuth(request)
    const userId = user.id

    // Delete the file from storage
    const fileDeleted = await deleteFile(fileId, userId, request)

    if (!fileDeleted) {
      return jsonResponse({ error: 'File not found or could not be deleted' }, { status: 404 })
    }

    // Remove the file from vector store if it was indexed
    await removeFileFromVectorStore(fileId, userId)

    return jsonResponse({
      success: true,
      message: 'File deleted successfully',
    })
  } catch (error) {
    if (error instanceof Response) {
      return error // Return the 401 Unauthorized response from requireAuth
    }
    console.error('Error deleting file:', error)
    return jsonResponse(
      {
        error: 'Failed to delete file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
