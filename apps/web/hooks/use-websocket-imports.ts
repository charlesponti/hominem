'use client'

import type { ImportTransactionsJob } from '@ponti/utils/types'
import { useEffect, useRef, useState } from 'react'
import { useImportTransactions } from './use-import-transactions'

const IMPORT_PROGRESS_CHANNEL = 'import:progress'
const IMPORT_PROGRESS_CHANNEL_TYPE = 'subscribe:imports'

type WebSocketMessage = {
  type: string
  data?: ImportTransactionsJob
  message?: string
}

export function useWebSocketImports() {
  const { statuses, importFiles, updateStatus, setStatuses } = useImportTransactions()

  const [isConnected, setIsConnected] = useState(false)
  const [activeJobIds, setActiveJobIds] = useState<string[]>([])
  const wsRef = useRef<WebSocket | null>(null)

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

          // Handle real-time import progress updates
          if (message.type === IMPORT_PROGRESS_CHANNEL && message.data) {
            const jobData = message.data
            updateImportProgress(jobData)
          }

          setStatuses((prev) => {
            // If users is first visiting the page, set statuses to initial uploads
            if (prev.length === 0 && message.data) {
              return [
                {
                  file: new File([], message.data.fileName),
                  status: message.data.status,
                  stats: message.data.stats,
                  error: message.data.error,
                },
              ]
            }

            const updatedStatuses = prev.map((status) => {
              if (status.file.name === message.data?.fileName) {
                return {
                  ...status,
                  status: message.data?.status,
                  stats: message.data?.stats,
                  error: message.data?.error,
                }
              }
              return status
            })
            return updatedStatuses
          })
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
  }, [setStatuses])

  // Process real-time job updates from WebSocket
  const updateImportProgress = (jobData: ImportTransactionsJob) => {
    // Find file status by job ID
    const fileStatus = statuses.find((status) => {
      const jobId = activeJobIds.find((id) => id === jobData.jobId)
      return jobId && status.file && status.file.name === jobData.fileName
    })

    if (fileStatus?.file) {
      // Update the status with new information
      updateStatus(fileStatus.file, {
        status: jobData.status,
        stats: jobData.stats,
        error: jobData.error,
      })

      // Remove completed jobs from active tracking
      if (jobData.status === 'done' || jobData.status === 'error') {
        setActiveJobIds((prev) => prev.filter((id) => id !== jobData.jobId))
      }
    }
  }

  // Start file import with WebSocket progress tracking
  const startImport = async (files: File[]) => {
    try {
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

      // Start import and track job IDs
      const results = await importFiles(files)
      const jobIds = results.map((job) => job.jobId)
      setActiveJobIds(jobIds)

      return results
    } catch (error) {
      console.error('Import failed:', error)
      throw error
    }
  }

  return {
    isConnected,
    statuses,
    startImport,
    activeJobIds,
  }
}
