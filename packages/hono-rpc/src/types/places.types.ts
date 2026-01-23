import type { Place } from '@hominem/db/schema';

/**
 * Explicit Type Contracts for Places API
 *
 * Performance Benefit: These explicit types are resolved INSTANTLY by TypeScript.
 * No complex inference, no router composition, no type instantiation explosion.
 */

/**
 * Utility type to convert Date fields to strings for JSON serialization
 * This matches the reality of HTTP responses where dates are ISO strings
 */
type JsonSerialized<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Array<JsonSerialized<U>>
    : T extends object
      ? { [K in keyof T]: JsonSerialized<T[K]> }
      : T;

// ============================================================================
// Place Create
// ============================================================================

export interface PlaceCreateInput {
  name: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  googleMapsId: string;
  rating?: number;
  types?: string[];
  websiteUri?: string;
  phoneNumber?: string;
  photos?: string[];
  listIds?: string[];
}

export type PlaceCreateOutput = JsonSerialized<Place>;

// ============================================================================
// Place Update
// ============================================================================

export interface PlaceUpdateInput {
  id: string;
  name?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  rating?: number;
  types?: string[];
  websiteUri?: string;
  phoneNumber?: string;
  photos?: string[];
}

export type PlaceUpdateOutput = JsonSerialized<Place>;

// ============================================================================
// Place Delete
// ============================================================================

export interface PlaceDeleteInput {
  id: string;
}

export interface PlaceDeleteOutput {
  success: boolean;
}

// ============================================================================
// Place Autocomplete
// ============================================================================

export interface PlaceAutocompleteInput {
  query: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export interface PlacePrediction {
  id: string;
  description: string;
  name: string;
  address?: string;
  types?: string[];
  distance?: number;
}

export type PlaceAutocompleteOutput = PlacePrediction[];

// ============================================================================
// Place GetDetailsById
// ============================================================================

export interface PlaceGetDetailsByIdInput {
  id: string;
}

// Enriched place with additional Google data
export interface EnrichedPlace extends JsonSerialized<Place> {
  // May include additional fetched Google data
  displayPhotos?: string[];
  [key: string]: unknown;
}

export type PlaceGetDetailsByIdOutput = EnrichedPlace;

// ============================================================================
// Place GetDetailsByGoogleId
// ============================================================================

export interface PlaceGetDetailsByGoogleIdInput {
  googleMapsId: string;
}

export type PlaceGetDetailsByGoogleIdOutput = EnrichedPlace | null;

// ============================================================================
// Place AddToLists
// ============================================================================

export interface PlaceAddToListsInput {
  placeId: string;
  listIds: string[];
}

export interface PlaceAddToListsOutput {
  success: boolean;
  addedToLists: number;
}

// ============================================================================
// Place RemoveFromList
// ============================================================================

export interface PlaceRemoveFromListInput {
  placeId: string;
  listId: string;
}

export interface PlaceRemoveFromListOutput {
  success: boolean;
}

// ============================================================================
// Place GetNearbyFromLists
// ============================================================================

export interface PlaceGetNearbyFromListsInput {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  limit?: number;
}

export interface NearbyPlace {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsId: string;
  types: string[] | null;
  imageUrl: string | null;
  rating: number | null;
  photos: string[] | null;
  websiteUri: string | null;
  phoneNumber: string | null;
  priceLevel: number | null;
  distance: number;
  lists: Array<{ id: string; name: string }>;
}

export type PlaceGetNearbyFromListsOutput = NearbyPlace[];

// ============================================================================
// Visit Types (Events)
// ============================================================================

export interface Visit {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  placeId: string | null;
  visitNotes?: string | null;
  visitRating?: number | null;
  visitReview?: string | null;
  tags?: string[] | null;
  people?: string[] | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Place LogVisit
// ============================================================================

export interface PlaceLogVisitInput {
  placeId: string;
  title: string;
  description?: string;
  date?: string | Date;
  visitNotes?: string;
  visitRating?: number; // 1-5
  visitReview?: string;
  tags?: string[];
  people?: string[];
}

export type PlaceLogVisitOutput = Visit;

// ============================================================================
// Place GetMyVisits
// ============================================================================

export interface PlaceGetMyVisitsInput {
  limit?: number;
  offset?: number;
}

export type PlaceGetMyVisitsOutput = Visit[];

// ============================================================================
// Place GetPlaceVisits
// ============================================================================

export interface PlaceGetPlaceVisitsInput {
  placeId: string;
}

export type PlaceGetPlaceVisitsOutput = Visit[];

// ============================================================================
// Place UpdateVisit
// ============================================================================

export interface PlaceUpdateVisitInput {
  id: string;
  title?: string;
  description?: string;
  date?: string | Date;
  visitNotes?: string;
  visitRating?: number;
  visitReview?: string;
  tags?: string[];
  people?: string[];
}

export type PlaceUpdateVisitOutput = Visit;

// ============================================================================
// Place DeleteVisit
// ============================================================================

export interface PlaceDeleteVisitInput {
  id: string;
}

export interface PlaceDeleteVisitOutput {
  success: boolean;
}

// ============================================================================
// Place GetVisitStats
// ============================================================================

export interface PlaceGetVisitStatsInput {
  placeId: string;
}

export interface PlaceVisitStats {
  totalVisits: number;
  averageRating?: number;
  lastVisit?: string;
  firstVisit?: string;
  tags: { tag: string; count: number }[];
  people: { person: string; count: number }[];
}

export type PlaceGetVisitStatsOutput = PlaceVisitStats;
