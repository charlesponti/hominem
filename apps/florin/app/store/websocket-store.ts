'use client'

import { create } from 'zustand'

export type WebSocketMessage<T = unknown> = {
  type: string
  data?: T
  message?: string
}

type WebSocketOptions = {
  autoReconnect?: boolean
  reconnectAttempts?: number
  reconnectInterval?: number
  maxReconnectInterval?: number
}

type WebSocketListener<T = unknown> = (message: WebSocketMessage<T>) => void

type WebSocketStore = {
  // Connection state
  isConnected: boolean
  isConnecting: boolean
  lastError: Error | null
  lastMessage: WebSocketMessage<unknown> | null

  // Actions
  connect: (tokenFn?: () => Promise<string | null>) => Promise<void>
  disconnect: () => void
  sendMessage: <T>(message: WebSocketMessage<T>) => boolean
  subscribe: <T = unknown>(type: string, listener: WebSocketListener<T>) => () => void
  reconnect: () => void
  reset: () => void
}

// Options with defaults
const DEFAULT_OPTIONS: WebSocketOptions = {
  autoReconnect: true,
  reconnectAttempts: 10,
  reconnectInterval: 1000,
  maxReconnectInterval: 30000,
}

const useWebSocketStore = create<WebSocketStore>((set, get) => {
  let socket: WebSocket | null = null
  let reconnectAttempts = 0
  let reconnectTimer: NodeJS.Timeout | null = null
  const messageQueue: WebSocketMessage<unknown>[] = []
  const listeners = new Map<string, Set<WebSocketListener<unknown>>>()
  let tokenProvider: (() => Promise<string | null>) | undefined
  let wsBaseUrl = ''
  const options: WebSocketOptions = { ...DEFAULT_OPTIONS }

  // Calculate backoff time for reconnection attempts
  const getBackoffTime = () => {
    const interval = options.reconnectInterval || DEFAULT_OPTIONS.reconnectInterval || 1000
    const max = options.maxReconnectInterval || DEFAULT_OPTIONS.maxReconnectInterval || 30000
    const backoff = Math.min(interval * 1.5 ** reconnectAttempts, max)
    return Math.floor(backoff)
  }

  // Clean up connection resources
  const cleanupConnection = () => {
    if (socket) {
      // Remove all event listeners to prevent memory leaks
      socket.onopen = null
      socket.onclose = null
      socket.onerror = null
      socket.onmessage = null

      // Only try to close if not already closed
      if (socket.readyState !== WebSocket.CLOSED) {
        try {
          socket.close(1000, 'Closing normally')
        } catch (error) {
          console.error('Error closing WebSocket:', error)
        }
      }

      socket = null
    }

    set({ isConnected: false })
  }

  // Clear any scheduled reconnect
  const clearReconnectTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  // Create store API
  return {
    // State
    isConnected: false,
    isConnecting: false,
    lastError: null,
    lastMessage: null,

    // Connect to the WebSocket server
    connect: async (tokenFn) => {
      // Update token provider if provided
      if (tokenFn) {
        tokenProvider = tokenFn
      }

      // Don't connect if we're already connected or connecting
      if (socket?.readyState === WebSocket.OPEN || get().isConnecting) {
        return
      }

      // Set connecting state
      set({ isConnecting: true, lastError: null })

      try {
        // Determine WebSocket URL
        if (!wsBaseUrl) {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
          const apiUrlDomain = import.meta.env.VITE_PUBLIC_API_URL?.split('/')[2] || ''

          if (!apiUrlDomain) {
            throw new Error('VITE_PUBLIC_API_URL is not configured correctly')
          }

          wsBaseUrl = `${protocol}//${apiUrlDomain}`
        }

        // Get authentication token if provider exists
        let wsUrl = wsBaseUrl
        if (tokenProvider) {
          const token = await tokenProvider()
          if (token) {
            wsUrl = `${wsBaseUrl}?token=${token}`
          }
        }

        // Create new WebSocket connection
        socket = new WebSocket(wsUrl)

        // Set up event handlers
        socket.onopen = () => {
          reconnectAttempts = 0 // Reset reconnect counter on successful connection

          // Process any queued messages
          if (messageQueue.length > 0) {
            for (const msg of messageQueue) {
              if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(msg))
              }
            }
            messageQueue.length = 0 // Clear queue
          }

          set({ isConnected: true, isConnecting: false })
        }

        socket.onmessage = (event) => {
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

            const message: WebSocketMessage = {
              type: parsedData.type,
              data: parsedData.data,
              message: typeof parsedData.message === 'string' ? parsedData.message : undefined,
            }

            // Set last message in store
            set({ lastMessage: message })

            // Notify type-specific listeners
            const typeListeners = listeners.get(message.type)
            if (typeListeners) {
              for (const listener of typeListeners) {
                listener(message)
              }
            }

            // Notify global listeners
            const globalListeners = listeners.get('*')
            if (globalListeners) {
              for (const listener of globalListeners) {
                listener(message)
              }
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }

        socket.onclose = (event) => {
          console.warn(`WebSocket closed: Code ${event.code} ${event.reason}`)
          set({ isConnected: false, isConnecting: false })

          const shouldReconnect =
            event.code !== 1000 &&
            options.autoReconnect &&
            (options.reconnectAttempts === undefined ||
              reconnectAttempts < options.reconnectAttempts)

          if (shouldReconnect) {
            // Clear any existing reconnect timer
            clearReconnectTimer()

            const backoffTime = getBackoffTime()
            console.info(
              `Attempting to reconnect in ${backoffTime}ms (attempt ${reconnectAttempts + 1})`
            )

            reconnectTimer = setTimeout(() => {
              reconnectAttempts++
              reconnectTimer = null

              // Only attempt to reconnect if we haven't reached the max attempts
              if (
                options.reconnectAttempts === undefined ||
                reconnectAttempts < options.reconnectAttempts
              ) {
                get().connect()
              } else {
                console.error(`WebSocket reconnection failed after ${reconnectAttempts} attempts`)
                set({
                  lastError: new Error(`Connection failed after ${reconnectAttempts} attempts`),
                })
              }
            }, backoffTime)
          }
        }

        socket.onerror = (event) => {
          console.error('WebSocket error:', event)
          set({
            lastError: new Error('WebSocket connection error'),
            isConnecting: false,
          })
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown connection error'
        console.error('Error establishing WebSocket connection:', errorMsg)

        set({
          isConnecting: false,
          lastError: error instanceof Error ? error : new Error(String(error)),
        })
      }
    },

    // Disconnect from the WebSocket server
    disconnect: () => {
      clearReconnectTimer()
      cleanupConnection()
    },

    // Send a message through the WebSocket
    sendMessage: (message) => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message))
        return true
      }

      // Queue message if socket isn't open
      messageQueue.push(message)

      // Try connecting if not already connected or connecting
      if ((!socket || socket.readyState === WebSocket.CLOSED) && !get().isConnecting) {
        get().connect()
      }

      return false
    },

    // Subscribe to a specific message type or '*' for all messages
    subscribe: (type, listener) => {
      if (!listeners.has(type)) {
        listeners.set(type, new Set())
      }

      listeners.get(type)?.add(listener as WebSocketListener<unknown>)

      // Return unsubscribe function
      return () => {
        const typeListeners = listeners.get(type)
        if (typeListeners) {
          typeListeners.delete(listener as WebSocketListener<unknown>)

          if (typeListeners.size === 0) {
            listeners.delete(type)
          }
        }
      }
    },

    // Force reconnection
    reconnect: () => {
      clearReconnectTimer()
      cleanupConnection()
      reconnectAttempts = 0
      get().connect()
    },

    // Reset the WebSocket store to initial state
    reset: () => {
      clearReconnectTimer()
      cleanupConnection()
      reconnectAttempts = 0
      messageQueue.length = 0
      listeners.clear()

      set({
        isConnected: false,
        isConnecting: false,
        lastError: null,
        lastMessage: null,
      })
    },
  }
})

export { useWebSocketStore }
