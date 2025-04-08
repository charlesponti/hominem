'use client'

import { useWebsocket, type WebSocketMessage } from '@/hooks/use-websocket'
import { fileToBase64 } from '@/lib/files.utils'
import { useApiClient } from '@/lib/hooks/use-api-client'
import type {
  FileStatus,
  ImportRequestParams,
  ImportRequestResponse,
  ImportTransactionsJob,
} from '@hominem/utils/types'
import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'

const IMPORT_PROGRESS_CHANNEL = 'import:progress'
const IMPORT_PROGRESS_CHANNEL_TYPE = 'imports:subscribe'
const IMPORT_PROGRESS_CHANNEL_SUBSCRIBED = 'import:subscribed'

const convertJobToFileStatus = (jobs: ImportTransactionsJob[]): FileStatus[] =>
  jobs.map((job) => ({
    file: new File([], job.fileName),
    status: job.status,
    stats: job.stats,
    error: job.error,
  }))

export function useImportTransactions() {
  const apiClient = useApiClient()
  const [statuses, setStatuses] = useState<FileStatus[]>([])
  const [activeJobIds, setActiveJobIds] = useState<string[]>([])
  const { isConnected, ws } = useWebsocket<ImportTransactionsJob[]>()

  // Mutation for importing files
  const importMutation = useMutation({
    mutationFn: async (files: File[]): Promise<ImportRequestResponse[]> => {
      // Initialize optimistic statuses
      const optimisticStatuses = files.map((f) => ({
        file: f,
        status: 'uploading' as const,
        stats: {
          progress: 0,
          processingTime: 0,
        },
      }))
      setStatuses(optimisticStatuses)

      const results = await Promise.all(
        files.map(async (file) => {
          try {
            const base64 = await fileToBase64(file)
            const response = await apiClient.post<ImportRequestParams, ImportRequestResponse>(
              '/api/finance/import',
              {
                csvContent: base64,
                fileName: file.name,
                deduplicateThreshold: 60,
              }
            )

            if (!response.success) {
              throw new Error('Server error')
            }

            // Update status to processing after successful upload
            setStatuses((prev) =>
              prev.map((status) =>
                status.file.name === file.name
                  ? { ...status, status: 'processing' as const }
                  : status
              )
            )

            return response
          } catch (error) {
            // Update status to error on failure
            setStatuses((prev) =>
              prev.map((status) =>
                status.file.name === file.name
                  ? {
                      ...status,
                      status: 'error' as const,
                      error: error instanceof Error ? error.message : "Couldn't import file",
                    }
                  : status
              )
            )
            throw error
          }
        })
      )

      return results
    },
    onSuccess: (results) => {
      // Update active job IDs
      const jobIds = results.map((job) => job.jobId)
      setActiveJobIds(jobIds)
    },
  })

  // Process real-time job updates from WebSocket
  const updateImportProgress = useCallback(
    (jobData: ImportTransactionsJob[]) => {
      for (const job of jobData) {
        // Find file status by job ID
        const fileStatus = statuses.find((status) => {
          const jobId = activeJobIds.find((id) => id === job.jobId)
          return jobId && status.file && status.file.name === job.fileName
        })

        if (fileStatus?.file) {
          // Update the status with new information
          setStatuses((prev) =>
            prev.map((status) =>
              status.file === fileStatus.file
                ? {
                    ...status,
                    status: job.status,
                    stats: job.stats,
                    error: job.error,
                  }
                : status
            )
          )

          // Remove completed jobs from active tracking
          if (job.status === 'done' || job.status === 'error') {
            setActiveJobIds((prev) => prev.filter((id) => id !== job.jobId))
          }
        } else {
          setStatuses(convertJobToFileStatus(jobData))
        }
      }

      // Set optimistic updates from WebSocket data
    },
    [activeJobIds, statuses]
  )

  useEffect(() => {
    if (ws && isConnected) {
      ws.send(JSON.stringify({ type: IMPORT_PROGRESS_CHANNEL_TYPE }))
    }
  }, [ws, isConnected])

  useEffect(() => {
    if (!ws) return

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage<ImportTransactionsJob[]>

        if (!message.data) return

        // Handle subscription confirmation
        if (message.type === IMPORT_PROGRESS_CHANNEL_SUBSCRIBED) {
          updateImportProgress(message.data)
        }

        // Handle real-time import progress updates
        if (message.type === IMPORT_PROGRESS_CHANNEL) {
          updateImportProgress(message.data)
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.addEventListener('message', handleMessage)

    return () => {
      ws.removeEventListener('message', handleMessage)
    }
  }, [ws, updateImportProgress])

  return {
    isConnected,
    statuses,
    startImport: importMutation.mutateAsync,
    activeJobIds,
    isImporting: importMutation.isLoading,
  }
}
