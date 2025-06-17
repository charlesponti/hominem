import { useState, useCallback } from 'react'
import type { ProcessedFile } from '~/lib/services/file-processor.server.js'

export interface UploadState {
  isUploading: boolean
  progress: number
  uploadedFiles: ProcessedFile[]
  errors: string[]
}

export interface UseFileUploadReturn {
  uploadState: UploadState
  uploadFiles: (files: FileList | File[]) => Promise<ProcessedFile[]>
  removeFile: (fileId: string) => void
  clearAll: () => void
}

export function useFileUpload(): UseFileUploadReturn {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    uploadedFiles: [],
    errors: []
  })

  const uploadFiles = useCallback(async (files: FileList | File[]): Promise<ProcessedFile[]> => {
    const fileArray = Array.from(files)
    
    setUploadState(prev => ({
      ...prev,
      isUploading: true,
      progress: 0,
      errors: []
    }))

    try {
      const formData = new FormData()
      fileArray.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      const newFiles = result.files || []
      const uploadErrors = result.failed?.map((f: any) => `${f.name}: ${f.error}`) || []

      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 100,
        uploadedFiles: [...prev.uploadedFiles, ...newFiles],
        errors: uploadErrors
      }))

      return newFiles

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 0,
        errors: [errorMessage]
      }))

      throw error
    }
  }, [])

  const removeFile = useCallback((fileId: string) => {
    setUploadState(prev => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter(file => file.id !== fileId)
    }))
  }, [])

  const clearAll = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      uploadedFiles: [],
      errors: []
    })
  }, [])

  return {
    uploadState,
    uploadFiles,
    removeFile,
    clearAll
  }
}