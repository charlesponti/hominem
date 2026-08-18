import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { View } from 'react-native';

interface ChatMotionOverlayContextValue {
  /** Mount (or replace) a transient flight node under a stable id. */
  present: (id: string, node: ReactNode) => void;
  /** Unmount the flight node for an id. Safe to call if it's already gone. */
  dismiss: (id: string) => void;
}

const ChatMotionOverlayContext = createContext<ChatMotionOverlayContextValue | null>(null);

/**
 * Owns the single same-screen overlay layer that composer/message flights
 * (toast handoff, printer handoff) render into, mirroring the existing
 * `absolute inset-0` / `pointerEvents="box-none"` pattern already used for
 * `ChatReviewOverlay` in `ChatDetailScreen`. Callers register a flight by id
 * instead of hand-rolling their own absolutely-positioned container, so there
 * is exactly one overlay per chat screen regardless of how many flight kinds
 * exist.
 */
export function ChatMotionOverlayProvider({ children }: { children: ReactNode }) {
  const [flights, setFlights] = useState<Map<string, ReactNode>>(() => new Map());

  const present = useCallback((id: string, node: ReactNode) => {
    setFlights((prev) => {
      const next = new Map(prev);
      next.set(id, node);
      return next;
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setFlights((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ present, dismiss }), [present, dismiss]);

  return (
    <ChatMotionOverlayContext.Provider value={value}>
      {children}
      <View className="absolute inset-0" pointerEvents="box-none" testID="chat-motion-overlay">
        {Array.from(flights, ([id, node]) => (
          <Fragment key={id}>{node}</Fragment>
        ))}
      </View>
    </ChatMotionOverlayContext.Provider>
  );
}

export function useChatMotionOverlay(): ChatMotionOverlayContextValue {
  const context = useContext(ChatMotionOverlayContext);
  if (!context) {
    throw new Error('useChatMotionOverlay must be used within a ChatMotionOverlayProvider');
  }
  return context;
}
