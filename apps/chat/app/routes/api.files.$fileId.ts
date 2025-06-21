import type { LoaderFunctionArgs } from 'react-router'
import { getFile } from '~/lib/services/file-storage.server.js'

export async function loader({ params }: LoaderFunctionArgs) {
  const { fileId } = params

  if (!fileId) {
    return new Response('File ID required', { status: 400 })
  }

  const fileBuffer = await getFile(fileId)

  if (!fileBuffer) {
    return new Response('File not found', { status: 404 })
  }

  // For now, return as binary data
  // In a production app, you'd want to determine the correct content type
  return new Response(fileBuffer, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000' // 1 year cache
    }
  })
}