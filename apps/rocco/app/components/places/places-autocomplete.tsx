import { Alert } from '@hominem/ui';
import { Input } from '@hominem/ui/input';
import { Check, MapPin, Search } from 'lucide-react';
import { memo, useCallback, useEffect, useId, useRef, useState } from 'react';

import { useGeolocation } from '~/hooks/useGeolocation';
import {
  type GooglePlacePrediction,
  useGooglePlacesAutocomplete,
} from '~/hooks/useGooglePlacesAutocomplete';
import { cn } from '~/lib/utils';

import styles from './places-autocomplete.module.css';

function PlacesAutocomplete({
  setSelected,
}: {
  setSelected: (place: GooglePlacePrediction) => void;
}) {
  const [value, setValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<HTMLButtonElement[]>([]);
  const sessionTokenRef = useRef<string>(crypto.randomUUID());
  const listboxId = useId();
  const statusId = useId();
  const DEBOUNCE_TIME_MS = 200;
  const MIN_QUERY_LENGTH = 2;
  const [debouncedValue, setDebouncedValue] = useState('');
  const { currentLocation } = useGeolocation();

  const onValueChange = useCallback((newValue: string) => {
    const trimmed = newValue;
    setValue(trimmed);
    setSelectedIndex(-1);
    setIsOpen(trimmed.trim().length >= MIN_QUERY_LENGTH);
    setIsDebouncing(true);

    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
    }
    const id = setTimeout(() => {
      setDebouncedValue(trimmed);
      setIsDebouncing(false);
    }, DEBOUNCE_TIME_MS);
    timeoutId.current = id;
  }, []);

  const {
    data: result,
    error,
    isLoading,
  } = useGooglePlacesAutocomplete({
    input: debouncedValue,
    location: currentLocation ?? undefined,
    radiusMeters: 50_000,
    sessionToken: sessionTokenRef.current,
  });

  const data = result ?? [];

  const hasQuery = debouncedValue.trim().length >= MIN_QUERY_LENGTH;
  const hasResults = data && data.length > 0;
  const status: 'idle' | 'debouncing' | 'loading' | 'results' | 'empty' | 'error' =
    error
      ? 'error'
      : isDebouncing
        ? 'debouncing'
        : isLoading
          ? 'loading'
          : hasQuery
            ? hasResults
              ? 'results'
              : 'empty'
            : 'idle';

  const activeOptionId = selectedIndex >= 0 ? `${listboxId}-option-${selectedIndex}` : undefined;

  const handleSelect = useCallback(
    (place: GooglePlacePrediction) => {
      setValue(`${place.text}, ${place.address}`);
      setSelected(place);
      setIsOpen(false);
      setSelectedIndex(-1);
      setDebouncedValue(`${place.text}, ${place.address}`);
      sessionTokenRef.current = crypto.randomUUID();
      inputRef.current?.blur();
    },
    [setSelected],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!(isOpen && data && data.length > 0)) {
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev < data.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : data.length - 1));
          break;
        case 'Home':
          e.preventDefault();
          setSelectedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setSelectedIndex(data.length - 1);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && data[selectedIndex]) {
            handleSelect(data[selectedIndex]);
          }
          break;
        case 'Tab':
          if (isOpen && selectedIndex >= 0 && data[selectedIndex]) {
            handleSelect(data[selectedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSelectedIndex(-1);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, data, selectedIndex, handleSelect],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId.current) {
        clearTimeout(timeoutId.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen || selectedIndex < 0) return;
    const active = optionRefs.current[selectedIndex];
    active?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, selectedIndex]);

  useEffect(() => {
    optionRefs.current = [];
  }, [data]);

  return (
    <div data-testid="places-autocomplete" className="relative w-full">
      {/* Input Field */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search for places..."
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => value.trim().length >= MIN_QUERY_LENGTH && setIsOpen(true)}
          className="pl-10 pr-4"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          aria-describedby={status !== 'idle' ? statusId : undefined}
          data-testid="places-autocomplete-input"
        />
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute z-50 w-full mt-1 max-h-60 overflow-y-auto',
            styles.panel,
          )}
          role="listbox"
          id={listboxId}
          data-testid="places-autocomplete-results"
        >
          {status === 'loading' && <PlacesAutocompleteLoading show={!!value} />}

          {status === 'results' && (
            <div className="py-1">
              {data.map((suggestion: any, index: number) => (
                <button
                  key={suggestion.place_id}
                  type="button"
                  onClick={() => handleSelect(suggestion)}
                  className={cn(
                    'flex items-center px-3 py-2 w-full text-left overflow-x-hidden',
                    'focus:outline-none',
                    styles.option,
                  )}
                  role="button"
                  aria-selected={selectedIndex === index}
                  id={`${listboxId}-option-${index}`}
                  tabIndex={-1}
                  ref={(node) => {
                    if (node) optionRefs.current[index] = node;
                  }}
                  data-testid="places-autocomplete-option"
                >
                  <MapPin className="size-4 text-muted-foreground mr-3 shrink-0" />
                  <div className="flex flex-col truncate flex-1">
                    <span className="font-medium text-sm text-foreground">{suggestion.text}</span>
                    <span className="text-muted-foreground font-light text-xs">
                      {suggestion.address}
                    </span>
                  </div>
                  {selectedIndex === index && <Check className="ml-auto size-4 text-primary" />}
                </button>
              ))}
            </div>
          )}

          {status === 'empty' && (
            <div className={styles.status} id={statusId} aria-live="polite">
              NO MATCHES FOR “{debouncedValue.trim()}”
            </div>
          )}

          {status === 'error' && error && (
            <div className={styles.status} id={statusId} aria-live="polite">
              ERROR: {error.message}
            </div>
          )}

          {status === 'loading' && (
            <div className={styles.status} id={statusId} aria-live="polite">
              SCANNING…
            </div>
          )}

          {status === 'debouncing' && (
            <div className={styles.status} id={statusId} aria-live="polite">
              LISTENING…
            </div>
          )}
        </div>
      )}

      {error && <Alert type="error">{error.message}</Alert>}
    </div>
  );
}

const PlacesAutocompleteLoading = (props: React.ComponentProps<'div'> & { show: boolean }) => (
  <div className="py-1" {...props}>
    <LoadingItem />
    <LoadingItem />
    <LoadingItem />
  </div>
);

const LoadingItem = (props: React.ComponentProps<'div'>) => (
  <div className="flex items-center px-3 py-2" {...props}>
    <div className="size-4 border border-border mr-3" />
    <div className="flex flex-col flex-1">
      <div className="w-3/4 h-3 border border-border mb-1" />
      <div className="w-1/2 h-2 border border-border" />
    </div>
  </div>
);

export default memo(PlacesAutocomplete);
