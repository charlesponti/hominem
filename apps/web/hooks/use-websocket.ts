'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export type WebSocketMessage<T> = {
  type: string
  data?: T
  message?: string
}

let connection: WebSocket | null = null

export function useWebsocket<T>() {
  const { getToken } = useAuth()
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const connectWebSocket = async () => {
      if (connection) {
        console.log('reusing existing websocket')
        return
      }

      const token = await getToken()
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${process.env.NEXT_PUBLIC_API_URL?.split('/')[2]}`
      const wsUrlWithAuth = token ? `${wsUrl}?token=${token}` : wsUrl
      const ws = new WebSocket(wsUrlWithAuth)

      ws.onopen = () => {
        console.log(`WebSocket connected ${wsUrl}`)
        setIsConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage<T>
          // Handle messages here based on type
          console.log('WebSocket message:', message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onclose = (event) => {
        console.log(`WebSocket closed: ${event.code} ${event.reason}`)
        setIsConnected(false)
        connection = null // Clear the WebSocket instance

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

      connection = ws
    }

    connectWebSocket()

    return () => {
      // * We don't close the connection while the user is on the app.
      // if (connection && connection.readyState === WebSocket.OPEN) {
      //   connection.close(1000, 'Closing normally')
      // }
      // connection = null
      setIsConnected(false)
    }
  }, [getToken])

  return {
    isConnected,
    ws: connection,
  }
}
