import { fileToBase64 } from '@/lib/files.utils'
import { useApiClient } from '@/lib/hooks/use-api-client'
import type {
  FileStatus,
  ImportRequestParams,
  ImportRequestResponse,
  ImportTransactionsJob,
} from '@ponti/utils/types'
import { useCallback, useEffect, useRef, useState } from 'react'

const IMPORT_PROGRESS_CHANNEL = 'import:progress'
const IMPORT_PROGRESS_CHANNEL_TYPE = 'imports:subscribe'
const IMPORT_PROGRESS_CHANNEL_SUBSCRIBED = 'import:subscribed'

type WebSocketMessage = {
  type: string
  data?: ImportTransactionsJob[]
  message?: string
}

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
  const [isConnected, setIsConnected] = useState(false)
  const [activeJobIds, setActiveJobIds] = useState<string[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  const updateStatus = useCallback((file: File, status: Partial<FileStatus>) => {
    setStatuses((prev) => prev.map((item) => (item.file === file ? { ...item, ...status } : item)))
  }, [])

  const importFiles = useCallback(
    async (files: File[]): Promise<ImportRequestResponse[]> => {
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
    },
    [apiClient, updateStatus]
  )

  // Check status of an import job
  const checkJobStatus = useCallback(async (jobId: string): Promise<ImportTransactionsJob> => {
    const response = await fetch(`/api/finance/import/${jobId}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch job status: ${response.status}`)
    }
    return await response.json()
  }, [])

  // Get all active import jobs
  const getActiveImports = async (): Promise<ImportTransactionsJob[]> => {
    const response = await fetch('/api/finance/imports/active')
    if (!response.ok) {
      throw new Error(`Failed to fetch active imports: ${response.status}`)
    }
    return await response.json()
  }

  // Initial WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${process.env.NEXT_PUBLIC_API_URL?.split('/')[2]}`

    const connectWebSocket = () => {
      const token = localStorage.getItem('token')
      const wsUrlWithAuth = token ? `${wsUrl}?token=${token}` : wsUrl
      const ws = new WebSocket(wsUrlWithAuth)

      ws.onopen = () => {
        // biome-ignore lint/suspicious/noConsoleLog: <explanation>
        console.log(`WebSocket connected ${wsUrl}`)
        setIsConnected(true)

        // Request import updates
        ws.send(JSON.stringify({ type: IMPORT_PROGRESS_CHANNEL_TYPE }))
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage

          if (!message.data) return

          // Handle real-time import progress updates
          if (message.type === IMPORT_PROGRESS_CHANNEL) {
            updateImportProgress(message.data)
          }

          if (message.type === IMPORT_PROGRESS_CHANNEL_SUBSCRIBED) {
            updateImportProgress(message.data)
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} ${event.reason}`)
        setIsConnected(false)

        // Attempt reconnection after delay if not intentionally closed
        if (event.code !== 1000) {
          setTimeout(() => {
            connectWebSocket()
          }, 3000)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      wsRef.current = ws

      // Cleanup function
      return () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close(1000, 'Closing normally')
        }
      }
    }

    const cleanup = connectWebSocket()

    return () => {
      cleanup()
      wsRef.current = null
    }
  }, [])

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
          updateStatus(fileStatus.file, {
            status: job.status,
            stats: job.stats,
            error: job.error,
          })

          // Remove completed jobs from active tracking
          if (job.status === 'done' || job.status === 'error') {
            setActiveJobIds((prev) => prev.filter((id) => id !== job.jobId))
          }
        } else {
          setStatuses(convertJobToFileStatus(jobData))
        }
      }
    },
    [statuses, activeJobIds, updateStatus]
  )

  // Start file import with WebSocket progress tracking
  const startImport = useCallback(
    async (files: File[]) => {
      try {
        // Start import and track job IDs
        const results = await importFiles(files)
        const jobIds = results.map((job) => job.jobId)
        setActiveJobIds(jobIds)

        return results
      } catch (error) {
        console.error('Import failed:', error)
        throw error
      }
    },
    [importFiles]
  )

  return {
    isConnected,
    statuses,
    startImport,
    activeJobIds,
    setStatuses,
    importFiles,
    updateStatus,
    checkJobStatus,
    getActiveImports,
  }
}
