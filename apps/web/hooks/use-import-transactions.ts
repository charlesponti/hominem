import type { FileStatus, ImportJob } from '@ponti/utils/types'
import { useState } from 'react'

export function useImportFiles() {
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

  const importFiles = async (files: File[]): Promise<ImportJob[]> => {
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

          const response = await fetch('/api/trpc/finance.importTransactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              csvContent: base64,
              fileName: file.name,
              deduplicateThreshold: 60,
            }),
          })

          const result = (await response.json()) as ImportJob
          updateStatus(file, { status: 'processing' })
          return result
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

  return { setStatuses, statuses, importFiles, updateStatus }
}
