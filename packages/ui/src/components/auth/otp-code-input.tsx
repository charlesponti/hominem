import { useRef, useEffect, useState, useCallback } from 'react';

interface OtpCodeInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export function OtpCodeInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  autoFocus = true,
  className,
}: OtpCodeInputProps) {
  const [inputValues, setInputValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const chars = value.split('').slice(0, length);
    const newInputs = Array(length).fill('');
    chars.forEach((char, i) => {
      newInputs[i] = char;
    });
    setInputValues(newInputs);
  }, [value, length]);

  const handleChange = useCallback(
    (index: number, char: string) => {
      if (!/^\d*$/.test(char)) return;

      const newValues = [...inputValues];
      newValues[index] = char;
      setInputValues(newValues);

      const newValue = newValues.join('');
      onChange(newValue);

      if (char && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [inputValues, length, onChange],
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
      const newValues = Array(length).fill('');
      paste.split('').forEach((char, i) => {
        newValues[i] = char;
      });
      setInputValues(newValues);
      onChange(newValues.join(''));
      if (paste.length > 0) {
        const focusIndex = Math.min(paste.length, length - 1);
        inputRefs.current[focusIndex]?.focus();
      }
    },
    [length, onChange],
  );

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  return (
    <div className={`flex gap-2 justify-center ${className ?? ''}`} onPaste={handlePaste}>
      {inputValues.map((val, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={val}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className={`
            flex-1 min-h-14 text-center text-xl font-bold
            bg-bg-surface border border-default rounded-xl
            focus:border-focus focus:outline-none focus-ring
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          `}
          aria-label={`Digit ${index + 1} of ${length}`}
        />
      ))}
    </div>
  );
}
