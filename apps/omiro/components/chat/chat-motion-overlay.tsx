import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { View } from 'react-native';

import type { MeasuredRect } from '~/services/motion/use-measured-element';

export interface LocalRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ChatMotionOverlayContextValue {
  /** Mount (or replace) a transient flight node under a stable id. */
  present: (id: string, node: ReactNode) => void;
  /** Unmount the flight node for an id. Safe to call if it's already gone. */
  dismiss: (id: string) => void;
  /** Whether a flight is currently registered for an id. */
  isInFlight: (id: string) => boolean;
  /**
   * Convert a page-absolute rect (from `useMeasuredElement`, e.g. the
   * composer's on-screen position) into coordinates local to this overlay,
   * so a flight can be positioned with plain `left`/`top`. Returns `null`
   * until the overlay has measured its own screen origin at least once.
   */
  toLocalRect: (rect: MeasuredRect) => LocalRect | null;
}

// A no-op default rather than `null` + a throwing hook: consumers shared
// across chat and non-chat surfaces (the composer is also used inbox-side,
// with no transcript to hand off to) can call the same hook unconditionally
// and simply get "no flights happen here" instead of a crash.
const noopOverlay: ChatMotionOverlayContextValue = {
  present: () => {},
  dismiss: () => {},
  isInFlight: () => false,
  toLocalRect: () => null,
};

const ChatMotionOverlayContext = createContext<ChatMotionOverlayContextValue>(noopOverlay);

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
  const overlayRef = useRef<View>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);

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

  const isInFlight = useCallback((id: string) => flights.has(id), [flights]);

  const toLocalRect = useCallback((rect: MeasuredRect): LocalRect | null => {
    const origin = originRef.current;
    if (!origin) return null;
    return {
      left: rect.pageX - origin.x,
      top: rect.pageY - origin.y,
      width: rect.width,
      height: rect.height,
    };
  }, []);

  // The overlay's own screen origin rarely changes (rotation, safe-area
  // change), so a one-off bridge measurement on layout is enough -- flights
  // are user-triggered, not gesture-driven, so there is no per-frame cost to
  // avoid here.
  const captureOrigin = useCallback(() => {
    overlayRef.current?.measureInWindow((x, y) => {
      originRef.current = { x, y };
    });
  }, []);

  const value = useMemo(
    () => ({ present, dismiss, isInFlight, toLocalRect }),
    [present, dismiss, isInFlight, toLocalRect],
  );

  return (
    <ChatMotionOverlayContext.Provider value={value}>
      {children}
      <View
        className="absolute inset-0"
        onLayout={captureOrigin}
        pointerEvents="box-none"
        ref={overlayRef}
        testID="chat-motion-overlay"
      >
        {Array.from(flights, ([id, node]) => (
          <Fragment key={id}>{node}</Fragment>
        ))}
      </View>
    </ChatMotionOverlayContext.Provider>
  );
}

export function useChatMotionOverlay(): ChatMotionOverlayContextValue {
  return useContext(ChatMotionOverlayContext);
}
