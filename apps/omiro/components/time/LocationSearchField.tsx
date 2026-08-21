import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { makeStyles } from '~/components/theme';
import AppIcon from '~/components/ui/icon';
import { TextField } from '~/components/ui/text-field';

const MIN_QUERY_LENGTH = 3;
const SEARCH_DEBOUNCE_MS = 350;
const MAX_SUGGESTIONS = 5;

function formatAddress(address: Location.LocationGeocodedAddress) {
  const streetLine = [address.streetNumber, address.street].filter(Boolean).join(' ');
  const parts = [streetLine || address.name, address.city, address.region].filter(
    (part, index, arr): part is string => Boolean(part) && arr.indexOf(part) === index,
  );
  return parts.join(', ');
}

export function LocationSearchField({
  onChange,
  testID,
  value,
}: {
  onChange: (value: string) => void;
  testID?: string;
  value: string;
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH || trimmed === value) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }
    const thisRequest = ++requestId.current;
    setIsSearching(true);
    const timeout = setTimeout(() => {
      void (async () => {
        try {
          const matches = await Location.geocodeAsync(trimmed);
          const addresses = await Promise.all(
            matches.slice(0, MAX_SUGGESTIONS).map((match) => Location.reverseGeocodeAsync(match)),
          );
          if (requestId.current !== thisRequest) return;
          const labels = addresses
            .map((results) => results[0])
            .filter((address): address is Location.LocationGeocodedAddress => Boolean(address))
            .map(formatAddress)
            .filter((label, index, arr) => label && arr.indexOf(label) === index);
          setSuggestions(labels);
        } catch {
          if (requestId.current === thisRequest) setSuggestions([]);
        } finally {
          if (requestId.current === thisRequest) setIsSearching(false);
        }
      })();
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query, value]);

  return (
    <View style={styles.field}>
      <TextField
        autoFocus
        onChangeText={(next) => {
          setQuery(next);
          onChange(next);
        }}
        placeholder="Add location"
        testID={testID}
        value={query}
      />
      {isSearching ? (
        <View style={styles.searchingState}>
          <ActivityIndicator size="small" />
          <Text style={styles.searchingText}>Searching…</Text>
        </View>
      ) : null}
      {suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              accessibilityLabel={`Use location ${suggestion}`}
              style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.7 }]}
              testID="time-block-location-suggestion"
            >
              <AppIcon name="mappin.and.ellipse" size={16} />
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = makeStyles((theme) => ({
  field: { gap: 8 },
  searchingState: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  searchingText: { ...theme.typography.footnote, color: theme.colors.mutedForeground },
  suggestions: { gap: 4 },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionText: { ...theme.typography.body, flex: 1 },
}));
