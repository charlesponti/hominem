import type { FileObject } from '@supabase/storage-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAdmin } from './client'

export class SupabaseStorageService {
  private client: SupabaseClient
  private bucketName: string

  constructor(bucketName = 'csv-imports') {
    this.client = supabaseAdmin
    this.bucketName = bucketName
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
        public: false, // Private bucket for security
        allowedMimeTypes: ['text/csv', 'application/csv'],
        fileSizeLimit: 50 * 1024 * 1024, // 50MB limit
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
        upsert: false, // Don't overwrite existing files
      })

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`)
    }

    return data.path
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
   * Delete a CSV file from Supabase storage
   * @param filePath - The file path in storage
   */
  async deleteCsvFile(filePath: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucketName).remove([filePath])

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`)
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
}

// Create a singleton instance
export const csvStorageService = new SupabaseStorageService()
