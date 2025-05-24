'use client'

import { Search as SearchIcon } from 'lucide-react'
import { forwardRef, useCallback, useEffect, useState } from 'react'
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

    // Effect 1: Sync external 'value' prop changes to internal state
    useEffect(() => {
      // When the external 'value' prop changes, update internal states
      // to reflect this authoritative value.
      setInputValue(value)
      setDebouncedValue(value)
      // Since this is an external update, it's not a "debouncing" state.
      setIsDebouncing(false)
    }, [value]) // Only depends on the external 'value' prop

    // Effect 2: Debounce 'inputValue' (typically from user typing)
    useEffect(() => {
      // If inputValue is already the same as debouncedValue, it means:
      // a) They were just synced by the effect above (due to prop change).
      // b) A previous debounce for this inputValue just completed.
      // In either case, no new debounce timer is needed for the current inputValue.
      if (inputValue === debouncedValue) {
        return
      }

      // inputValue has changed (likely by user) and is different from debouncedValue.
      // Start debouncing.
      setIsDebouncing(true)

      const timer = setTimeout(() => {
        setDebouncedValue(inputValue) // Propagate the debounced value
        setIsDebouncing(false)      // Debouncing finished for this value
      }, debounceMs)

      return () => {
        clearTimeout(timer) // Clean up timer if inputValue changes again or component unmounts
      }
    }, [inputValue, debouncedValue, debounceMs]) // Dependencies for debouncing logic

    // Effect 3: Notify parent of actual changes to debouncedValue
    useEffect(() => {
      // Only notify the parent if the debouncedValue is different from the current 'value' prop.
      // This prevents redundant calls if the parent's state is already in sync.
      if (debouncedValue !== value) {
        onSearchChange(debouncedValue)
      }
    }, [debouncedValue, onSearchChange, value]) // Ensure all dependencies are listed

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value)
    }, [])

    return (
      <div className={`relative ${className}`}>
        <SearchIcon
          className={`absolute left-2 top-2.5 h-4 w-4 text-muted-foreground ${
            isDebouncing ? 'animate-pulse' : ''
          }`}
        />
        <Input
          ref={ref}
          placeholder={placeholder}
          className="pl-8"
          value={inputValue} // Controlled by internal inputValue
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