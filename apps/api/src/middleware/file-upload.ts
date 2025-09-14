export interface UploadedFile {
  filename: string
  mimetype: string
  filepath: string
  size: number
  buffer?: Buffer
}

/**
 * Handle file upload and return buffer
 */
export async function handleFileUploadBuffer(
  request: Request
): Promise<{ filename: string; mimetype: string; buffer: Buffer; size: number } | null> {
  try {
    // Check if the request has multipart form data
    const contentType = request.headers.get('content-type')
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return null
    }

    // Parse the form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return null
    }

    // Get file buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    return {
      filename: file.name,
      mimetype: file.type,
      buffer,
      size: buffer.length,
    }
  } catch (error) {
    console.error('File upload error:', error)
    return null
  }
}
