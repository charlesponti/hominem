import { useApiClient } from '@/lib/hooks/use-api-client'
import type { FileStatus, ImportJob, ImportRequestResponse } from '@ponti/utils/types'
import { useState } from 'react'

export function useImportFiles() {
  const apiClient = useApiClient()
  const [statuses, setStatuses] = useState<FileStatus[]>([])

  const updateStatus = (file: File, status: Partial<FileStatus>) => {
    setStatuses((prev) => prev.map((item) => (item.file === file ? { ...item, ...status } : item)))
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        // Remove MIME prefix
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = (error) => reject(error)
    })
  }

  const importFiles = async (files: File[]): Promise<ImportRequestResponse[]> => {
    // Initialize statuses
    setStatuses(
      files.map((f) => ({
        file: f,
        status: 'uploading',
        stats: {
          progress: 0,
          processingTime: 0,
        },
      }))
    )

    const results = await Promise.all(
      files.map(async (file) => {
        try {
          const base64 = await fileToBase64(file)

          const response = await apiClient.post<
            {
              csvContent: string
              fileName: string
              deduplicateThreshold: number
            },
            ImportRequestResponse
          >('/api/finance/import', {
            csvContent: base64,
            fileName: file.name,
            deduplicateThreshold: 60,
          })

          if (!response.success) {
            throw new Error('Server error')
          }

          updateStatus(file, { status: 'processing' })
          return response
        } catch (error) {
          console.error(error)
          updateStatus(file, {
            status: 'error',
            error: error instanceof Error ? error.message : "Couldn't import file",
          })
          throw error
        }
      })
    )

    return results
  }

  // Check status of an import job
  const checkJobStatus = async (jobId: string): Promise<ImportJob> => {
    const response = await fetch(`/api/finance/import/${jobId}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch job status: ${response.status}`)
    }
    return await response.json()
  }

  // Get all active import jobs
  const getActiveImports = async (): Promise<ImportJob[]> => {
    const response = await fetch('/api/finance/imports/active')
    if (!response.ok) {
      throw new Error(`Failed to fetch active imports: ${response.status}`)
    }
    return await response.json()
  }

  return {
    statuses,
    setStatuses,
    importFiles,
    updateStatus,
    checkJobStatus,
    getActiveImports,
  }
}
