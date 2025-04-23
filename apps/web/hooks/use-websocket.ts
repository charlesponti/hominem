'use client'

import { useAuth } from '@clerk/nextjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type WebSocketMessage<T = unknown> = {
  type: string
  data?: T
  message?: string
}

type WebSocketListener<T = unknown> = (message: WebSocketMessage<T>) => void
type WebSocketOptions = {
  autoReconnect?: boolean
  reconnectAttempts?: number
  reconnectInterval?: number
  maxReconnectInterval?: number
}

const DEFAULT_OPTIONS: WebSocketOptions = {
  autoReconnect: true,
  reconnectAttempts: 10,
  reconnectInterval: 1000,
  maxReconnectInterval: 30000,
}

export function useWebsocket<T = unknown>(options: WebSocketOptions = {}) {
  const { getToken } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage<T> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const listenersRef = useRef<Map<string, Set<WebSocketListener<unknown>>>>(new Map())
  const messageQueueRef = useRef<WebSocketMessage<T>[]>([])
  const wsUrlRef = useRef('')

  const mergedOptions = useMemo(
    () => ({
      ...DEFAULT_OPTIONS,
      ...options,
    }),
    [options]
  )

  const getBackoffTime = useCallback(() => {
    const { reconnectInterval, maxReconnectInterval } = mergedOptions
    const backoff = Math.min(
      (reconnectInterval ?? 1000) * 1.5 ** reconnectAttemptsRef.current,
      maxReconnectInterval ?? 30000
    )
    return Math.floor(backoff)
  }, [mergedOptions])

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    try {
      const token = await getToken()
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const apiUrlDomain = process.env.NEXT_PUBLIC_API_URL?.split('/')[2] ?? ''
      if (!apiUrlDomain) {
        console.error('NEXT_PUBLIC_API_URL is not configured correctly.')
        return
      }
      const wsBaseUrl = `${protocol}//${apiUrlDomain}`
      const wsUrl = token ? `${wsBaseUrl}?token=${token}` : wsBaseUrl
      wsUrlRef.current = wsUrl

      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.info(`WebSocket connected to ${wsBaseUrl}`)
        setIsConnected(true)
        reconnectAttemptsRef.current = 0

        if (messageQueueRef.current.length > 0) {
          for (const msg of messageQueueRef.current) {
            ws.send(JSON.stringify(msg))
          }
          messageQueueRef.current = []
        }
      }

      ws.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data)

          if (
            typeof parsedData !== 'object' ||
            parsedData === null ||
            typeof parsedData.type !== 'string'
          ) {
            console.error('Received invalid WebSocket message structure:', parsedData)
            return
          }

          const message: WebSocketMessage<unknown> = {
            type: parsedData.type,
            data: parsedData.data,
            message: typeof parsedData.message === 'string' ? parsedData.message : undefined,
          }

          setLastMessage(message as WebSocketMessage<T>)

          const typeListeners = listenersRef.current.get(message.type)
          if (typeListeners) {
            for (const listener of typeListeners) {
              listener(message)
            }
          }

          const globalListeners = listenersRef.current.get('*')
          if (globalListeners) {
            for (const listener of globalListeners) {
              listener(message)
            }
          }
        } catch (error) {
          if (error instanceof Error) {
            console.error('Failed to parse WebSocket message:', error.message)
          } else {
            console.error('Failed to parse WebSocket message with unknown error:', error)
          }
        }
      }

      ws.onclose = (event) => {
        console.warn(`WebSocket closed: ${event.code} ${event.reason}`)
        setIsConnected(false)
        wsRef.current = null

        if (event.code !== 1000 && mergedOptions.autoReconnect) {
          const { reconnectAttempts } = mergedOptions

          if (reconnectAttempts != null && reconnectAttemptsRef.current >= reconnectAttempts) {
            console.error(
              `WebSocket reconnection failed after ${reconnectAttemptsRef.current} attempts`
            )
            return
          }

          const backoffTime = getBackoffTime()
          console.info(
            `Attempting to reconnect in ${backoffTime}ms (attempt ${reconnectAttemptsRef.current + 1})`
          )

          setTimeout(() => {
            reconnectAttemptsRef.current++
            connect()
          }, backoffTime)
        }
      }

      ws.onerror = (errorEvent) => {
        console.error('WebSocket error:', errorEvent)
      }

      wsRef.current = ws
    } catch (err) {
      if (err instanceof Error) {
        console.error('Failed to establish WebSocket connection:', err.message)
      } else {
        console.error('Failed to establish WebSocket connection with unknown error:', err)
      }
    }
  }, [getToken, mergedOptions, getBackoffTime])

  const sendMessage = useCallback(
    (message: WebSocketMessage<T>) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message))
        return true
      }

      messageQueueRef.current.push(message)

      if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
        if (reconnectAttemptsRef.current === 0) {
          connect()
        }
      }

      return false
    },
    [connect]
  )

  const subscribe = useCallback(<R = unknown>(type: string, listener: WebSocketListener<R>) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set())
    }

    listenersRef.current.get(type)?.add(listener as WebSocketListener<unknown>)

    return () => {
      const listeners = listenersRef.current.get(type)
      if (listeners) {
        listeners.delete(listener as WebSocketListener<unknown>)
        if (listeners.size === 0) {
          listenersRef.current.delete(type)
        }
      }
    }
  }, [])

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Closing normally')
    }
  }, [])

  useEffect(() => {
    connect()

    return () => {
      if (!mergedOptions.autoReconnect && wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted')
      }
    }
  }, [connect, mergedOptions.autoReconnect])

  return {
    isConnected,
    lastMessage,
    sendMessage,
    subscribe,
    reconnect,
    disconnect,
  }
}
