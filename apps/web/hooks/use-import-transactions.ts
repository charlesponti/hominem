import { useState } from 'react'

export type FileStatus = {
  file: File
  status: 'pending' | 'uploading' | 'processing' | 'done' | 'error'
  error?: string
  stats?: {
    progress?: number
    processingTime?: number
    total?: number
    created?: number
    updated?: number
    skipped?: number
    merged?: number
    invalid?: number
    errors?: string[]
  }
}

export function useImportFiles() {
  const [statuses, setStatuses] = useState<FileStatus[]>([])

  const updateStatus = (file: File, status: FileStatus['status'], error?: string) => {
    setStatuses((prev) =>
      prev.map((item) => (item.file === file ? { ...item, status, error } : item))
    )
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

  const importFiles = async (files: File[]) => {
    // Initialize statuses
    setStatuses(files.map((f) => ({ file: f, status: 'pending' })))
    for (const file of files) {
      try {
        updateStatus(file, 'uploading')
        const base64 = await fileToBase64(file)
        updateStatus(file, 'processing')
        // Call the API route (assumes POST /api/finance/import exists and maps to FinanceRouter.importTransactions)
        const response = await fetch('http://localhost:4445/trpc/finance.importTransactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            csvFile: base64,
            fileName: file.name,
            deduplicateThreshold: 60,
          }),
        })
        const result = await response.json()
        updateStatus(file, 'done', result)
      } catch (error) {
        console.error(error)
        updateStatus(file, 'error', "Couldn't import file")
      }
    }
  }

  return { statuses, importFiles }
}
