import type { ActionFunctionArgs } from 'react-router'
import { processFile } from '~/lib/services/file-processor.server.js'
import { isValidFileType, storeFile } from '~/lib/services/file-storage.server.js'
import { indexProcessedFile } from '~/lib/services/vector-file-integration.server.js'
import { requireAuth } from '~/lib/supabase/server.js'
import type { FailedUpload, UploadResponse, UploadedFile } from '~/lib/types/upload.js'
import { jsonResponse } from '~/lib/utils/json-response'

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    // Require authentication and get user
    const { user } = await requireAuth(request)
    const userId = user.id

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files.length) {
      return jsonResponse({ error: 'No files provided' }, { status: 400 })
    }

    // Process each file
    const results = await Promise.allSettled(
      files.map(async (file) => {
        // Validate file type
        if (!isValidFileType(file.type)) {
          throw new Error(`Unsupported file type: ${file.type}`)
        }

        // Convert File to ArrayBuffer
        const buffer = await file.arrayBuffer()

        // Store the file with user authentication
        const storedFile = await storeFile(buffer, file.name, file.type, userId, request)

        // Process the file based on its type
        const processedFile = await processFile(buffer, file.name, file.type, storedFile.id)

        // Index the file in the vector store if file has text content
        let vectorIds: string[] = []
        if (processedFile.textContent || processedFile.content) {
          const indexResult = await indexProcessedFile(processedFile, userId, storedFile.url)
          vectorIds = indexResult.vectorIds
        }

        return {
          ...processedFile,
          url: storedFile.url,
          uploadedAt: storedFile.uploadedAt,
          vectorIds, // Include vector IDs in response
        }
      })
    )

    // Separate successful and failed uploads
    const successful: UploadedFile[] = []
    const failed: FailedUpload[] = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value)
      } else {
        failed.push({
          name: files[index].name,
          error: result.reason?.message || 'Unknown error',
        })
      }
    })

    const responseData: UploadResponse = {
      success: true,
      files: successful,
      failed,
      message: `Successfully uploaded ${successful.length} of ${files.length} files`,
    }

    return jsonResponse(responseData)
  } catch (error) {
    console.error('Upload error:', error)
    return jsonResponse(
      {
        error: 'Failed to process upload',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
