// Deprecated: map-layout hooks removed during refactor.
// These functions are intentionally no-ops to prevent runtime errors.
export function usePlaceData() {
  return null
}
export function useListData() {
  return { data: null, isLoading: false }
}
export function useMapCenter() {
  return { latitude: 0, longitude: 0 }
}
export function useMapMarkers() {
  return []
}
