import { useCallback, useEffect, useRef, useState } from 'react';

interface UseMaskedInputOptions {
  maskDelay?: number;
}

/**
 * Hook for masking individual character inputs (OTP, passwords, sensitive fields)
 *
 * @param options - Configuration for masking delay (default 300ms)
 * @returns Object with masked indices set and methods to manage masking
 *
 * @example
 * const { maskedIndices, maskIndex, clearMasks } = useMaskedInput({ maskDelay: 500 });
 *
 * return (
 *   <input
 *     value={maskedIndices.has(0) ? '•' : digit}
 *     onChange={(e) => {
 *       setDigit(e.target.value);
 *       maskIndex(0); // Mask after 500ms
 *     }}
 *   />
 * );
 */
export function useMaskedInput(options?: UseMaskedInputOptions) {
  const { maskDelay = 300 } = options || {};
  const [maskedIndices, setMaskedIndices] = useState<Set<number>>(new Set());
  const maskTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const maskIndex = useCallback(
    (index: number) => {
      // Clear any existing timer for this index
      if (maskTimersRef.current[index]) {
        clearTimeout(maskTimersRef.current[index]);
      }

      // Schedule masking
      maskTimersRef.current[index] = setTimeout(() => {
        setMaskedIndices((prev) => new Set([...prev, index]));
        delete maskTimersRef.current[index];
      }, maskDelay);
    },
    [maskDelay],
  );

  const clearMasks = useCallback(() => {
    // Clear all pending timers
    Object.values(maskTimersRef.current).forEach(clearTimeout);
    maskTimersRef.current = {};
    // Reset masked indices
    setMaskedIndices(new Set());
  }, []);

  const unmaskIndex = useCallback((index: number) => {
    setMaskedIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(maskTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  return {
    maskedIndices,
    maskIndex,
    clearMasks,
    unmaskIndex,
  };
}
