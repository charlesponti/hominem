import * as React from 'react';

import { cn } from '../../lib/utils';

interface OtpCodeInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  error?: string | undefined;
  onComplete?: (value: string) => void;
  maskDelay?: number;
}

interface DigitProps {
  value: string;
  index: number;
  length: number;
  disabled: boolean;
  onChange: (index: number, char: string) => void;
  onKeyDown: (index: number, event: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (event: React.ClipboardEvent<HTMLInputElement>) => void;
  refCallback: (element: HTMLInputElement | null, index: number) => void;
  error?: string | undefined;
  masked: boolean;
}

const Digit = React.memo(function Digit({
  value,
  index,
  length,
  disabled,
  onChange,
  onKeyDown,
  onPaste,
  refCallback,
  error,
  masked,
}: DigitProps) {
  return (
    <input
      ref={(element) => refCallback(element, index)}
      type="text"
      inputMode="numeric"
      maxLength={1}
      value={masked ? '•' : value}
      disabled={disabled}
      onChange={(event) => onChange(index, event.target.value)}
      onKeyDown={(event) => onKeyDown(index, event)}
      onPaste={onPaste}
      className={cn(
        'h-14 w-12 rounded-md border bg-surface text-center body-2 font-semibold text-text-primary transition-all duration-120',
        'focus-visible:outline-none focus-visible:border-border-focus focus-visible:shadow-[0_0_0_2px_var(--color-bg-elevated),0_0_0_4px_var(--color-accent)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error &&
          'border-destructive focus-visible:shadow-[0_0_0_2px_var(--color-bg-elevated),0_0_0_4px_var(--color-destructive)]',
      )}
      aria-label={`Digit ${index + 1} of ${length}`}
      aria-invalid={Boolean(error)}
    />
  );
});

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
}: OtpCodeInputProps) {
  const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);
  const maskTimersRef = React.useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const [maskedIndices, setMaskedIndices] = React.useState<Set<number>>(new Set());

  const inputValues = React.useMemo(() => {
    const characters = value.split('').slice(0, length);
    const values = Array.from({ length }, () => '');

    for (const [index, character] of characters.entries()) {
      values[index] = character;
    }

    return values;
  }, [length, value]);

  React.useEffect(() => {
    if (value) {
      return;
    }

    for (const timer of Object.values(maskTimersRef.current)) {
      clearTimeout(timer);
    }

    maskTimersRef.current = {};
    setMaskedIndices(new Set());
  }, [value]);

  React.useEffect(() => {
    if (autoFocus) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  const handleChange = React.useCallback(
    (index: number, rawValue: string) => {
      const character = rawValue.replace(/\D/g, '').slice(-1);
      const nextValue = inputValues.map((currentValue, currentIndex) =>
        currentIndex === index ? character : currentValue,
      );
      const joinedValue = nextValue.join('');

      onChange(joinedValue);

      if (!character) {
        setMaskedIndices((current) => {
          const next = new Set(current);
          next.delete(index);
          return next;
        });
        return;
      }

      const currentTimer = maskTimersRef.current[index];
      if (currentTimer) {
        clearTimeout(currentTimer);
      }

      setMaskedIndices((current) => {
        const next = new Set(current);
        next.delete(index);
        return next;
      });

      maskTimersRef.current[index] = setTimeout(() => {
        setMaskedIndices((current) => new Set(current).add(index));
      }, maskDelay);

      inputRefs.current[index + 1]?.focus();

      if (joinedValue.length === length) {
        onComplete?.(joinedValue);
      }
    },
    [inputValues, length, maskDelay, onChange, onComplete],
  );

  const handleKeyDown = React.useCallback(
    (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Backspace' && !inputValues[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [inputValues],
  );

  const handlePaste = React.useCallback(
    (event: React.ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();

      const pastedValue = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
      if (!pastedValue) {
        return;
      }

      const nextValue = Array.from({ length }, (_, index) => pastedValue[index] ?? '').join('');
      onChange(nextValue);

      setMaskedIndices(new Set());

      for (const [index, character] of pastedValue.split('').entries()) {
        const currentTimer = maskTimersRef.current[index];
        if (currentTimer) {
          clearTimeout(currentTimer);
        }

        if (!character) {
          continue;
        }

        maskTimersRef.current[index] = setTimeout(() => {
          setMaskedIndices((current) => new Set(current).add(index));
        }, maskDelay);
      }

      inputRefs.current[Math.min(pastedValue.length, length) - 1]?.focus();

      if (pastedValue.length === length) {
        onComplete?.(nextValue);
      }
    },
    [length, maskDelay, onChange, onComplete],
  );

  return (
    <fieldset className={cn('w-full', className)}>
      <legend className="sr-only">Enter one-time code</legend>
      <div className="flex justify-center gap-2">
        {inputValues.map((digit, index) => (
          <Digit
            key={index}
            value={digit}
            index={index}
            length={length}
            disabled={disabled}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            refCallback={(element, currentIndex) => {
              inputRefs.current[currentIndex] = element;
            }}
            error={error}
            masked={maskedIndices.has(index)}
          />
        ))}
      </div>
    </fieldset>
  );
}
