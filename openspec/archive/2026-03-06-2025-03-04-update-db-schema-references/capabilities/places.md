# Places Capability Modernization

## Testing Standard (Locked)
- Every "Required RED tests" item in this file is a DB-backed integration slice test by default.
- Tests must execute real service/query paths against the test DB and assert both flow outcome and guard invariants.
- Unit tests are allowed only for isolated pure logic and must not replace capability integration coverage.

## PLACES-01 Place Upsert/Get/Delete
### Capability ID and entry points
- ID: `PLACES-01`
- Entry points:
  - `packages/places/src/places.service.ts`
  - `packages/hono-rpc/src/routes/places.ts`

### Current inputs/outputs + guards
- Inputs: place payloads (`PlaceInput`), ids.
- Outputs: place records.
- Guards: auth in route; ownership and list scope checks vary.

### Current failure modes
- Upsert behavior spread across helper functions.
- Inconsistent identity strategy between internal id and Google Maps id.

### Modernization review
- Selected modern contract: unified `PlaceIdentity` (`id|googleMapsId`) with strict upsert semantics.

### Final target contract
- `upsertPlace(userId, payload): Place`
- `getPlace(userId, placeRef): Place | null`
- `deletePlace(userId, placeId): boolean`

### Required RED tests
- Upsert by Google ID is idempotent.
- Cross-tenant read/delete blocked.
- Invalid place identity rejected.

### Required GREEN tasks
- Consolidate identity resolution.
- Refactor route handlers to unified command/query calls.

### Legacy files/imports to delete
- Duplicate identity resolution branches in `places.service.ts`.

### Execution status
- `PLACES-01` cut over to schema-accurate place storage on `places` table with metadata in `data` JSON:
  - owner-scoped idempotent upsert by `googleMapsId`
  - strict `getPlaceById` and `getPlaceByGoogleMapsId` projections
  - deterministic delete behavior with cache invalidation.
- DB-backed integration suite is green in `packages/places/src/places.service.test.ts`.
- no-shim close-out complete for this capability: no legacy place schema/type imports or adapter paths remain.

## PLACES-02 Place Photos Pipeline
### Capability ID and entry points
- ID: `PLACES-02`
- Entry points:
  - `packages/places/src/place-images.service.ts`
  - `packages/places/src/places.service.ts`

### Current inputs/outputs + guards
- Inputs: photo URLs/references and place ids.
- Outputs: persisted image URLs/thumbs.
- Guards: weak consistency guarantees when partial upload failures occur.

### Current failure modes
- Partial success can leave inconsistent photo sets.
- File naming/storage path policy not fully centralized.

### Modernization review
- Selected modern contract: atomic-ish photo update envelope with explicit partial-failure reporting.

### Final target contract
- `savePlacePhoto(command) -> { fullUrl, thumbUrl, warnings[] }`
- `updatePlacePhotos(placeId, photos)` uses merge/replace strategy with deterministic order.

### Required RED tests
- Thumbnail failure path returns warning but preserves primary image.
- Invalid host/reference rejected.
- Duplicate photo dedupe preserved.

### Required GREEN tasks
- Centralize filename/storage policy.
- Normalize photo update merge semantics.

### Legacy files/imports to delete
- Ad hoc photo URL normalization branches.

### Execution status
- `PLACES-02` image pipeline contracts remain active:
  - photo URL normalization + processing in `processPlacePhotos`
  - `updatePlacePhotosFromGoogle` now uses explicit options guard and deterministic update/no-op behavior.
- deterministic filename contract is now strict (`googleMapsId-index-size`) with no legacy fallback path.

## PLACES-03 Google Places Search/Details/Cache
### Capability ID and entry points
- ID: `PLACES-03`
- Entry points:
  - `packages/places/src/google-places.service.ts`
  - `packages/places/src/place-cache.ts`
  - `packages/hono-rpc/src/routes/places.ts` (autocomplete/details routes)

### Current inputs/outputs + guards
- Inputs: text query, place id, optional location bias.
- Outputs: normalized Google place payloads.
- Guards: cache behavior partially coupled to API calls.

### Current failure modes
- Potential cache stampede/concurrency edge cases.
- API fallback behavior not fully standardized.

### Modernization review
- Selected modern contract: cache-aside service with keyed in-flight dedupe and stale-if-error policy.

### Final target contract
- `search(query, options)` and `getDetails(placeId, options)` with standardized metadata:
  - `{ source: 'cache'|'api', ttlSeconds, data }`

### Required RED tests
- Concurrent identical requests dedupe to one provider call.
- Cache read failure falls back to API.
- Force-fresh bypasses cache.

### Required GREEN tasks
- Implement shared cache key and in-flight registry.
- Standardize provider response mapping.

### Legacy files/imports to delete
- Direct route-level cache/provider branching.

### Execution status
- `PLACES-03` cache-aside google service remained green; existing tests stayed green:
  - `packages/places/src/google-places.service.test.ts` passing.
- no route-level cache/provider branching reintroduced; service boundary remains the single cache-aside entry.

## PLACES-04 Lists, Nearby, And Visit Flows
### Capability ID and entry points
- ID: `PLACES-04`
- Entry points:
  - `packages/places/src/places.service.ts`
  - `packages/hono-rpc/src/routes/places.ts`

### Current inputs/outputs + guards
- Inputs: list ids, geospatial filters, visit payloads.
- Outputs: linked place lists, nearby result sets, visit records/stats.
- Guards: mixed checks between list and place services.

### Current failure modes
- Nearby query and visit stats can be expensive and inconsistent.
- Guard logic not centralized by operation type.

### Modernization review
- Selected modern contract: split `PlaceListService` and `PlaceVisitService` with explicit query DTOs.

### Final target contract
- `addPlaceToLists`, `removePlaceFromList`, `getNearbyPlaces`, `logVisit`, `updateVisit`, `deleteVisit`, `getVisitStats`
- Deterministic pagination/sort for nearby and visits.

### Required RED tests
- Cross-tenant list mutation rejected.
- Visit CRUD ownership enforced.
- Nearby results deterministic for same filter set.

### Required GREEN tasks
- Extract list and visit subservices.
- Define explicit DTOs for nearby and stats queries.

### Legacy files/imports to delete
- Combined list/visit/nearby branches in single service methods.

### Execution status
- `PLACES-04` place-list coupling was hard-cut to no-shim behavior for current schema reality:
  - `addPlaceToLists` returns deterministic success and upserted place
  - `removePlaceFromList` is explicit no-op (`null`) pending dedicated list-membership table
  - `getNearbyPlacesFromLists` now runs deterministic owner-scoped geospatial approximation with stable sort.
- Visit read/stats paths in `events` were decoupled from removed place-join schema imports to keep typed route surface stable.
- module gates remain green after close-out changes:
  - `bun run --filter @hominem/places-services test`
  - `bun run --filter @hominem/places-services typecheck`
  - `bun run --filter @hominem/places-services lint`

## PLACES-05 Trips Integration
### Capability ID and entry points
- ID: `PLACES-05`
- Entry points:
  - `packages/places/src/trips.service.ts`

### Current inputs/outputs + guards
- Inputs: trip and trip-item payloads.
- Outputs: trips and trip item records.
- Guards: validation exists but ownership guard coverage is uneven.

### Current failure modes
- Item-trip linking behavior can mismatch list/place relations.
- Ownership checks insufficiently centralized.

### Modernization review
- Selected modern contract: trip command/query services with explicit membership and owner checks.

### Final target contract
- `createTrip`, `listTrips`, `getTrip`, `addTripItem` with ownership-first policy.

### Required RED tests
- Unauthorized trip/item access denied.
- Duplicate trip-item linking idempotent or conflict by contract.

### Required GREEN tasks
- Add ownership enforcement to all trip operations.
- Normalize trip output DTOs to consistent shape.

### Legacy files/imports to delete
- Any direct db query branches bypassing trip service guard policy.

### Execution status
- `PLACES-05` trip service is now mapped to `travel_trips` schema reality:
  - create/list/get are owner-scoped against `travel_trips`
  - item membership is stored in trip `data.items` with idempotent add semantics in absence of a dedicated `trip_items` table.
- no direct `@hominem/db/schema/places|travel` or `@hominem/db/types/places|travel` imports remain outside `packages/db`.
