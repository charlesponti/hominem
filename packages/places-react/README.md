# @hominem/places-react

React components and hooks for places and maps.

## Exports

### Components
- `Places.Detail.*` - Place detail components (address, phone, rating, photos, map)
- `Places.List.*` - Places list components (list, nearby, autocomplete)
- `Places.Visits.*` - Visit tracking components (log visit, visit history)
- `Places.Map.*` - Map components
- `Places.Utilities.*` - Utility components (add to list, place types)

### Hooks
- `usePlaces` - Places data fetching
- `usePeople` - People data fetching
- `useGeolocation` - GPS location tracking
- `useGooglePlacesAutocomplete` - Google Places autocomplete

## Dependencies

- `@hominem/ui` - UI primitives
- `@hominem/places-services` - Backend services
- `@hominem/hono-client` - API client
- `@hominem/hono-rpc` - RPC types
- `@tanstack/react-query` - Data fetching
- `@vis.gl/react-google-maps` - Google Maps integration
