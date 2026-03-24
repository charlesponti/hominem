import type { RawHonoClient } from '../core/raw-client'

export interface FileIndexInput {
  id: string
  originalName: string
  type: 'image' | 'document' | 'audio' | 'video' | 'unknown'
  mimetype: string
  size: number
  textContent?: string
  content?: string
  thumbnail?: string
  metadata?: Record<string, string | number | boolean | null>
}

export interface FileIndexOutput {
  success: boolean
  message: string
}

export interface FilePrepareUploadInput {
  originalName: string
  mimetype: string
  size: number
}

export interface FilePrepareUploadOutput {
  fileId: string
  key: string
  originalName: string
  mimetype: string
  size: number
  uploadUrl: string
  headers: Record<string, string>
  url: string
  uploadedAt: string
  expiresAt: string
}

export interface RpcUploadedFile {
  id: string
  originalName: string
  type: 'image' | 'document' | 'audio' | 'video' | 'unknown'
  mimetype: string
  size: number
  content?: string
  textContent?: string
  metadata?: Record<string, unknown>
  thumbnail?: string
  url: string
  uploadedAt: string
  vectorIds?: string[]
}

export interface FileCompleteUploadInput {
  fileId: string
  key: string
  originalName: string
  mimetype: string
  size: number
}

export interface FileCompleteUploadOutput {
  success: boolean
  file: RpcUploadedFile
  message: string
}

export interface FilesClient {
  index(input: FileIndexInput): Promise<FileIndexOutput>
  prepareUpload(input: FilePrepareUploadInput): Promise<FilePrepareUploadOutput>
  completeUpload(input: FileCompleteUploadInput): Promise<FileCompleteUploadOutput>
}

export function createFilesClient(rawClient: RawHonoClient): FilesClient {
  return {
    async index(input) {
      const res = await rawClient.api.files.index.$post({ json: input })
      return res.json() as Promise<FileIndexOutput>
    },
    async prepareUpload(input) {
      const res = await rawClient.api.files['prepare-upload'].$post({ json: input })
      return res.json() as Promise<FilePrepareUploadOutput>
    },
    async completeUpload(input) {
      const res = await rawClient.api.files['complete-upload'].$post({ json: input })
      return res.json() as Promise<FileCompleteUploadOutput>
    },
  }
}
