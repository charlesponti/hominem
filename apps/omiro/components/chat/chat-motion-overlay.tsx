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
  /**
   * Synchronously mark an id as in-flight, ahead of `present`. The caller
   * that starts a flight (e.g. the composer toast handoff) needs the
   * about-to-be-mounted transcript row to see `isInFlight` as true on its
   * very first render -- but the flight's visual node can only be presented
   * after an async measurement (a UI-thread round trip via Reanimated's
   * `measure`), which is slower than the synchronous optimistic-message
   * mount that follows in the same call stack. Reserving up front closes
   * that race; `present`/`dismiss` still own the actual overlay node.
   */
  reserve: (id: string) => void;
  /** Undo a `reserve` that never resulted in a `present` (e.g. a measurement failure). */
  release: (id: string) => void;
  /** Mount (or replace) a transient flight node under a stable id. */
  present: (id: string, node: ReactNode) => void;
  /** Unmount the flight node for an id. Safe to call if it's already gone. */
  dismiss: (id: string) => void;
  /** Whether a flight is currently registered (reserved or presented) for an id. */
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
  reserve: () => {},
  release: () => {},
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
  // Read directly (not via state) so a reservation made moments ago in the
  // same synchronous call stack is visible immediately -- see `reserve`'s
  // doc comment for why that matters.
  const reservedIdsRef = useRef<Set<string>>(new Set());

  const reserve = useCallback((id: string) => {
    reservedIdsRef.current.add(id);
  }, []);

  const release = useCallback((id: string) => {
    reservedIdsRef.current.delete(id);
  }, []);

  const present = useCallback((id: string, node: ReactNode) => {
    reservedIdsRef.current.add(id);
    setFlights((prev) => {
      const next = new Map(prev);
      next.set(id, node);
      return next;
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    reservedIdsRef.current.delete(id);
    setFlights((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const isInFlight = useCallback((id: string) => reservedIdsRef.current.has(id), []);

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
    () => ({ reserve, release, present, dismiss, isInFlight, toLocalRect }),
    [reserve, release, present, dismiss, isInFlight, toLocalRect],
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
