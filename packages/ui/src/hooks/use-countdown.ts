import { useEffect, useRef, useState } from 'react';

interface UseCountdownOptions {
  onComplete?: () => void;
  onTick?: (remaining: number) => void;
}

/**
 * Hook for managing countdown timers (resend codes, rate limits, etc.)
 *
 * @param initialSeconds - Initial countdown duration in seconds
 * @param options - Optional callbacks for completion and tick events
 * @returns Object with current seconds, active state, and control methods
 *
 * @example
 * const { seconds, isActive, start, reset } = useCountdown(30, {
 *   onComplete: () => console.log('Code can be resent'),
 * });
 *
 * return (
 *   <div>
 *     {isActive && <p>Resend code in {seconds}s</p>}
 *     {!isActive && <button onClick={start}>Resend</button>}
 *   </div>
 * );
 */
export function useCountdown(
  initialSeconds: number,
  options?: UseCountdownOptions,
): {
  seconds: number;
  isActive: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
} {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (!isActive) return;

    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        const next = prev - 1;
        options?.onTick?.(next);

        if (next <= 0) {
          setIsActive(false);
          options?.onComplete?.();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive]);

  return {
    seconds,
    isActive,
    start: () => setIsActive(true),
    stop: () => setIsActive(false),
    reset: () => {
      setSeconds(initialSeconds);
      setIsActive(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    },
  };
}
