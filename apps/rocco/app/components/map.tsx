import { Alert } from '@hominem/ui';
import { Loading } from '@hominem/ui/loading';
import {
  AdvancedMarker,
  APIProvider,
  Map as GoogleMap,
  InfoWindow,
  type MapEvent,
  type MapMouseEvent,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import type { Place, PlaceLocation } from '~/lib/types';

import { useMapInteraction } from '~/contexts/map-interaction-context';
import { endTrace, startTrace } from '~/lib/performance/trace';
import { cn } from '~/lib/utils';

import styles from './map.module.css';

// Default center (San Francisco) when no places or location available
const DEFAULT_CENTER: PlaceLocation = {
  latitude: 37.7749,
  longitude: -122.4194,
};

export type RoccoMapProps = {
  isLoadingCurrentLocation: boolean;
  currentLocation?: PlaceLocation | null;
  setSelected?: (place: Place | null) => void;
  zoom: number;
  center?: PlaceLocation;
  markers: PlaceLocation[];
  onMapClick?: (event: MapMouseEvent) => void;
  onMarkerClick?: () => void;
  mapId?: string;
};

const MapUpdater = ({
  center,
  markers,
  zoom,
  enabled,
}: {
  center: { lat: number; lng: number };
  markers: PlaceLocation[];
  zoom: number;
  enabled: boolean;
}) => {
  const map = useMap();
  const coreLibrary = useMapsLibrary('core');

  useEffect(() => {
    if (!(map && enabled)) {
      return;
    }

    // If we have multiple markers, fit bounds
    if (markers.length > 1 && coreLibrary?.LatLngBounds) {
      const bounds = new coreLibrary.LatLngBounds();
      let hasValidMarker = false;

      markers.forEach((marker) => {
        if (marker.latitude && marker.longitude) {
          bounds.extend({ lat: marker.latitude, lng: marker.longitude });
          hasValidMarker = true;
        }
      });

      if (hasValidMarker) {
        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
      }
    } else if (markers.length === 1) {
      const singleMarker = markers[0];
      if (singleMarker?.latitude && singleMarker?.longitude) {
        // If we have exactly one marker, center on it
        map.setCenter({ lat: singleMarker.latitude, lng: singleMarker.longitude });
        map.setZoom(zoom);
      }
    } else {
      // Otherwise use the provided center
      map.setCenter(center);
      map.setZoom(zoom);
    }
  }, [map, coreLibrary, markers, center, zoom, enabled]);

  return null;
};

// Memoized marker component to prevent unnecessary re-renders
const MapMarker = memo(
  ({
    marker,
    isHovered,
    isSelected,
    onClick,
  }: {
    marker: PlaceLocation;
    isHovered: boolean;
    isSelected: boolean;
    onClick: () => void;
  }) => {
    // Memoize position object to avoid recreation
    const position = useMemo(
      () => ({
        lat: marker.latitude,
        lng: marker.longitude,
      }),
      [marker.latitude, marker.longitude],
    );

    // Memoize style object based on hover/selected state
    const markerStyle = useMemo(
      () => ({
        width: isHovered || isSelected ? '32px' : '24px',
        height: isHovered || isSelected ? '32px' : '24px',
        backgroundColor: isHovered || isSelected ? '#ef4444' : '#dc2626',
        border: '2px solid white',
        cursor: 'pointer' as const,
      }),
      [isHovered, isSelected],
    );

    return (
      <AdvancedMarker
        position={position}
        onClick={onClick}
        collisionBehavior={
          isHovered || isSelected ? 'REQUIRED' : 'OPTIONAL_AND_HIDES_LOWER_PRIORITY'
        }
      >
        <div style={markerStyle} className="void-anim-breezy" />
      </AdvancedMarker>
    );
  },
);

MapMarker.displayName = 'MapMarker';

const RoccoMap = ({
  zoom,
  center,
  isLoadingCurrentLocation,
  currentLocation,
  onMapClick,
  setSelected,
  markers,
  mapId,
}: RoccoMapProps) => {
  const mapsLoadingState = useApiLoadingStatus();
  const { hoveredPlaceId } = useMapInteraction();
  const [selectedMarker, setSelectedMarker] = useState<PlaceLocation | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Get mapId from prop, env variable, or use default
  const effectiveMapId = useMemo(
    () => mapId || import.meta.env.VITE_GOOGLE_MAP_ID || 'DEMO_MAP_ID',
    [mapId],
  );

  // Calculate initial center: use provided center, or first marker, or current location, or default
  const initialCenter = useMemo(() => {
    if (center) {
      return center;
    }
    if (markers.length > 0) {
      return markers[0] as PlaceLocation;
    }
    if (currentLocation) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      } as PlaceLocation;
    }
    return DEFAULT_CENTER;
  }, [center, markers, currentLocation]);

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: initialCenter.latitude,
    lng: initialCenter.longitude,
  });
  const [mapZoom, setMapZoom] = useState(zoom);
  const markerCount = markers.length;

  // Memoize marker click handler factory to avoid recreating functions
  const handleMarkerClick = useCallback((marker: PlaceLocation) => {
    setHasUserInteracted(true);
    setSelectedMarker(marker);
  }, []);

  const onClick = useCallback(
    (event: MapMouseEvent) => {
      const { placeId } = event.detail;

      // Mark that user has interacted with the map
      setHasUserInteracted(true);

      // Remove currently selected marker
      setSelected?.(null);
      setSelectedMarker(null);

      // Hide info window
      if (placeId) {
        if (event?.stop) {
          event.stop();
        }
      }

      onMapClick?.(event);
    },
    [onMapClick, setSelected],
  );

  // Update center/zoom on user interaction
  const handleMapIdle = useCallback(
    (event: MapEvent<unknown>) => {
      const trace = startTrace('rocco-map-idle', {
        mapId: effectiveMapId,
        markerCount,
      });

      const map = event.map;
      if (!map) {
        endTrace(trace);
        return;
      }

      // Mark that user has interacted with the map
      setHasUserInteracted(true);

      const newCenter = map.getCenter();
      const newZoom = map.getZoom();
      if (newCenter && newZoom) {
        setMapCenter({
          lat: newCenter.lat(),
          lng: newCenter.lng(),
        });
        setMapZoom(newZoom);
      }

      endTrace(trace, { zoom: newZoom });
    },
    [effectiveMapId, markerCount],
  );

  const renderedMarkers = useMemo(
    () =>
      markers.map((marker, index) => {
        const isHovered = hoveredPlaceId && marker.id === hoveredPlaceId;
        const isSelected = selectedMarker?.id === marker.id;

        return (
          <MapMarker
            key={marker.id || `${marker.latitude}-${marker.longitude}-${index}`}
            marker={marker}
            isHovered={!!isHovered}
            isSelected={!!isSelected}
            onClick={() => handleMarkerClick(marker)}
          />
        );
      }),
    [markers, hoveredPlaceId, selectedMarker?.id, handleMarkerClick],
  );

  if (mapsLoadingState === 'FAILED') {
    return <Alert type="error">The Maps Library could not be loaded.</Alert>;
  }

  if (mapsLoadingState === 'LOADING') {
    return (
      <div className="flex items-center justify-center max-w-[300px] mx-auto min-h-full">
        <Loading size="xl" />
      </div>
    );
  }

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_API_KEY} libraries={['marker']}>
      <div
        data-testid="rocco-map"
        data-zoom={mapZoom}
        data-center={JSON.stringify(mapCenter)}
        className="flex flex-1 relative overflow-hidden size-full"
      >
        {isLoadingCurrentLocation ? (
          <div className="absolute left-0 right-0 mt-2 mx-auto max-w-fit z-10 p-1 px-4 border-primary bg-accent text-foreground text-sm">
            <span className="inline-flex size-1 bg-primary  mb-0.5 mr-3 void-anim-breezy-loop" />
            Loading current location
          </div>
        ) : null}
        <GoogleMap
          mapId={effectiveMapId}
          defaultZoom={zoom}
          defaultCenter={{ lat: initialCenter.latitude, lng: initialCenter.longitude }}
          onClick={onClick}
          onIdle={handleMapIdle}
          className={cn('flex size-full', styles.map)}
        >
          <MapUpdater
            center={{ lat: initialCenter.latitude, lng: initialCenter.longitude }}
            markers={markers}
            zoom={zoom}
            enabled={!hasUserInteracted}
          />
          {/* Current location blue dot - appears when location is loaded */}
          {currentLocation && !isLoadingCurrentLocation && (
            <AdvancedMarker
              position={{ lat: currentLocation.latitude, lng: currentLocation.longitude }}
              title="Your Location"
              collisionBehavior="REQUIRED"
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#4285F4',
                  border: '2px solid white',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                }}
              />
            </AdvancedMarker>
          )}
          {renderedMarkers}
          {selectedMarker && (
            <InfoWindow
              position={{
                lat: selectedMarker.latitude,
                lng: selectedMarker.longitude,
              }}
              onCloseClick={() => setSelectedMarker(null)}
              headerContent={
                <div className="font-semibold text-sm pr-4">{selectedMarker.name || 'Place'}</div>
              }
            >
              <div className="flex flex-col gap-2 max-w-[200px]">
                {selectedMarker.id && (
                  <a
                    href={`/places/${selectedMarker.id}`}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    View Details
                  </a>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </APIProvider>
  );
};

export default RoccoMap;
