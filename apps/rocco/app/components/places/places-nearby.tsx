import { List } from '@hominem/ui/list';
import { Loading } from '@hominem/ui/loading';
import { MapPin } from 'lucide-react';
import { href } from 'react-router';

import { useGeolocation } from '~/hooks/useGeolocation';
import { useNearbyPlaces } from '~/lib/hono';

import PlaceRow from './place-row';

type Props = {
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
};

// Default location: San Francisco (fallback)
const DEFAULT_LOCATION = {
  latitude: 37.7749,
  longitude: -122.4194,
};

const formatDistance = (distance: { km: number; miles: number }) => {
  if (distance.km < 1) {
    return `${Math.round(distance.km * 1000)}m`;
  }
  return `${distance.km.toFixed(1)}km`;
};

export default function PlacesNearby({
  latitude: providedLatitude,
  longitude: providedLongitude,
  radiusMeters = 5000,
}: Props) {
  // Get user's current location from cached hook (only if not provided via props)
  const { currentLocation } = useGeolocation({
    enabled: providedLatitude === undefined && providedLongitude === undefined,
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 300000, // Cache location for 5 minutes
  });

  // Use provided coordinates, or user's geolocation, or fall back to default
  const location =
    providedLatitude !== undefined && providedLongitude !== undefined
      ? { latitude: providedLatitude, longitude: providedLongitude }
      : currentLocation || DEFAULT_LOCATION;
  const {
    data: placesResult,
    isLoading,
    error,
  } = useNearbyPlaces(location.latitude, location.longitude, radiusMeters);
  
  const places = placesResult ?? [];
  const title = <h2 className="heading-2">Nearby</h2>;
  const radiusKm = (radiusMeters ?? 5000) / 1000;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {title}
        <div className="flex items-center justify-center h-40">
          <Loading size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        {title}
        <div className="text-center py-8">
          <p className="text-red-600">Error loading nearby places: {error.message}</p>
        </div>
      </div>
    );
  }

  if (places.length === 0) {
    return (
      <div className="space-y-4">
        {title}
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
          <MapPin className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-gray-600">
            No places from your lists found within {radiusKm}km of this location
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">{title}</div>

      <List>
        {places.map((place: (typeof places)[0]) => {
          return (
            <PlaceRow
              key={place.id}
              name={place.name}
              href={href('/places/:id', { id: place.id })}
              photoUrl={null}
              imageUrl={place.imageUrl}
              meta={
                <div className="flex gap-1 items-center text-xs text-muted-foreground">
                  <span>{formatDistance(place.distance)}</span>
                  <MapPin size={10} />
                </div>
              }
              subtitle={
                place.lists.length > 0
                  ? place.lists.length === 1
                    ? place.lists[0]!.name
                    : `${place.lists.length} lists`
                  : null
              }
            />
          );
        })}
      </List>
    </div>
  );
}
