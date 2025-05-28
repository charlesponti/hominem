import { logger } from '@hominem/utils/logger'
import type { FastifyRequest } from 'fastify'
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

export async function handleFileUpload(request: FastifyRequest): Promise<UploadedFile | null> {
  try {
    // Access the uploaded file from Fastify multipart
    const data = await request.file()

    if (!data) {
      return null
    }

    // Get file buffer
    const buffer = await data.toBuffer()

    // Create a temporary file
    const tempDir = os.tmpdir()
    const filename = data.filename || `${randomUUID()}-upload`
    const filepath = path.join(tempDir, filename)

    // Write buffer to file
    fs.writeFileSync(filepath, buffer)

    return {
      filename: data.filename,
      mimetype: data.mimetype,
      filepath,
      size: buffer.length,
    }
  } catch (error) {
    logger.error(error, 'File upload error:')
    return null
  }
}
