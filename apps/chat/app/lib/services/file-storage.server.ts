import { randomUUID } from 'node:crypto'
import { supabaseAdmin } from '../supabase/client.server'

const STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'chat-files'
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB

// Helper function to ensure the storage bucket exists
async function ensureStorageBucket() {
  try {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()

    if (listError) {
      console.error('Error listing buckets:', listError)
      return
    }

    const bucketExists = buckets.some((bucket) => bucket.name === STORAGE_BUCKET)

    if (!bucketExists) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        allowedMimeTypes: [
          'image/*',
          'application/pdf',
          'text/plain',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'audio/*',
          'video/*',
        ],
        fileSizeLimit: MAX_FILE_SIZE,
      })

      if (createError) {
        console.error('Error creating bucket:', createError)
      }
    }
  } catch (error) {
    console.error('Error ensuring storage bucket:', error)
  }
}

export interface StoredFile {
  id: string
  originalName: string
  filename: string
  mimetype: string
  size: number
  url: string
  uploadedAt: Date
}

export async function storeFile(
  buffer: ArrayBuffer,
  originalName: string,
  mimetype: string
): Promise<StoredFile> {
  // Ensure the storage bucket exists
  await ensureStorageBucket()

  if (buffer.byteLength > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE} bytes`)
  }

  const id = randomUUID()
  const extension = getFileExtension(originalName, mimetype)
  const filename = `${id}${extension}`

  // Upload to Supabase Storage
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(filename, buffer, {
      contentType: mimetype,
      upsert: false,
    })

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`)
  }

  // Get public URL
  const { data: urlData } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(filename)

  return {
    id,
    originalName,
    filename,
    mimetype,
    size: buffer.byteLength,
    url: urlData.publicUrl,
    uploadedAt: new Date(),
  }
}

export async function getFile(fileId: string): Promise<ArrayBuffer | null> {
  try {
    // List files to find the one that starts with the fileId
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .list()

    if (listError) {
      console.error('Error listing files:', listError)
      return null
    }

    const file = files.find((file) => file.name.startsWith(fileId))

    if (!file) {
      return null
    }

    // Download the file
    const { data, error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).download(file.name)

    if (error) {
      console.error('Error downloading file:', error)
      return null
    }

    return await data.arrayBuffer()
  } catch (error) {
    console.error('Error in getFile:', error)
    return null
  }
}

export async function deleteFile(fileId: string): Promise<boolean> {
  try {
    // List files to find the one that starts with the fileId
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .list()

    if (listError) {
      console.error('Error listing files:', listError)
      return false
    }

    const file = files.find((file) => file.name.startsWith(fileId))

    if (!file) {
      return false
    }

    // Delete the file
    const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([file.name])

    if (error) {
      console.error('Error deleting file:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in deleteFile:', error)
    return false
  }
}

export async function getFileUrl(fileId: string): Promise<string | null> {
  try {
    // List files to find the one that starts with the fileId
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .list()

    if (listError) {
      console.error('Error listing files:', listError)
      return null
    }

    const file = files.find((file) => file.name.startsWith(fileId))

    if (!file) {
      return null
    }

    // Get public URL
    const { data } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(file.name)

    return data.publicUrl
  } catch (error) {
    console.error('Error in getFileUrl:', error)
    return null
  }
}

function getFileExtension(filename: string, mimetype: string): string {
  // First try to get extension from filename
  const dotIndex = filename.lastIndexOf('.')
  if (dotIndex !== -1) {
    return filename.substring(dotIndex)
  }

  // Fallback to mimetype mapping
  const mimeToExt: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'text/plain': '.txt',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/msword': '.doc',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
  }

  return mimeToExt[mimetype] || ''
}

export function isValidFileType(mimetype: string): boolean {
  const allowedTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // Documents
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    // Audio
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'audio/webm',
    // Video
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ]

  return allowedTypes.includes(mimetype)
}
