import { useAuthContext } from '@hominem/auth'
import type {
  FileStatus,
  ImportRequestResponse,
  ImportTransactionsJob,
} from '@hominem/jobs-services'
import { useApiClient } from '@hominem/ui'
import { REDIS_CHANNELS } from '@hominem/utils/consts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useWebSocketStore, type WebSocketMessage } from './websocket-store'

const IMPORT_PROGRESS_CHANNEL = REDIS_CHANNELS.IMPORT_PROGRESS
const IMPORT_PROGRESS_CHANNEL_SUBSCRIBED = REDIS_CHANNELS.SUBSCRIBED
const IMPORT_PROGRESS_CHANNEL_TYPE = REDIS_CHANNELS.SUBSCRIBE
const IMPORT_TRANSACTIONS_KEY = [['finance', 'import-transactions']] as const

const PROGRESS_UPDATE_THROTTLE = 100

export function useImportTransactionsStore() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const { session } = useAuthContext()
  const [statuses, setStatuses] = useState<FileStatus[]>([])
  const [activeJobIds, setActiveJobIds] = useState<string[]>([])
  const [error, setError] = useState<Error | null>(null)
  const progressUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pendingUpdatesRef = useRef<ImportTransactionsJob[]>([])
  const fileCache = useRef(new Map<string, File>())

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
      jobs.map(
        (job) =>
          ({
            file: getStableFile(job.fileName),
            status: job.status,
            stats: job.stats,
            ...(job.error && { error: job.error }),
          }) as FileStatus,
      ),
    [getStableFile],
  )

  useEffect(() => {
    connect(() => Promise.resolve(session?.access_token || null))
  }, [connect, session])

  const throttledUpdateProgress = useCallback(
    (jobData: ImportTransactionsJob[]) => {
      pendingUpdatesRef.current = jobData

      if (progressUpdateTimeoutRef.current) {
        clearTimeout(progressUpdateTimeoutRef.current)
      }

      progressUpdateTimeoutRef.current = setTimeout(() => {
        const latestJobData = pendingUpdatesRef.current
        if (!latestJobData.length) return

        setStatuses((prevStatuses) => {
          const updatedStatuses = prevStatuses.length
            ? prevStatuses.map((status) => {
                const matchingJob = latestJobData.find((job) => job.fileName === status.file.name)

                if (matchingJob) {
                  const updated: FileStatus = {
                    ...status,
                    status: matchingJob.status,
                    stats: matchingJob.stats,
                  }
                  if (matchingJob.error) {
                    updated.error = matchingJob.error
                  }
                  return updated
                }

                return status
              })
            : convertJobToFileStatusStable(latestJobData)

          return updatedStatuses
        })

        const completedJobs = latestJobData.filter(
          (job) => job.status === 'done' || job.status === 'error',
        )

        if (completedJobs.length > 0) {
          const completedJobIds = completedJobs.map((job) => job.jobId)
          setActiveJobIds((prev) => prev.filter((id) => !completedJobIds.includes(id)))
        }
      }, PROGRESS_UPDATE_THROTTLE)
    },
    [convertJobToFileStatusStable],
  )

  const updateImportProgress = useCallback(
    (jobData: ImportTransactionsJob[]) => {
      if (!jobData.length) return

      const hasProgressUpdates = jobData.some(
        (job) => job.status === 'processing' || job.status === 'uploading',
      )

      if (hasProgressUpdates) {
        throttledUpdateProgress(jobData)
      } else {
        setStatuses((prevStatuses) => {
          const updatedStatuses = prevStatuses.length
            ? prevStatuses.map((status) => {
                const matchingJob = jobData.find((job) => job.fileName === status.file.name)

                if (matchingJob) {
                  const updated: FileStatus = {
                    ...status,
                    status: matchingJob.status,
                    stats: matchingJob.stats,
                  }
                  if (matchingJob.error) {
                    updated.error = matchingJob.error
                  }
                  return updated
                }

                return status
              })
            : convertJobToFileStatusStable(jobData)

          return updatedStatuses
        })

        const completedJobs = jobData.filter(
          (job) => job.status === 'done' || job.status === 'error',
        )

        if (completedJobs.length > 0) {
          const completedJobIds = completedJobs.map((job) => job.jobId)
          setActiveJobIds((prev) => prev.filter((id) => !completedJobIds.includes(id)))
        }
      }
    },
    [throttledUpdateProgress, convertJobToFileStatusStable],
  )

  useEffect(() => {
    return () => {
      if (progressUpdateTimeoutRef.current) {
        clearTimeout(progressUpdateTimeoutRef.current)
      }
    }
  }, [])

  const importMutation = useMutation({
    mutationFn: async (files: File[]): Promise<ImportRequestResponse[]> => {
      try {
        setError(null)

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

              const result = await apiClient.postFormData<ImportRequestResponse>(
                '/api/finance/import',
                formData,
              )

              if (!result.success) {
                throw new Error('Import failed')
              }

              setStatuses((prev) =>
                prev.map((status) =>
                  status.file.name === file.name ? { ...status, status: result.status } : status,
                ),
              )

              return result
            } catch (error) {
              setStatuses((prev) =>
                prev.map((status) =>
                  status.file.name === file.name
                    ? {
                        ...status,
                        status: 'error' as const,
                        error: error instanceof Error ? error.message : "Couldn't import file",
                      }
                    : status,
                ),
              )
              throw error
            }
          }),
        )

        return results
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to import transactions')
        setError(error)
        throw error
      }
    },
    onSuccess: (results) => {
      const jobIds = results.map((job) => job.jobId)
      setActiveJobIds(jobIds)
      queryClient.invalidateQueries({ queryKey: IMPORT_TRANSACTIONS_KEY })
    },
    onError: (err) => {
      setError(err instanceof Error ? err : new Error('Failed to import transactions'))
    },
  })

  useEffect(() => {
    if (!isConnected) return

    sendMessage({
      type: IMPORT_PROGRESS_CHANNEL_TYPE,
    })

    const unsubscribeProgress = subscribe<ImportTransactionsJob[]>(
      IMPORT_PROGRESS_CHANNEL,
      (message: WebSocketMessage<ImportTransactionsJob[]>) => {
        if (message.data) {
          updateImportProgress(message.data)
        }
      },
    )

    const unsubscribeSubscribed = subscribe<ImportTransactionsJob[]>(
      IMPORT_PROGRESS_CHANNEL_SUBSCRIBED,
      (message: WebSocketMessage<ImportTransactionsJob[]>) => {
        if (message.data) {
          updateImportProgress(message.data)
        }
      },
    )

    return () => {
      unsubscribeProgress()
      unsubscribeSubscribed()
    }
  }, [isConnected, sendMessage, subscribe, updateImportProgress])

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
