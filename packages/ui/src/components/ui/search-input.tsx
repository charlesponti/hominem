import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { Input } from './input'

interface SearchInputProps {
  value?: string
  onSearchChange: (searchTerm: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
  disabled?: boolean
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
    ref
  ) => {
    const [inputValue, setInputValue] = useState(value)
    const [debouncedValue, setDebouncedValue] = useState(value)
    const [isDebouncing, setIsDebouncing] = useState(false)
    const timerIdRef = useRef<ReturnType<typeof setTimeout> | null>(null) // To store timer ID

    // Effect 1: Sync external 'value' prop changes to internal state
    useEffect(() => {
      // When the external 'value' prop changes, update internal states
      // to reflect this authoritative value.
      setInputValue(value)
      setDebouncedValue(value)
      // Since this is an external update, it's not a "debouncing" state.
      // If a debounce was in progress, this external change supersedes it.
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current)
        timerIdRef.current = null
      }
      setIsDebouncing(false)
    }, [value]) // Only depends on the external 'value' prop

    // Effect 2: Debounce 'inputValue' (typically from user typing) and notify parent
    useEffect(() => {
      // If inputValue is already the same as debouncedValue, it means:
      // a) They were just synced by Effect 1 (due to prop change).
      // b) A previous debounce for this inputValue just completed.
      // In either case, no new debounce timer is needed for the current inputValue.
      if (inputValue === debouncedValue) {
        // If we were debouncing but now they match (e.g. prop sync or debounce completed), ensure spinner is off.
        // This check is mostly for safety; setIsDebouncing(false) should be handled by Effect 1 or the timer callback.
        if (isDebouncing) {
          setIsDebouncing(false)
        }
        return
      }

      // inputValue is different from debouncedValue, so a new debounce cycle is needed.
      // Clear any existing timer because inputValue has changed again.
      if (timerIdRef.current) {
        clearTimeout(timerIdRef.current)
      }

      setIsDebouncing(true) // Indicate that debouncing has started

      timerIdRef.current = setTimeout(() => {
        setDebouncedValue(inputValue) // Update the internal debouncedValue state
        setIsDebouncing(false) // Debouncing finished

        // Notify parent if this new debounced value is different from the current 'value' prop
        if (inputValue !== value) {
          onSearchChange(inputValue)
        }
        timerIdRef.current = null // Clear ref after execution
      }, debounceMs)

      // Cleanup function: clear the timer if the component unmounts or dependencies change
      return () => {
        if (timerIdRef.current) {
          clearTimeout(timerIdRef.current)
          timerIdRef.current = null
        }
      }
      // Dependencies for debouncing and notification logic
    }, [inputValue, debouncedValue, value, debounceMs, onSearchChange, isDebouncing])

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value)
    }, [])

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
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          </div>
        )}
      </div>
    )
  }
)

SearchInput.displayName = 'SearchInput'
