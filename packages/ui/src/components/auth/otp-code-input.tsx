import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { cn } from '../../lib/utils';

interface OtpCodeInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  error?: string | undefined;
  onComplete?: () => void;
  maskDelay?: number;
  success?: boolean;
}

interface DigitProps {
  value: string;
  index: number;
  length: number;
  disabled: boolean;
  onChange: (index: number, char: string) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  refCallback: (el: HTMLInputElement | null, idx: number) => void;
  error?: string | undefined;
  masked?: boolean | undefined;
  success?: boolean | undefined;
}

// memoized single-cell input to avoid unnecessary rerenders
const Digit = /*#__PURE__*/
  React.memo(
    React.forwardRef<HTMLInputElement, DigitProps>(
      ({ value, index, length, disabled, onChange, onKeyDown, refCallback, error, masked, success }, ref) => {
        return (
          <input
            key={index}
            ref={(el) => refCallback(el, index)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={masked ? '•' : value}
            disabled={disabled || success}
            readOnly={success}
            onChange={(e) => onChange(index, e.target.value)}
            onKeyDown={(e) => onKeyDown(index, e)}
            className={cn(
              "w-12 h-14 text-center body-2 font-semibold",
              "bg-bg-surface border",
              "focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--color-bg-elevated),0_0_0_4px_var(--color-accent)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "transition-all duration-120",
              "text-text-primary placeholder-text-tertiary",
              "rounded-md",
              success && "border-accent bg-accent/5",
              !success && !error && "border-border-default focus-visible:border-border-focus",
              error && "border-destructive focus-visible:shadow-[0_0_0_2px_var(--color-bg-elevated),0_0_0_4px_var(--color-destructive)]",
            )}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={!!error}
            aria-busy={success}
          />
        );
      },
    ),
  );

Digit.displayName = 'OtpDigit';

export function OtpCodeInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  autoFocus = true,
  className,
  error,
  onComplete,
  maskDelay = 300,
  success = false,
}: OtpCodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const maskTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const [maskedIndices, setMaskedIndices] = useState<Set<number>>(new Set());

  // Auto-clear on error & refocus
  useEffect(() => {
    if (error && value.length > 0) {
      onChange('');
      setMaskedIndices(new Set());
      // Clear any pending mask timers
      Object.values(maskTimersRef.current).forEach(clearTimeout);
      maskTimersRef.current = {};
      // Refocus first input for immediate retry
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 0);
    }
  }, [error, onChange, value.length]);

  // derive per-cell values from the single value prop; keeps component pure
  const inputValues = useMemo(() => {
    const chars = value.split('').slice(0, length);
    const arr = Array(length).fill('');
    chars.forEach((ch, i) => (arr[i] = ch));
    return arr;
  }, [value, length]);

  // clear masks when value changes externally (e.g., error clears input)
  useEffect(() => {
    if (!value) {
      Object.values(maskTimersRef.current).forEach(clearTimeout);
      maskTimersRef.current = {};
      setMaskedIndices(new Set());
    }
  }, [value]);

  const handleChange = useCallback(
    (index: number, char: string) => {
      if (!/^\d*$/.test(char)) return;
      if (char && value.length >= length) return; // prevent overflow

      const newChars = [...inputValues];
      newChars[index] = char;
      const newValue = newChars.join('');
      onChange(newValue);

      // mask after delay
      if (char) {
        if (maskTimersRef.current[index]) clearTimeout(maskTimersRef.current[index]);
        maskTimersRef.current[index] = setTimeout(() => {
          setMaskedIndices((prev) => new Set([...prev, index]));
        }, maskDelay);
      }

      // auto-focus next
      if (char && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // callback when complete
      if (newValue.length === length && onComplete) {
        onComplete();
      }
    },
    [value, length, onChange, onComplete, maskDelay, inputValues],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !inputValues[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [inputValues],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
      const arr = Array(length).fill('');
      paste.split('').forEach((ch, i) => (arr[i] = ch));
      const newValue = arr.join('');
      onChange(newValue);
      if (paste.length > 0) {
        const focusIndex = Math.min(paste.length, length - 1);
        inputRefs.current[focusIndex]?.focus();
      }
      // Auto-submit if paste fills all digits
      if (paste.length === length && onComplete) {
        setTimeout(() => onComplete(), 0);
      }
    },
    [length, onChange, onComplete],
  );

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  // design system: dark mode, connected container with semantic tokens
  return (
    <fieldset className={cn('w-full', className ?? '')} onPaste={handlePaste} disabled={disabled}>
      <legend className="sr-only">Enter one-time code</legend>
      <div className="space-y-2">
        <div className="flex justify-center gap-2">
          {inputValues.map((val, index) => (
            <Digit
              key={index}
              value={val}
              index={index}
              length={length}
              disabled={disabled}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              refCallback={(el, i) => {
                inputRefs.current[i] = el;
              }}
              error={error}
              masked={maskedIndices.has(index)}
              success={success}
            />
          ))}
        </div>
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
      </div>
    </fieldset>
  );
}
