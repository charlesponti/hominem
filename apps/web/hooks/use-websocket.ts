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
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage<T> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const listenersRef = useRef<Map<string, Set<WebSocketListener<unknown>>>>(new Map())
  const messageQueueRef = useRef<WebSocketMessage<T>[]>([])
  const wsUrlRef = useRef('')
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null) // Ref for the timer ID

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
    if (wsRef.current?.readyState === WebSocket.OPEN || isConnecting) {
      console.log(
        '[WS Hook] Connect called but already open or connecting. State:',
        wsRef.current?.readyState,
        'isConnecting:',
        isConnecting
      )
      return
    }
    console.log('[WS Hook] Attempting to connect...')
    setIsConnecting(true)
    try {
      const token = await getToken()
      console.log('[WS Hook] Token fetched.')
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const apiUrlDomain = process.env.NEXT_PUBLIC_API_URL?.split('/')[2] ?? ''
      if (!apiUrlDomain) {
        console.error('[WS Hook] NEXT_PUBLIC_API_URL is not configured correctly.')
        setIsConnecting(false)
        return
      }
      const wsBaseUrl = `${protocol}//${apiUrlDomain}`
      const wsUrl = token ? `${wsBaseUrl}?token=${token}` : wsBaseUrl
      wsUrlRef.current = wsUrl
      console.log(`[WS Hook] Connecting to: ${wsUrl}`)

      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.info(`[WS Hook] WebSocket connected successfully to ${wsBaseUrl}`)
        setIsConnected(true)
        setIsConnecting(false)
        reconnectAttemptsRef.current = 0 // Reset attempts on successful connection
        console.log('[WS Hook] Reset reconnect attempts to 0')

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
            console.error('[WS Hook] Received invalid WebSocket message structure:', parsedData)
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

          console.log('[WS Hook] Message received:', message.type)
        } catch (error) {
          if (error instanceof Error) {
            console.error('[WS Hook] Failed to parse WebSocket message:', error.message)
          } else {
            console.error('[WS Hook] Failed to parse WebSocket message with unknown error:', error)
          }
        }
      }

      ws.onclose = (event) => {
        console.warn(
          `[WS Hook] WebSocket closed. Code: ${event.code}, Reason: ${event.reason}, Clean: ${event.wasClean}`
        )
        setIsConnected(false)
        setIsConnecting(false)
        wsRef.current = null

        // Clear any existing reconnect timer before scheduling a new one
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current)
          reconnectTimerRef.current = null
          console.log('[WS Hook] Cleared existing reconnect timer before scheduling new one.')
        }

        if (event.code !== 1000 && mergedOptions.autoReconnect) {
          const { reconnectAttempts } = mergedOptions
          console.log(
            `[WS Hook] Reconnect check. Attempts made: ${reconnectAttemptsRef.current}, Max attempts: ${reconnectAttempts}`
          )

          if (reconnectAttempts != null && reconnectAttemptsRef.current >= reconnectAttempts) {
            console.error(
              `[WS Hook] WebSocket reconnection failed after ${reconnectAttemptsRef.current} attempts. Stopping.`
            )
            return
          }

          const backoffTime = getBackoffTime()
          console.info(
            `[WS Hook] Attempting to reconnect in ${backoffTime}ms (attempt ${reconnectAttemptsRef.current + 1})`
          )

          // Store the timer ID in the ref
          reconnectTimerRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            console.log(
              `[WS Hook] Incremented reconnect attempts to: ${reconnectAttemptsRef.current}`
            )
            reconnectTimerRef.current = null // Clear ref after timer runs
            connectRef.current()
          }, backoffTime)
        } else {
          console.log('[WS Hook] No reconnect needed (closed normally or autoReconnect disabled).')
        }
      }

      ws.onerror = (errorEvent) => {
        console.error('[WS Hook] WebSocket error occurred:', errorEvent)
        setIsConnecting(false)
      }

      wsRef.current = ws
      console.log('[WS Hook] WebSocket instance created.')
    } catch (err) {
      console.error('[WS Hook] Error during connect setup:', err)
      setIsConnecting(false)
    }
  }, [getToken, mergedOptions, getBackoffTime, isConnecting])

  const connectRef = useRef(connect)
  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  const sendMessage = useCallback(
    (message: WebSocketMessage<T>) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('[WS Hook] Sending message:', message.type)
        wsRef.current.send(JSON.stringify(message))
        return true
      }

      console.log('[WS Hook] Queuing message, WS not open. State:', wsRef.current?.readyState)
      messageQueueRef.current.push(message)

      if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
        if (
          !isConnecting &&
          reconnectAttemptsRef.current <
            (mergedOptions.reconnectAttempts ?? DEFAULT_OPTIONS.reconnectAttempts ?? 10)
        ) {
          console.log('[WS Hook] sendMessage triggered connect attempt.')
          connectRef.current()
        }
      }

      return false
    },
    [isConnecting, mergedOptions.reconnectAttempts]
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
    console.log(
      `[WS Hook] Mount/Connection Effect. isConnected: ${isConnected}, isConnecting: ${isConnecting}`
    )
    if (!isConnected && !isConnecting) {
      if (
        reconnectAttemptsRef.current <
        (mergedOptions.reconnectAttempts ?? DEFAULT_OPTIONS.reconnectAttempts ?? 10)
      ) {
        console.log('[WS Hook] Initial connect triggered by useEffect.')
        connectRef.current()
      } else {
        console.log('[WS Hook] Initial connect skipped, max reconnect attempts reached.')
      }
    }

    // Cleanup function
    return () => {
      console.log(`[WS Hook] Cleanup Effect. autoReconnect: ${mergedOptions.autoReconnect}`)

      // Clear any pending reconnect timer on unmount/cleanup
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
        console.log('[WS Hook] Cleared pending reconnect timer on cleanup.')
      }

      // Close connection only if autoReconnect is off
      if (!mergedOptions.autoReconnect && wsRef.current) {
        console.log('[WS Hook] Closing WebSocket connection on unmount (autoReconnect is off).')
        wsRef.current.close(1000, 'Component unmounted')
      }
    }
  }, [mergedOptions.autoReconnect, isConnected, isConnecting, mergedOptions.reconnectAttempts])

  return {
    isConnected,
    isConnecting,
    lastMessage,
    sendMessage,
    subscribe,
    reconnect,
    disconnect,
  }
}
