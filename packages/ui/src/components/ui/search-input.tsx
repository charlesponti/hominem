import { forwardRef, useCallback, useRef, useState } from 'react';

import { Input } from './input';

interface SearchInputProps {
  value?: string;
  onSearchChange: (searchTerm: string) => void;
  placeholder?: string;
  debounceMs?: number;
  className?: string;
  disabled?: boolean;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value = '',
      onSearchChange,
      placeholder = 'Search...',
      debounceMs = 500,
      className = '',
      disabled = false,
    },
    ref,
  ) => {
    const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevValueRef = useRef(value);
    const [inputValue, setInputValue] = useState(value);
    const [isDebouncing, setIsDebouncing] = useState(false);

    // Sync external prop changes during render instead of in an effect
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = null;
      }
      setInputValue(value);
      setIsDebouncing(false);
    }

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setIsDebouncing(true);

        if (timerIdRef.current) {
          clearTimeout(timerIdRef.current);
        }

        timerIdRef.current = setTimeout(() => {
          setIsDebouncing(false);
          if (newValue !== value) {
            onSearchChange(newValue);
          }
          timerIdRef.current = null;
        }, debounceMs);
      },
      [value, debounceMs, onSearchChange],
    );

    return (
      <div className={`relative ${className}`}>
        <Input
          ref={ref}
          placeholder={placeholder}
          className="pl-8"
          value={inputValue}
          onChange={handleInputChange}
          disabled={disabled}
        />
        {isDebouncing && (
          <div className="absolute right-2 top-2.5">
            <div className="size-4 border-2 border-foreground/30 border-t-foreground/80 animate-spin" />
          </div>
        )}
      </div>
    );
  },
);

SearchInput.displayName = 'SearchInput';
