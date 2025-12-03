import { Check, MapPin, Search } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import Alert from '~/components/alert'
import { Input } from '~/components/ui/input'
import {
  type GooglePlacePrediction,
  useGooglePlacesAutocomplete,
} from '~/hooks/useGooglePlacesAutocomplete'
import { cn } from '~/lib/utils'
import styles from './places-autocomplete.module.css'

function PlacesAutocomplete({
  setSelected,
}: {
  setSelected: (place: GooglePlacePrediction) => void
}) {
  const [value, setValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const DEBOUNCE_TIME_MS = 300 // Reduced for better UX
  const [debouncedValue, setDebouncedValue] = useState('')

  const onValueChange = useCallback((newValue: string) => {
    setValue(newValue)
    setSelectedIndex(-1)
    setIsOpen(newValue.length > 0)

    if (timeoutId.current) {
      clearTimeout(timeoutId.current)
    }
    const id = setTimeout(() => {
      setDebouncedValue(newValue)
    }, DEBOUNCE_TIME_MS)
    timeoutId.current = id
  }, [])

  const { data, error, isLoading } = useGooglePlacesAutocomplete({
    input: debouncedValue,
  })

  const handleSelect = useCallback(
    (place: GooglePlacePrediction) => {
      setValue(`${place.text}, ${place.address}`)
      setSelected(place)
      setIsOpen(false)
      setSelectedIndex(-1)
      inputRef.current?.blur()
    },
    [setSelected]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || !data) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev < data.length - 1 ? prev + 1 : 0))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : data.length - 1))
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && data[selectedIndex]) {
            handleSelect(data[selectedIndex])
          }
          break
        case 'Escape':
          setIsOpen(false)
          setSelectedIndex(-1)
          inputRef.current?.blur()
          break
      }
    },
    [isOpen, data, selectedIndex, handleSelect]
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current)
      }
    }
  }, [])

  return (
    <div data-testid="places-autocomplete" className="relative w-full">
      {/* Input Field */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search for places..."
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length > 0 && setIsOpen(true)}
          className="pl-10 pr-4"
          data-testid="places-autocomplete-input"
        />
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
          data-testid="places-autocomplete-results"
        >
          {isLoading && <PlacesAutocompleteLoading show={!!value} />}

          {!isLoading && data && data.length > 0 && (
            <div className="py-1">
              {data.map((suggestion, index) => (
                <button
                  key={suggestion.place_id}
                  type="button"
                  onClick={() => handleSelect(suggestion)}
                  className={cn(
                    'flex items-center px-3 py-2 cursor-pointer transition-colors w-full text-left overflow-x-hidden',
                    'hover:bg-gray-50 focus:bg-gray-50 focus:outline-none',
                    selectedIndex === index && 'bg-gray-100',
                    styles.autocompleteItem
                  )}
                  data-testid="places-autocomplete-option"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground mr-3 shrink-0" />
                  <div className="flex flex-col truncate flex-1">
                    <span className="font-medium text-sm text-gray-900">{suggestion.text}</span>
                    <span className="text-muted-foreground font-light text-xs">
                      {suggestion.address}
                    </span>
                  </div>
                  {selectedIndex === index && <Check className="ml-auto h-4 w-4 text-primary" />}
                </button>
              ))}
            </div>
          )}

          {value && !isLoading && data && data.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">No results found.</div>
          )}
        </div>
      )}

      {error && <Alert type="error">{error.message}</Alert>}
    </div>
  )
}

const PlacesAutocompleteLoading = (props: React.ComponentProps<'div'> & { show: boolean }) => (
  <div className="py-1" {...props}>
    <LoadingItem />
    <LoadingItem />
    <LoadingItem />
  </div>
)

const LoadingItem = (props: React.ComponentProps<'div'>) => (
  <div className="flex items-center px-3 py-2" {...props}>
    <div className="h-4 w-4 bg-gray-200 rounded mr-3 animate-pulse" />
    <div className="flex flex-col flex-1">
      <div className="w-3/4 h-3 bg-gray-200 rounded mb-1 animate-pulse" />
      <div className="w-1/2 h-2 bg-gray-100 rounded animate-pulse" />
    </div>
  </div>
)

export default memo(PlacesAutocomplete)
