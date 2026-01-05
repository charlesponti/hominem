'use client'

import { useSupabaseAuthContext } from '@hominem/auth'
import { useApiClient } from '@hominem/ui'
import { REDIS_CHANNELS } from '@hominem/utils/consts'
import type { FileStatus, ImportRequestResponse, ImportTransactionsJob } from '@hominem/utils/jobs'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useWebSocketStore, type WebSocketMessage } from '~/store/websocket-store'

// Define constants for channel names and message types
const IMPORT_PROGRESS_CHANNEL = REDIS_CHANNELS.IMPORT_PROGRESS
const IMPORT_PROGRESS_CHANNEL_SUBSCRIBED = REDIS_CHANNELS.SUBSCRIBED
const IMPORT_PROGRESS_CHANNEL_TYPE = REDIS_CHANNELS.SUBSCRIBE
const IMPORT_TRANSACTIONS_KEY = [['finance', 'import-transactions']] as const

// Throttle delay for progress updates (in milliseconds)
const PROGRESS_UPDATE_THROTTLE = 100

export function useImportTransactionsStore() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const { session } = useSupabaseAuthContext()
  const [statuses, setStatuses] = useState<FileStatus[]>([])
  const [activeJobIds, setActiveJobIds] = useState<string[]>([])
  const [error, setError] = useState<Error | null>(null)
  // Throttling refs for progress updates
  const progressUpdateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const pendingUpdatesRef = useRef<ImportTransactionsJob[]>([])

  // Cache for stable file objects when converting from jobs
  const fileCache = useRef(new Map<string, File>())

  // Get WebSocket store functions
  const { isConnected, connect, sendMessage, subscribe } = useWebSocketStore()

  const getStableFile = useCallback((fileName: string): File => {
    const cached = fileCache.current.get(fileName)
    if (cached) {
      return cached
    }
    const newFile = new File([], fileName)
    fileCache.current.set(fileName, newFile)
    return newFile
  }, [])

  const convertJobToFileStatusStable = useCallback(
    (jobs: ImportTransactionsJob[]): FileStatus[] =>
      jobs.map((job) => ({
        file: getStableFile(job.fileName),
        status: job.status,
        stats: job.stats,
        error: job.error,
      })),
    [getStableFile]
  )

  // Connect on initialization
  useEffect(() => {
    connect(() => Promise.resolve(session?.access_token || null))
  }, [connect, session])

  // Throttled update function to reduce re-render frequency
  const throttledUpdateProgress = useCallback(
    (jobData: ImportTransactionsJob[]) => {
      // Store the latest update
      pendingUpdatesRef.current = jobData

      // Clear existing timeout
      if (progressUpdateTimeoutRef.current) {
        clearTimeout(progressUpdateTimeoutRef.current)
      }

      // Set new timeout
      progressUpdateTimeoutRef.current = setTimeout(() => {
        const latestJobData = pendingUpdatesRef.current
        if (!latestJobData.length) return

        // Batch all state updates to prevent multiple re-renders
        setStatuses((prevStatuses) => {
          const updatedStatuses = prevStatuses.length
            ? prevStatuses.map((status) => {
                const matchingJob = latestJobData.find((job) => job.fileName === status.file.name)

                if (matchingJob) {
                  return {
                    ...status,
                    status: matchingJob.status,
                    stats: matchingJob.stats,
                    error: matchingJob.error,
                  }
                }

                return status
              })
            : convertJobToFileStatusStable(latestJobData)

          return updatedStatuses
        })

        // Batch active job ID updates
        const completedJobs = latestJobData.filter(
          (job) => job.status === 'done' || job.status === 'error'
        )

        if (completedJobs.length > 0) {
          const completedJobIds = completedJobs.map((job) => job.jobId)
          setActiveJobIds((prev) => prev.filter((id) => !completedJobIds.includes(id)))
        }
      }, PROGRESS_UPDATE_THROTTLE)
    },
    [convertJobToFileStatusStable]
  )

  // Process real-time job updates from WebSocket
  const updateImportProgress = useCallback(
    (jobData: ImportTransactionsJob[]) => {
      if (!jobData.length) return

      // Use throttled update for frequent progress updates
      const hasProgressUpdates = jobData.some(
        (job) => job.status === 'processing' || job.status === 'uploading'
      )

      if (hasProgressUpdates) {
        throttledUpdateProgress(jobData)
      } else {
        // For non-progress updates (status changes), update immediately
        setStatuses((prevStatuses) => {
          const updatedStatuses = prevStatuses.length
            ? prevStatuses.map((status) => {
                const matchingJob = jobData.find((job) => job.fileName === status.file.name)

                if (matchingJob) {
                  return {
                    ...status,
                    status: matchingJob.status,
                    stats: matchingJob.stats,
                    error: matchingJob.error,
                  }
                }

                return status
              })
            : convertJobToFileStatusStable(jobData)

          return updatedStatuses
        })

        // Update active job IDs for completed jobs
        const completedJobs = jobData.filter(
          (job) => job.status === 'done' || job.status === 'error'
        )

        if (completedJobs.length > 0) {
          const completedJobIds = completedJobs.map((job) => job.jobId)
          setActiveJobIds((prev) => prev.filter((id) => !completedJobIds.includes(id)))
        }
      }
    },
    [throttledUpdateProgress, convertJobToFileStatusStable]
  )

  // Cleanup throttled updates on unmount
  useEffect(() => {
    return () => {
      if (progressUpdateTimeoutRef.current) {
        clearTimeout(progressUpdateTimeoutRef.current)
      }
    }
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
              const formData = new FormData()
              formData.append('file', file)
              formData.append('fileName', file.name)
              formData.append('deduplicateThreshold', '60')

              // Use the API client's FormData method
              const result = await apiClient.postFormData<ImportRequestResponse>(
                '/api/finance/import',
                formData
              )

              if (!result.success) {
                throw new Error('Import failed')
              }

              // Update status after successful upload
              setStatuses((prev) =>
                prev.map((status) =>
                  status.file.name === file.name ? { ...status, status: result.status } : status
                )
              )

              return result
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

  // Function to remove a file status (for cleanup when user removes files)
  const removeFileStatus = useCallback((fileName: string) => {
    setStatuses((prev) => prev.filter((status) => status.file.name !== fileName))
  }, [])

  return {
    isConnected,
    statuses,
    startImport: importMutation.mutateAsync,
    startSingleFile: (file: File) => importMutation.mutateAsync([file]),
    removeFileStatus,
    activeJobIds,
    isImporting: importMutation.isPending,
    isError: importMutation.isError || !!error,
    error,
  }
}
