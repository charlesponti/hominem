import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

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
    <View className="gap-2">
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
        <View className="flex-row items-center gap-2 px-1">
          <ActivityIndicator size="small" />
          <Text className="text-muted-foreground text-footnote">Searching…</Text>
        </View>
      ) : null}
      {suggestions.length > 0 ? (
        <View className="gap-1">
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              accessibilityLabel={`Use location ${suggestion}`}
              className="flex-row items-center gap-2 rounded-2xl bg-card px-3 py-2.5"
              onPress={() => {
                setQuery(suggestion);
                onChange(suggestion);
                setSuggestions([]);
              }}
              style={({ pressed }) => pressed && { opacity: 0.7 }}
              testID="time-block-location-suggestion"
            >
              <AppIcon name="mappin.and.ellipse" size={16} />
              <Text className="text-body flex-1">{suggestion}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
