'use client'

import { fileToBase64 } from '@/lib/files.utils'
import { useApiClient } from '@/lib/hooks/use-api-client'
import { useWebSocketStore, type WebSocketMessage } from '@/store/websocket-store'
import { useAuth } from '@clerk/nextjs'
import { REDIS_CHANNELS } from '@hominem/utils/consts'
import type {
  FileStatus,
  ImportRequestParams,
  ImportRequestResponse,
  ImportTransactionsJob,
} from '@hominem/utils/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'

// Define constants for channel names and message types
const IMPORT_PROGRESS_CHANNEL = REDIS_CHANNELS.IMPORT_PROGRESS
const IMPORT_PROGRESS_CHANNEL_SUBSCRIBED = REDIS_CHANNELS.SUBSCRIBED
const IMPORT_PROGRESS_CHANNEL_TYPE = REDIS_CHANNELS.SUBSCRIBE
const IMPORT_TRANSACTIONS_KEY = [['finance', 'import-transactions']] as const

const convertJobToFileStatus = (jobs: ImportTransactionsJob[]): FileStatus[] =>
  jobs.map((job) => ({
    file: new File([], job.fileName),
    status: job.status,
    stats: job.stats,
    error: job.error,
  }))

export function useImportTransactionsStore() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  const [statuses, setStatuses] = useState<FileStatus[]>([])
  const [activeJobIds, setActiveJobIds] = useState<string[]>([])
  const [error, setError] = useState<Error | null>(null)

  // Get WebSocket store functions
  const { isConnected, connect, sendMessage, subscribe } = useWebSocketStore()

  // Connect on initialization, providing token function
  useEffect(() => {
    connect(getToken)
  }, [connect, getToken])

  // Process real-time job updates from WebSocket
  const updateImportProgress = useCallback((jobData: ImportTransactionsJob[]) => {
    if (!jobData.length) return

    setStatuses((prevStatuses) => {
      // For existing statuses, update them
      if (prevStatuses.length) {
        return prevStatuses.map((status) => {
          const matchingJob = jobData.find((job) => job.fileName === status.file.name)

          if (matchingJob) {
            const isComplete = matchingJob.status === 'done' || matchingJob.status === 'error'

            // Remove completed jobs from active tracking
            if (isComplete) {
              setActiveJobIds((prev) => prev.filter((id) => id !== matchingJob.jobId))
            }

            return {
              ...status,
              status: matchingJob.status,
              stats: matchingJob.stats,
              error: matchingJob.error,
            }
          }

          return status
        })
      }

      // If no existing statuses match, convert all jobs to file statuses
      return convertJobToFileStatus(jobData)
    })
  }, [])

  // Mutation for importing files
  const importMutation = useMutation({
    mutationFn: async (files: File[]): Promise<ImportRequestResponse[]> => {
      try {
        setError(null)

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
                throw new Error('Import failed')
              }

              // Update status after successful upload
              setStatuses((prev) =>
                prev.map((status) =>
                  status.file.name === file.name ? { ...status, status: response.status } : status
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
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to import transactions')
        setError(error)
        throw error
      }
    },
    onSuccess: (results) => {
      // Update active job IDs
      const jobIds = results.map((job) => job.jobId)
      setActiveJobIds(jobIds)

      // Invalidate any related queries
      queryClient.invalidateQueries({ queryKey: IMPORT_TRANSACTIONS_KEY })
    },
    onError: (err) => {
      setError(err instanceof Error ? err : new Error('Failed to import transactions'))
    },
  })

  // Subscribe to WebSocket messages when connected
  useEffect(() => {
    if (!isConnected) return

    // Send subscription message
    sendMessage({
      type: IMPORT_PROGRESS_CHANNEL_TYPE,
    })

    // Subscribe to both channels (progress updates and confirmation of subscription)
    const unsubscribeProgress = subscribe<ImportTransactionsJob[]>(
      IMPORT_PROGRESS_CHANNEL,
      (message: WebSocketMessage<ImportTransactionsJob[]>) => {
        if (message.data) {
          updateImportProgress(message.data)
        }
      }
    )

    const unsubscribeSubscribed = subscribe<ImportTransactionsJob[]>(
      IMPORT_PROGRESS_CHANNEL_SUBSCRIBED,
      (message: WebSocketMessage<ImportTransactionsJob[]>) => {
        if (message.data) {
          updateImportProgress(message.data)
        }
      }
    )

    // Cleanup subscriptions
    return () => {
      unsubscribeProgress()
      unsubscribeSubscribed()
    }
  }, [isConnected, sendMessage, subscribe, updateImportProgress])

  return {
    isConnected,
    statuses,
    startImport: importMutation.mutateAsync,
    activeJobIds,
    isImporting: importMutation.isLoading,
    isError: importMutation.isError || !!error,
    error,
  }
}
