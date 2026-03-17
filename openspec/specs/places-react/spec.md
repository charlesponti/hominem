## ADDED Requirements

### Requirement: Package Structure
The places-react package SHALL provide a well-organized directory structure for places and maps React components and hooks.

#### Scenario: Import structure
- **WHEN** a consumer imports from `@hominem/places-react`
- **THEN** they SHALL be able to import individual components: `import { PlacesList } from '@hominem/places-react'`
- **AND** they SHALL be able to import via namespaces: `import { Places } from '@hominem/places-react'` and use `Places.List`

### Requirement: Component Exports
The places-react package SHALL export all places and maps components that were previously in apps/rocco.

#### Scenario: Place detail components export
- **WHEN** importing place detail components
- **THEN** the following SHALL be available: PlaceAddress, PlacePhone, PlaceWebsite, PlaceRating, PlaceStatus, PlacePhotos, PlacePhotoLightbox, PlaceLists, PlaceMap, PlaceRow

#### Scenario: Places list components export
- **WHEN** importing places list components
- **THEN** the following SHALL be available: PlacesList, PlacesNearby, PlacesAutocomplete, PlaceRow, PlaceListItemActions

#### Scenario: Visit and log components export
- **WHEN** importing visit-related components
- **THEN** the following SHALL be available: LogVisit, VisitHistory, PeopleMultiSelect

#### Scenario: Maps components export
- **WHEN** importing map components
- **THEN** the following SHALL be available: Map, MapLazy (lazy-loaded variant)

#### Scenario: Place utilities export
- **WHEN** importing place utility components
- **THEN** the following SHALL be available: AddToListControl, AddToListDrawerContent, PlaceTypes

### Requirement: Hooks Exports
The places-react package SHALL export all places domain hooks for data fetching, location, and autocomplete.

#### Scenario: Places data hooks
- **WHEN** importing places data hooks
- **THEN** the following SHALL be available: usePlaces, usePeople

#### Scenario: Location hooks
- **WHEN** importing location-based hooks
- **THEN** the following SHALL be available: useGeolocation (GPS location tracking)

#### Scenario: Autocomplete hooks
- **WHEN** importing autocomplete hooks
- **THEN** the following SHALL be available: useGooglePlacesAutocomplete (Google Places API integration)

### Requirement: Dependencies
The places-react package SHALL declare appropriate peer and dev dependencies.

#### Scenario: Peer dependencies
- **WHEN** installing the package
- **THEN** it SHALL declare React, React DOM, and React Query as peer dependencies
- **AND** it SHALL depend on `@hominem/ui`, `@hominem/places-services`, `@hominem/hono-client`, and `@hominem/hono-rpc`
- **AND** it SHALL depend on `@vis.gl/react-google-maps` for Google Maps integration

### Requirement: Type Safety
The places-react package SHALL maintain full TypeScript type safety.

#### Scenario: Type exports
- **WHEN** using the package
- **THEN** all component props, hook parameters, and return types SHALL be properly typed and exported
- **AND** Google Places API types SHALL be properly integrated
- **AND** no `any` types SHALL be used

### Requirement: Build Configuration
The places-react package SHALL be buildable and publishable.

#### Scenario: Build output
- **WHEN** running the build command
- **THEN** it SHALL generate CommonJS and ESM outputs
- **AND** it SHALL generate TypeScript declaration files
- **AND** the package SHALL be usable in both CJS and ESM consuming applications
