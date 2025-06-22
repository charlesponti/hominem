import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export interface UploadedFile {
  filename: string
  mimetype: string
  filepath: string
  size: number
}

export async function handleFileUpload(request: Request): Promise<UploadedFile | null> {
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

    // Create a temporary file
    const tempDir = os.tmpdir()
    const filename = file.name || `${randomUUID()}-upload`
    const filepath = path.join(tempDir, filename)

    // Write buffer to file
    fs.writeFileSync(filepath, buffer)

    return {
      filename: file.name,
      mimetype: file.type,
      filepath,
      size: buffer.length,
    }
  } catch (error) {
    console.error('File upload error:', error)
    return null
  }
}
