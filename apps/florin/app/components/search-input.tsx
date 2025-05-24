'use client'

import { Search as SearchIcon } from 'lucide-react'
import { forwardRef, useCallback, useEffect, useState } from 'react'
import { Input } from './ui/input'

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

    // Sync external value changes (e.g., when clearing from parent)
    useEffect(() => {
      if (value !== inputValue) {
        setInputValue(value)
        setDebouncedValue(value)
      }
    }, [value, inputValue])

    // Debounce search input
    useEffect(() => {
      if (inputValue !== debouncedValue) {
        setIsDebouncing(true)
      }

      const timer = setTimeout(() => {
        setDebouncedValue(inputValue)
        setIsDebouncing(false)
      }, debounceMs)

      return () => clearTimeout(timer)
    }, [inputValue, debouncedValue, debounceMs])

    // Notify parent of debounced changes
    useEffect(() => {
      onSearchChange(debouncedValue)
    }, [debouncedValue, onSearchChange])

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
