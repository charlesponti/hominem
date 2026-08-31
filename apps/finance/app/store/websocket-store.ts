import { create } from 'zustand';

export type WebSocketMessage<T = unknown> = {
  type: string;
  data?: T;
  message?: string;
};

type WebSocketOptions = {
  autoReconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  maxReconnectInterval?: number;
};

type WebSocketListener<T = unknown> = (message: WebSocketMessage<T>) => void;

type WebSocketStore = {
  isConnected: boolean;
  isConnecting: boolean;
  lastError: Error | null;
  lastMessage: WebSocketMessage<unknown> | null;

  connect: (tokenFn?: () => Promise<string | null>) => Promise<void>;
  disconnect: () => void;
  sendMessage: <T>(message: WebSocketMessage<T>) => boolean;
  subscribe: <T = unknown>(type: string, listener: WebSocketListener<T>) => () => void;
  reconnect: () => void;
  reset: () => void;
};

const DEFAULT_OPTIONS: WebSocketOptions = {
  autoReconnect: true,
  reconnectAttempts: 10,
  reconnectInterval: 1000,
  maxReconnectInterval: 30000,
};

const useWebSocketStore = create<WebSocketStore>((set, get) => {
  let socket: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  const messageQueue: WebSocketMessage<unknown>[] = [];
  // `never` here (not `unknown`) so any WebSocketListener<T> can go in this map without a cast
  const listeners = new Map<string, Set<WebSocketListener<never>>>();
  let tokenProvider: (() => Promise<string | null>) | undefined;
  let wsBaseUrl = '';
  const options: WebSocketOptions = { ...DEFAULT_OPTIONS };

  const getBackoffTime = () => {
    const interval = options.reconnectInterval || DEFAULT_OPTIONS.reconnectInterval || 1000;
    const max = options.maxReconnectInterval || DEFAULT_OPTIONS.maxReconnectInterval || 30000;
    const backoff = Math.min(interval * 1.5 ** reconnectAttempts, max);
    return Math.floor(backoff);
  };

  const cleanupConnection = () => {
    if (socket) {
      // null out the handlers so we don't leak listeners on the old socket
      socket.onopen = null;
      socket.onclose = null;
      socket.onerror = null;
      socket.onmessage = null;

      if (socket.readyState !== WebSocket.CLOSED) {
        try {
          socket.close(1000, 'Closing normally');
        } catch (error) {
          console.error('Error closing WebSocket:', error);
        }
      }

      socket = null;
    }

    set({ isConnected: false });
  };

  const clearReconnectTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  return {
    isConnected: false,
    isConnecting: false,
    lastError: null,
    lastMessage: null,

    connect: async (tokenFn) => {
      if (tokenFn) {
        tokenProvider = tokenFn;
      }

      if (socket?.readyState === WebSocket.OPEN || get().isConnecting) {
        return;
      }

      set({ isConnecting: true, lastError: null });

      try {
        if (!wsBaseUrl) {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const apiUrlDomain = import.meta.env.VITE_PUBLIC_API_URL?.split('/')[2] || '';

          if (!apiUrlDomain) {
            throw new Error('VITE_PUBLIC_API_URL is not configured correctly');
          }

          wsBaseUrl = `${protocol}//${apiUrlDomain}`;
        }

        // the browser session cookie handles auth on the upgrade - tokenProvider stays for
        // API compatibility, but we never put credentials in the URL
        if (tokenProvider) await tokenProvider();
        const wsUrl = `${wsBaseUrl}/api/finance/import/ws`;

        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          reconnectAttempts = 0;

          if (messageQueue.length > 0) {
            for (const msg of messageQueue) {
              if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(msg));
              }
            }
            messageQueue.length = 0;
          }

          set({ isConnected: true, isConnecting: false });
        };

        socket.onmessage = (event) => {
          try {
            const parsedData = JSON.parse(event.data);

            if (
              typeof parsedData !== 'object' ||
              parsedData === null ||
              typeof parsedData.type !== 'string'
            ) {
              console.error('Received invalid WebSocket message structure');
              return;
            }

            const message: WebSocketMessage = {
              type: parsedData.type,
              data: parsedData.data,
              message: typeof parsedData.message === 'string' ? parsedData.message : undefined,
            };

            set({ lastMessage: message });

            // listeners are stored type-erased, so this is where we cross back to
            // whatever shape the original subscriber actually asked for
            const erasedMessage = message as WebSocketMessage<never>;

            const typeListeners = listeners.get(message.type);
            if (typeListeners) {
              for (const listener of typeListeners) {
                listener(erasedMessage);
              }
            }

            const globalListeners = listeners.get('*');
            if (globalListeners) {
              for (const listener of globalListeners) {
                listener(erasedMessage);
              }
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        socket.onclose = (event) => {
          console.warn(`WebSocket closed: Code ${event.code} ${event.reason}`);
          set({ isConnected: false, isConnecting: false });

          const shouldReconnect =
            event.code !== 1000 &&
            options.autoReconnect &&
            (options.reconnectAttempts === undefined ||
              reconnectAttempts < options.reconnectAttempts);

          if (shouldReconnect) {
            clearReconnectTimer();

            const backoffTime = getBackoffTime();
            console.info(
              `Attempting to reconnect in ${backoffTime}ms (attempt ${reconnectAttempts + 1})`,
            );

            reconnectTimer = setTimeout(() => {
              reconnectAttempts++;
              reconnectTimer = null;

              if (
                options.reconnectAttempts === undefined ||
                reconnectAttempts < options.reconnectAttempts
              ) {
                get().connect();
              } else {
                console.error(`WebSocket reconnection failed after ${reconnectAttempts} attempts`);
                set({
                  lastError: new Error(`Connection failed after ${reconnectAttempts} attempts`),
                });
              }
            }, backoffTime);
          }
        };

        socket.onerror = (event) => {
          console.error('WebSocket error:', event);
          set({
            lastError: new Error('WebSocket connection error'),
            isConnecting: false,
          });
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown connection error';
        console.error('Error establishing WebSocket connection:', errorMsg);

        set({
          isConnecting: false,
          lastError: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },

    disconnect: () => {
      clearReconnectTimer();
      cleanupConnection();
    },

    sendMessage: (message) => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
        return true;
      }

      messageQueue.push(message);

      if ((!socket || socket.readyState === WebSocket.CLOSED) && !get().isConnecting) {
        get().connect();
      }

      return false;
    },

    // pass '*' as the type to listen to every message
    subscribe: (type, listener) => {
      if (!listeners.has(type)) {
        listeners.set(type, new Set());
      }

      listeners.get(type)?.add(listener);

      return () => {
        const typeListeners = listeners.get(type);
        if (typeListeners) {
          typeListeners.delete(listener);

          if (typeListeners.size === 0) {
            listeners.delete(type);
          }
        }
      };
    },

    reconnect: () => {
      clearReconnectTimer();
      cleanupConnection();
      reconnectAttempts = 0;
      get().connect();
    },

    reset: () => {
      clearReconnectTimer();
      cleanupConnection();
      reconnectAttempts = 0;
      messageQueue.length = 0;
      listeners.clear();

      set({
        isConnected: false,
        isConnecting: false,
        lastError: null,
        lastMessage: null,
      });
    },
  };
});

export { useWebSocketStore };
