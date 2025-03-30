'use client'

import type { FileStatus, ImportJob } from '@ponti/utils/types'
import { useEffect, useRef, useState } from 'react'
import { useImportFiles } from './use-import-files'

type WebSocketMessage = {
  type: string
  data?: ImportJob
  message?: string
}

export function useWebSocketImports() {
  const { statuses, importFiles, updateStatus, checkJobStatus, getActiveImports, setStatuses } =
    useImportFiles()

  const [isConnected, setIsConnected] = useState(false)
  const [activeJobIds, setActiveJobIds] = useState<string[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  // Initial WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${process.env.NEXT_PUBLIC_API_URL?.split('/')[2]}/ws`

    const connectWebSocket = () => {
      const token = localStorage.getItem('token')
      const wsUrlWithAuth = token ? `${wsUrl}?token=${token}` : wsUrl
      const ws = new WebSocket(wsUrlWithAuth)
      ws.onopen = () => {
        console.log(`WebSocket connected ${wsUrl}`)
        setIsConnected(true)

        // Request import updates
        ws.send(JSON.stringify({ type: 'subscribe:imports' }))
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage

          // Handle real-time import progress updates
          if (message.type === 'import:progress' && message.data) {
            const jobData = message.data
            updateImportProgress(jobData)
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
  const updateImportProgress = (jobData: ImportJob) => {
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

  // Load active imports on initial connection
  useEffect(() => {
    if (isConnected) {
      getActiveImports()
        .then((jobs) => {
          if (jobs && jobs.length > 0) {
            // Process any active jobs that are already running
            for (const job of jobs) {
              console.log(`Active job found: ${job.jobId} (${job.fileName})`)
            }
          }
        })
        .catch((err) => {
          console.error('Failed to fetch active imports:', err)
        })
    }
  }, [getActiveImports, isConnected])

  return {
    isConnected,
    statuses,
    startImport,
    activeJobIds,
  }
}
