import { randomUUID } from 'node:crypto'
import { createSupabaseServerClient } from '../supabase/server'

const STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'chat-files'
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB

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
  mimetype: string,
  userId: string,
  request: Request
): Promise<StoredFile> {
  const { supabase } = createSupabaseServerClient(request)

  if (buffer.byteLength > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE} bytes`)
  }

  const id = randomUUID()
  const extension = getFileExtension(originalName, mimetype)
  const filename = `${userId}/${id}${extension}` // Organize files by user ID

  // Upload to Supabase Storage using user authentication
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).upload(filename, buffer, {
    contentType: mimetype,
    upsert: false,
  })

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filename)

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

export async function getFile(
  fileId: string,
  userId: string,
  request: Request
): Promise<ArrayBuffer | null> {
  try {
    const { supabase } = createSupabaseServerClient(request)

    // List files in the user's directory
    const { data: files, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(userId)

    if (listError) {
      console.error('Error listing files:', listError)
      return null
    }

    const file = files?.find((f: { name: string }) => f.name.startsWith(fileId))

    if (!file) {
      return null
    }

    // Download the file from user's directory
    const filePath = `${userId}/${file.name}`
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(filePath)

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

export async function deleteFile(
  fileId: string,
  userId: string,
  request: Request
): Promise<boolean> {
  try {
    const { supabase } = createSupabaseServerClient(request)

    // List files in the user's directory
    const { data: files, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(userId)

    if (listError) {
      console.error('Error listing files:', listError)
      return false
    }

    const file = files?.find((f: { name: string }) => f.name.startsWith(fileId))

    if (!file) {
      return false
    }

    // Delete the file from user's directory
    const filePath = `${userId}/${file.name}`
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([filePath])

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

export async function getFileUrl(
  fileId: string,
  userId: string,
  request: Request
): Promise<string | null> {
  try {
    const { supabase } = createSupabaseServerClient(request)

    // List files in the user's directory to find the one that starts with the fileId
    const { data: files, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(userId)

    if (listError) {
      console.error('Error listing files:', listError)
      return null
    }

    const file = files?.find((f: { name: string }) => f.name.startsWith(fileId))

    if (!file) {
      return null
    }

    // Get public URL for the file in user's directory
    const filePath = `${userId}/${file.name}`
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath)

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
