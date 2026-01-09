# Google Places Integration Notes

## Current Call Sites

| File | Purpose | Endpoint | Field Mask / Params | Env Source | Notes |
| --- | --- | --- | --- | --- | --- |
| `apps/rocco/app/lib/trpc/routers/places.ts` | `getDetails` fallback when DB lacks data | Shared helper (`getPlaceDetails`) | Helper default (`places.displayName, ... , places.photos`) | `process.env.GOOGLE_API_KEY` | Fetches via central helper before writing to DB. |
| `apps/rocco/app/lib/trpc/routers/places.ts` | `search` resolver | Shared helper (`searchPlaces`) | Helper default (`places.id, ...`) | `process.env.GOOGLE_API_KEY` | Results cached per query + circle. |
| `apps/rocco/app/hooks/useGooglePlacesAutocomplete.ts` | Client-side autocomplete | Calls `trpc.places.autocomplete` | N/A (server handles field mask) | No client key usage | Uses tRPC cache + shared helper. |
| `apps/rocco/app/lib/fetchPlacePhotos.server.ts` | Server helper wrapper for photos | Delegates to shared helper | N/A (relies on helper defaults) | Server env `GOOGLE_API_KEY` | Provides consistent return shape for future server consumers. |
| `apps/rocco/scripts/update-place-photos.ts` | Maintenance script to backfill photos | Uses shared helper (`getPlacePhotos`) | Helper default (`places.photos`) | `process.env.GOOGLE_API_KEY` | No direct HTTP layer or duplicated logic. |
| `apps/rocco/app/components/places/PlacePhotos.tsx` | Transform stored photo refs into media URL | `GET https://places.googleapis.com/v1/{photoRef}/media` | `maxWidthPx`, `maxHeightPx`, `key` query params | `env.VITE_GOOGLE_API_KEY` | Requires the key to request public media blobs. |
| `apps/rocco/app/components/map.tsx` | `<APIProvider>` for Maps JS SDK | Google Maps JS SDK | `apiKey` prop | `import.meta.env.VITE_GOOGLE_API_KEY` | Requires a browser-safe key (can be HTTP-referrer restricted). |

## Environment Alignment

1. Introduce server-only `GOOGLE_API_KEY` (already used in other packages) and have every server call (tRPC loaders, scripts) read exclusively from this variable.
2. Replace browser fetchers with server-side proxies/tRPC procedures so the raw key is never shipped to clients. The only remaining browser usage should be the restricted Maps JS SDK key.
3. For components that still need to build Google media URLs (`PlacePhotos`), return fully qualified URLs from the server helper (already signed with `GOOGLE_API_KEY`) so the UI no longer needs the key.

These notes gate the subsequent refactor: the shared helper must support both `/places:searchText` results and `/places/{id}` details with controllable field masks, plus a photo-media helper that generates signed URLs without leaking the API key.

## Image proxy (single canonical route)

- Image proxying for Google Places media is served by the Rocco server at `GET /api/images`. The proxy supports either a v1 Places resource (`resource=places/{place}/photos/{photo}`) or a legacy Maps `photo_reference` (`photoreference=AZLa...`) and forwards the request using the server-side `GOOGLE_API_KEY`.
- The former tRPC procedure `trpc.images.getPlacePhoto` has been **deprecated** in favor of the HTTP proxy — using the HTTP route is faster (returns raw bytes suitable for `<img src="...">`) and avoids the JSON+base64 roundtrip.
- The old `/api/images/place-photo` endpoint on the central API server has been removed; consumers should call the Rocco proxy route (`/api/images`).

Deployment note: ensure `GOOGLE_API_KEY` is set for the Rocco server (server-only key). Browser-only `VITE_GOOGLE_API_KEY` continues to be used only for the Maps JS SDK in the client where required.

## Shared Helper API

- `searchPlaces(options)` & `getPlaceDetails(options)` live in `apps/rocco/app/lib/google-places.server.ts`. Both functions:
  - Accept optional `forceFresh` flags to bypass the in-memory cache (default TTL 5 minutes).
  - Retry on `429`/`5xx` responses with exponential back-off logging the offending path.
- `getPlacePhotos(options)` is a thin wrapper around `getPlaceDetails` that extracts the canonical `photo.name` references.
- `buildPhotoMediaUrl({ photoName, maxWidthPx, maxHeightPx })` builds a signed Places media URL. The helper appends the API key so callers outside the UI can fetch blobs directly.

## Client Usage

- `trpc.places.autocomplete` now proxies autocomplete queries through the helper and returns `GooglePlacePrediction[]`, keeping the browser unaware of the key.
- `useGooglePlacesAutocomplete` delegates entirely to that procedure, exposing the same React Query signature without running `fetch` in the browser.
- `PlacePhotos` and the Google Maps `<APIProvider>` still require the scoped `VITE_GOOGLE_API_KEY` for now; these are the only browser consumers and should use referrer/IP restricted keys.

