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

export interface FilesClient {
  index(input: FileIndexInput): Promise<FileIndexOutput>
}

export function createFilesClient(rawClient: RawHonoClient): FilesClient {
  return {
    async index(input) {
      const res = await rawClient.api.files.index.$post({ json: input })
      return res.json() as Promise<FileIndexOutput>
    },
  }
}
