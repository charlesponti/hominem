import type { UploadedFile } from '@hominem/ui/types/upload'
import { useApiClient } from '@hominem/rpc/react'
import {
  CHAT_UPLOAD_MAX_FILE_COUNT,
  CHAT_UPLOAD_MAX_FILE_SIZE_BYTES,
  isSupportedChatUploadMimeType,
} from '@hominem/utils/upload'
import { useCallback, useState } from 'react'

interface PrepareUploadClient {
  prepareUpload(input: {
    originalName: string
    mimetype: string
    size: number
  }): Promise<{
    fileId: string
    key: string
    originalName: string
    mimetype: string
    size: number
    uploadUrl: string
    headers: Record<string, string>
  }>
  completeUpload(input: {
    fileId: string
    key: string
    originalName: string
    mimetype: string
    size: number
  }): Promise<{
    file: {
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
  }>
}

export interface MobileUploadAsset {
  assetId: string
  uri: string
  fileName: string | null
  mimeType: string | null
  type: string | null
}

export interface MobileUploadedAsset {
  assetId: string
  localUri: string
  uploadedFile: UploadedFile
}

export interface MobileUploadState {
  isUploading: boolean
  progress: number
  errors: string[]
}

export interface MobileUploadBatchResult {
  uploaded: MobileUploadedAsset[]
  errors: string[]
}

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  csv: 'text/csv',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  ogg: 'audio/ogg',
  pdf: 'application/pdf',
  png: 'image/png',
  txt: 'text/plain',
  wav: 'audio/wav',
  webm: 'video/webm',
  webp: 'image/webp',
}

function getFallbackFileName(uri: string): string {
  return uri.split('/').pop() ?? 'attachment'
}

export function resolveMobileUploadMimeType(asset: MobileUploadAsset): string {
  if (asset.mimeType) {
    return asset.mimeType
  }

  const fileName = asset.fileName ?? getFallbackFileName(asset.uri)
  const extension = fileName.split('.').pop()?.toLowerCase()

  if (extension && MIME_TYPE_BY_EXTENSION[extension]) {
    return MIME_TYPE_BY_EXTENSION[extension]
  }

  if (asset.type === 'image') return 'image/jpeg'
  if (asset.type === 'audio') return 'audio/mpeg'
  if (asset.type === 'video') return 'video/mp4'

  return 'application/octet-stream'
}

async function readLocalAssetBlob(fetchImpl: typeof fetch, asset: MobileUploadAsset): Promise<Blob> {
  const response = await fetchImpl(asset.uri)

  return response.blob()
}

export async function performMobileUploads(
  api: PrepareUploadClient,
  assets: MobileUploadAsset[],
  options?: {
    fetchImpl?: typeof fetch
    onProgress?: (progress: number) => void
  },
): Promise<MobileUploadBatchResult> {
  const fetchImpl = options?.fetchImpl ?? fetch
  const uploaded: MobileUploadedAsset[] = []
  const errors: string[] = []

  for (const [index, asset] of assets.entries()) {
    const originalName = asset.fileName ?? getFallbackFileName(asset.uri)

    try {
      const mimetype = resolveMobileUploadMimeType(asset)
      if (!isSupportedChatUploadMimeType(mimetype)) {
        throw new Error('Unsupported file type')
      }

      const fileBlob = await readLocalAssetBlob(fetchImpl, asset)
      if (fileBlob.size > CHAT_UPLOAD_MAX_FILE_SIZE_BYTES) {
        throw new Error('File exceeds 10MB limit')
      }

      const preparedUpload = await api.prepareUpload({
        originalName,
        mimetype,
        size: fileBlob.size,
      })

      const uploadResponse = await fetchImpl(preparedUpload.uploadUrl, {
        method: 'PUT',
        headers: preparedUpload.headers,
        body: fileBlob,
      })

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed (${uploadResponse.status})`)
      }

      const completion = await api.completeUpload({
        fileId: preparedUpload.fileId,
        key: preparedUpload.key,
        originalName: preparedUpload.originalName,
        mimetype: preparedUpload.mimetype,
        size: preparedUpload.size,
      })

      uploaded.push({
        assetId: asset.assetId,
        localUri: asset.uri,
        uploadedFile: {
          ...completion.file,
          uploadedAt: new Date(completion.file.uploadedAt),
        },
      })
    } catch (error) {
      errors.push(`${originalName}: ${error instanceof Error ? error.message : 'Upload failed'}`)
    } finally {
      options?.onProgress?.(Math.round(((index + 1) / assets.length) * 100))
    }
  }

  return {
    uploaded,
    errors,
  }
}

export function useFileUpload() {
  const apiClient = useApiClient()
  const [uploadState, setUploadState] = useState<MobileUploadState>({
    isUploading: false,
    progress: 0,
    errors: [],
  })

  const uploadAssets = useCallback(async (assets: MobileUploadAsset[]): Promise<MobileUploadedAsset[]> => {
    if (assets.length === 0) {
      return []
    }

    if (assets.length > CHAT_UPLOAD_MAX_FILE_COUNT) {
      const error = `You can upload up to ${CHAT_UPLOAD_MAX_FILE_COUNT} files at a time`
      setUploadState({
        isUploading: false,
        progress: 0,
        errors: [error],
      })
      return []
    }

    setUploadState({
      isUploading: true,
      progress: 0,
      errors: [],
    })

    const result = await performMobileUploads(apiClient.files, assets, {
      onProgress: (progress) => {
        setUploadState((currentState) => ({
          ...currentState,
          progress,
        }))
      },
    })

    setUploadState({
      isUploading: false,
      progress: result.uploaded.length > 0 || result.errors.length > 0 ? 100 : 0,
      errors: result.errors,
    })

    return result.uploaded
  }, [apiClient])

  const clearErrors = useCallback(() => {
    setUploadState((currentState) => ({
      ...currentState,
      errors: [],
    }))
  }, [])

  return {
    uploadState,
    uploadAssets,
    clearErrors,
  }
}