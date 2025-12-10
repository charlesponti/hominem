import { randomUUID } from 'node:crypto'
import type { FileObject } from '@supabase/storage-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from './admin'

export interface StoredFile {
  id: string
  originalName: string
  filename: string
  mimetype: string
  size: number
  url: string
  uploadedAt: Date
}

export class SupabaseStorageService {
  private client: SupabaseClient
  private bucketName: string
  private maxFileSize: number
  private isPublic: boolean

  constructor(
    bucketName = 'csv-imports',
    options?: {
      maxFileSize?: number
      isPublic?: boolean
      allowedMimeTypes?: string[]
    }
  ) {
    this.client = supabaseAdmin
    this.bucketName = bucketName
    this.maxFileSize = options?.maxFileSize || 50 * 1024 * 1024 // 50MB default
    this.isPublic = options?.isPublic ?? false
  }

  /**
   * Ensure the bucket exists, create it if it doesn't
   */
  async ensureBucket(): Promise<void> {
    const { data: buckets, error: listError } = await this.client.storage.listBuckets()

    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`)
    }

    const bucketExists = buckets?.some((bucket) => bucket.name === this.bucketName)

    if (!bucketExists) {
      const { error: createError } = await this.client.storage.createBucket(this.bucketName, {
        public: this.isPublic,
        allowedMimeTypes: [
          'text/csv',
          'application/csv',
          'image/*',
          'application/pdf',
          'text/plain',
          'audio/*',
          'video/*',
        ],
        fileSizeLimit: this.maxFileSize,
      })

      if (createError) {
        throw new Error(`Failed to create bucket: ${createError.message}`)
      }
    }
  }

  /**
   * Upload a CSV file to Supabase storage
   * @param fileName - The name of the file
   * @param fileContent - The file content as Buffer or string
   * @param userId - The user ID for organizing files
   * @returns The file path in storage
   */
  async uploadCsvFile(
    fileName: string,
    fileContent: Buffer | string,
    userId: string
  ): Promise<string> {
    await this.ensureBucket()

    // Create a unique file path with timestamp and user ID
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filePath = `${userId}/${timestamp}_${sanitizedFileName}`

    const { data, error } = await this.client.storage
      .from(this.bucketName)
      .upload(filePath, fileContent, {
        contentType: 'text/csv',
        upsert: false,
      })

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`)
    }

    return data.path
  }

  /**
   * Store a file in Supabase storage (general purpose)
   * @param buffer - The file buffer
   * @param originalName - The original file name
   * @param mimetype - The file MIME type
   * @param userId - The user ID for organizing files
   * @returns StoredFile object with metadata
   */
  async storeFile(
    buffer: Buffer,
    originalName: string,
    mimetype: string,
    userId: string
  ): Promise<StoredFile> {
    if (buffer.byteLength > this.maxFileSize) {
      throw new Error(`File size exceeds maximum limit of ${this.maxFileSize} bytes`)
    }

    await this.ensureBucket()

    const id = randomUUID()
    const extension = this.getFileExtension(originalName, mimetype)
    const filename = `${userId}/${id}${extension}` // Organize files by user ID

    // Upload to Supabase Storage
    const { data: _data, error } = await this.client.storage
      .from(this.bucketName)
      .upload(filename, buffer, {
        contentType: mimetype,
        upsert: false,
      })

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`)
    }

    // Get public URL
    const { data: urlData } = this.client.storage.from(this.bucketName).getPublicUrl(filename)

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

  /**
   * Download a CSV file from Supabase storage
   * @param filePath - The file path in storage
   * @returns The file content as text
   */
  async downloadCsvFile(filePath: string): Promise<string> {
    const { data, error } = await this.client.storage.from(this.bucketName).download(filePath)

    if (error) {
      // Enhanced error logging for Supabase download issues
      console.error('Supabase download error details:', {
        error,
        errorMessage: error.message,
        errorName: error.name,
        filePath,
        bucketName: this.bucketName,
      })
      throw new Error(
        `Failed to download file: ${JSON.stringify({
          message: error.message,
          name: error.name,
          filePath,
          bucketName: this.bucketName,
        })}`
      )
    }

    if (!data) {
      throw new Error('No file data received')
    }

    // Convert blob to text
    return await data.text()
  }

  /**
   * Download a CSV file from Supabase storage as Buffer
   * @param filePath - The file path in storage
   * @returns The file content as Buffer
   */
  async downloadCsvFileAsBuffer(filePath: string): Promise<Buffer> {
    const { data, error } = await this.client.storage.from(this.bucketName).download(filePath)

    if (error) {
      throw new Error(
        `Failed to download file: ${JSON.stringify({
          message: error.message,
          name: error.name,
          filePath,
          bucketName: this.bucketName,
        })}`
      )
    }

    if (!data) {
      throw new Error('No file data received')
    }

    // Convert blob to buffer
    return Buffer.from(await data.arrayBuffer())
  }

  /**
   * Get a file from Supabase storage by file ID
   * @param fileId - The file ID
   * @param userId - The user ID
   * @returns The file content as ArrayBuffer or null if not found
   */
  async getFile(fileId: string, userId: string): Promise<ArrayBuffer | null> {
    try {
      // List files in the user's directory
      const { data: files, error: listError } = await this.client.storage
        .from(this.bucketName)
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
      const { data, error } = await this.client.storage.from(this.bucketName).download(filePath)

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

  /**
   * Delete a file from Supabase storage by file ID
   * @param fileId - The file ID
   * @param userId - The user ID
   * @returns True if deleted successfully, false if not found
   */
  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    try {
      // List files in the user's directory
      const { data: files, error: listError } = await this.client.storage
        .from(this.bucketName)
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
      const { error } = await this.client.storage.from(this.bucketName).remove([filePath])

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

  /**
   * Get the public URL for a file by file ID
   * @param fileId - The file ID
   * @param userId - The user ID
   * @returns The public URL or null if not found
   */
  async getFileUrl(fileId: string, userId: string): Promise<string | null> {
    try {
      // List files in the user's directory to find the one that starts with the fileId
      const { data: files, error: listError } = await this.client.storage
        .from(this.bucketName)
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
      const { data } = this.client.storage.from(this.bucketName).getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Error in getFileUrl:', error)
      return null
    }
  }

  /**
   * Get a signed URL for downloading a file (useful for temporary access)
   * @param filePath - The file path in storage
   * @param expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns A signed URL
   */
  async getSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucketName)
      .createSignedUrl(filePath, expiresIn)

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`)
    }

    if (!data?.signedUrl) {
      throw new Error('No signed URL received')
    }

    return data.signedUrl
  }

  /**
   * List files for a specific user
   * @param userId - The user ID
   * @returns Array of file objects
   */
  async listUserFiles(userId: string): Promise<FileObject[]> {
    const { data, error } = await this.client.storage.from(this.bucketName).list(userId)

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get file extension from filename or mimetype
   */
  private getFileExtension(filename: string, mimetype: string): string {
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
      'text/csv': '.csv',
      'application/csv': '.csv',
    }

    return mimeToExt[mimetype] || ''
  }

  /**
   * Check if a file type is valid
   */
  isValidFileType(mimetype: string): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'video/mp4',
      'video/webm',
      'text/csv',
      'application/csv',
    ]

    return allowedTypes.includes(mimetype)
  }
}

// Create singleton instances for different use cases
export const csvStorageService = new SupabaseStorageService('csv-imports', {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  isPublic: false,
})

export const fileStorageService = new SupabaseStorageService('chat-files', {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  isPublic: true,
})
